from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from auth import create_access_token, hash_password, verify_password
from database import get_db
from models import User
from rate_limit import rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterAdminIn(BaseModel):
    """One-time endpoint to bootstrap the first admin — disable in production after use."""
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=8)
    bootstrap_secret: str  # must match settings.SECRET_KEY to prevent abuse


@router.post(
    "/login",
    response_model=TokenOut,
    # Brute-force protection: max 5 login attempts per IP per minute
    dependencies=[Depends(rate_limit("login", limit=5, window=60))],
)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form.username, User.is_active == True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username, "admin": user.is_admin})
    return TokenOut(access_token=token)


@router.post("/bootstrap", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(payload: RegisterAdminIn, db: Session = Depends(get_db)):
    """
    Creates the first admin user. Protected by bootstrap_secret == SECRET_KEY.
    Remove or disable this endpoint once the admin account is created.
    """
    from config import settings
    if payload.bootstrap_secret != settings.SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Secreto incorrecto")

    # Bootstrap is a one-time operation: once any admin exists, refuse.
    # This prevents creating new admins via a leaked SECRET_KEY.
    if db.query(User).filter(User.is_admin == True).first():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El bootstrap ya fue utilizado. Crea nuevos admins desde el panel.",
        )

    existing = db.query(User).filter(
        (User.username == payload.username) | (User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El usuario ya existe")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_admin=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.username, "admin": True})
    return TokenOut(access_token=token)
