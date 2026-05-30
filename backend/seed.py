"""
Local development seed script.
Run once after cloning or after resetting the local SQLite database:

    cd backend
    python seed.py

Creates all tables and populates them with sample data for every admin section.
Idempotent — safe to run multiple times (skips records that already exist).
"""
import sys
from datetime import date, time, timedelta

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from auth import hash_password
from database import SessionLocal, engine
from models import (
    Base,
    BloqueDisponibilidad,
    Cita,
    EstadoCita,
    GaleriaPost,
    Opinion,
    Paciente,
    Promocion,
    Servicio,
    User,
)

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin1234"
ADMIN_EMAIL    = "admin@libelula.cl"


def _seed_admin(db) -> User:
    user = db.query(User).filter(User.username == ADMIN_USERNAME).first()
    if not user:
        user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            is_admin=True,
            is_active=True,
        )
        db.add(user)
        db.flush()
        print("  + Admin user created")
    else:
        print("  . Admin user already exists -- skipping")
    return user


def _seed_servicios(db) -> list[Servicio]:
    items = [
        # (nombre, descripcion, duracion_min, precio_clp, icono, icono_color)
        ("Podología",          "Diagnóstico y tratamiento integral del pie, uñas y piel. Cuidado profesional para tu bienestar y movilidad.",       45, 25000, "podologia",   "rosa_empolvado"),
        ("Reiki",              "Técnica de equilibrio energético que promueve la relajación profunda y la sanación natural del cuerpo y la mente.", 60, 20000, "reiki",        "verde_salvia"),
        ("Reflexología",       "Masaje terapéutico en puntos reflejos del pie que conectan con órganos y sistemas de todo el cuerpo.",              60, 20000, "reflexologia", "verde_salvia"),
        ("Esencias Florales",  "Terapia floral de Bach para equilibrar estados emocionales y acompañar procesos de cambio interior.",               45, 18000, "aromaterapia", "verde_salvia"),
        ("Auriculoterapia",    "Estimulación de puntos del pabellón auricular para tratar diversas condiciones de salud de forma natural.",         45, 18000, "ayuda",        "dorado_mostaza"),
        ("Masajes Linfáticos", "Técnica suave que activa el sistema linfático, reduce la retención de líquidos y refuerza las defensas.",           60, 22000, "masaje",       "verde_salvia"),
        ("Tuina",              "Masaje terapéutico de la medicina tradicional china sobre meridianos y puntos de acupresión del cuerpo.",           60, 22000, "herramientas", "dorado_mostaza"),
    ]

    result = []
    for nombre, desc, dur, precio, icono, icono_color in items:
        s = db.query(Servicio).filter(Servicio.nombre == nombre).first()
        if not s:
            s = Servicio(nombre=nombre, descripcion=desc, duracion=dur, precio=precio, icono=icono, icono_color=icono_color)
            db.add(s)
            db.flush()
            print(f"  + Servicio '{nombre}'")
        else:
            changed = False
            if s.icono != icono:
                s.icono = icono
                changed = True
            if s.icono_color != icono_color:
                s.icono_color = icono_color
                changed = True
            if changed:
                print(f"  ~ Servicio '{nombre}' actualizado")
            else:
                print(f"  . Servicio '{nombre}' already exists")
        result.append(s)
    return result

def _seed_pacientes_y_citas(db, servicios: list[Servicio]):
    today = date.today()
    records = [
        ("Ana López",    "ana.lopez@example.com",    "+56912345678", servicios[0], today + timedelta(days=3),  time(10, 0), EstadoCita.CONFIRMADA),
        ("Carlos Ruiz",  "carlos.ruiz@example.com",  "+56987654321", servicios[1], today - timedelta(days=7),  time(15, 30), EstadoCita.COMPLETADA),
    ]
    for nombre, email, tel, servicio, fecha, hora, estado in records:
        p = db.query(Paciente).filter(Paciente.email == email).first()
        if not p:
            p = Paciente(nombre=nombre, email=email, telefono=tel)
            db.add(p)
            db.flush()
            print(f"  + Paciente '{nombre}'")
        else:
            print(f"  . Paciente '{nombre}' already exists")

        cita = db.query(Cita).filter(Cita.paciente_id == p.id, Cita.fecha == fecha).first()
        if not cita:
            cita = Cita(
                paciente_id=p.id,
                servicio_id=servicio.id,
                fecha=fecha,
                hora=hora,
                duracion=servicio.duracion,
                estado=estado,
                precio_final=servicio.precio,
            )
            db.add(cita)
            db.flush()
            print(f"    + Cita para '{nombre}' el {fecha}")
        else:
            print(f"    . Cita para '{nombre}' el {fecha} already exists")


def _seed_opiniones(db):
    items = [
        ("María", "González", "Excelente atención, muy profesional. 100% recomendado.", 5.0),
        ("Pedro", "Martínez", "Me sentí muy cómodo. El tratamiento fue efectivo.", 4.5),
    ]
    for nombre, apellido, texto, punt in items:
        existing = db.query(Opinion).filter(
            Opinion.nombre == nombre, Opinion.apellido == apellido
        ).first()
        if not existing:
            db.add(Opinion(nombre=nombre, apellido=apellido, texto=texto, puntuacion=punt))
            db.flush()
            print(f"  + Opinion de '{nombre} {apellido}'")
        else:
            print(f"  . Opinion de '{nombre} {apellido}' already exists")


def _seed_galeria(db):
    posts = [
        ("Antes y después — tratamiento de hongos", "Resultado después de 3 sesiones.",
         "https://res.cloudinary.com/demo/image/upload/sample.jpg", "image"),
        ("Reflexología podal", "Técnica especializada para alivio de estrés.",
         "https://res.cloudinary.com/demo/image/upload/sample2.jpg", "image"),
    ]
    for titulo, desc, url, mtype in posts:
        existing = db.query(GaleriaPost).filter(GaleriaPost.titulo == titulo).first()
        if not existing:
            db.add(GaleriaPost(titulo=titulo, descripcion=desc, media_url=url, media_type=mtype, published=False))
            db.flush()
            print(f"  + GaleriaPost '{titulo}'")
        else:
            print(f"  . GaleriaPost '{titulo}' already exists")


def _seed_promocion(db, servicios: list[Servicio]):
    today = date.today()
    existing = db.query(Promocion).filter(Promocion.servicio_id == servicios[0].id).first()
    if not existing:
        db.add(Promocion(
            servicio_id=servicios[0].id,
            porcentaje_descuento=20,
            descripcion="Descuento de bienvenida — 20% off en Podología General",
            fecha_inicio=today,
            fecha_fin=today + timedelta(days=30),
            activo=True,
        ))
        db.flush()
        print("  + Promoción (20% off Podología General)")
    else:
        print("  . Promocion already exists")


def _seed_disponibilidad(db):
    blocks = [
        (0, time(9, 0),  time(13, 0)),   # Monday  09:00–13:00
        (1, time(9, 0),  time(13, 0)),   # Tuesday 09:00–13:00
        (2, time(9, 0),  time(13, 0)),   # Wednesday 09:00–13:00
        (3, time(9, 0),  time(13, 0)),   # Thursday 09:00–13:00
        (4, time(9, 0),  time(13, 0)),   # Friday 09:00–13:00
    ]

    for dia, inicio, fin in blocks:
        existing = db.query(BloqueDisponibilidad).filter(
            BloqueDisponibilidad.dia_semana == dia,
            BloqueDisponibilidad.hora_inicio == inicio,
        ).first()
        if not existing:
            db.add(BloqueDisponibilidad(dia_semana=dia, hora_inicio=inicio, hora_fin=fin, activo=True))
            db.flush()
            print(f"  + BloqueDisponibilidad dia={dia} {inicio}-{fin}")
        else:
            print(f"  . BloqueDisponibilidad dia={dia} {inicio} already exists")


def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.\n")

    print("Seeding data...")
    db = SessionLocal()
    try:
        print("\n[Admin user]")
        _seed_admin(db)

        print("\n[Servicios]")
        servicios = _seed_servicios(db)

        print("\n[Pacientes + Citas]")
        _seed_pacientes_y_citas(db, servicios)

        print("\n[Opiniones]")
        _seed_opiniones(db)

        print("\n[Galería]")
        _seed_galeria(db)

        print("\n[Promociones]")
        _seed_promocion(db, servicios)

        print("\n[Disponibilidad]")
        _seed_disponibilidad(db)

        db.commit()
        print("\nAll done!\n")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("-" * 40)
    print("Admin credentials:")
    print(f"  URL:      http://localhost:4200/admin/login")
    print(f"  Username: {ADMIN_USERNAME}")
    print(f"  Password: {ADMIN_PASSWORD}")
    print("-" * 40)

if __name__ == "__main__":
    main()
