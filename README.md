# Libélula Podología y Terapias

A complete web platform for a podiatry and therapy clinic — customers can browse services, check availability and book appointments online, while the business owner manages everything through a private admin dashboard.

**Live site:** [terapiaslibelula.cl](https://terapiaslibelula.cl)

---

## What does this app do?

### For customers
- Browse services and prices
- Check real-time availability and book appointments online
- Receive automatic WhatsApp and email confirmations
- Leave star ratings and testimonials
- View the photo/video gallery

### For the clinic owner (admin)
- Manage services and pricing
- Set working hours, block vacation days, and control availability
- View, confirm, or cancel appointments
- Create promotional discounts
- Upload photos and videos to the gallery — with one click to post them to Facebook and Instagram
- Let AI generate social media captions automatically
- Appointments sync automatically to Google Calendar
- Send WhatsApp notifications to patients

---

## Tech stack (quick summary)

| Layer | Technology |
|-------|------------|
| Frontend | Angular 21, Angular Material, SCSS |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| Media storage | Cloudinary |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Running it locally

> No programming experience required — just follow each step carefully.

### Step 1 — Install the required tools

You need three programs installed on your computer:

1. **Node.js** (version 20 or later) → [nodejs.org/en/download](https://nodejs.org/en/download)
   - After installing, open a terminal and run `node --version` — you should see a number starting with `v20` or higher.

2. **Python** (version 3.11 or later) → [python.org/downloads](https://www.python.org/downloads)
   - After installing, run `python --version` in a terminal.
   - On Windows, make sure to tick **"Add Python to PATH"** during installation.

3. **Git** → [git-scm.com/downloads](https://git-scm.com/downloads)
   - After installing, run `git --version` to confirm.

> **What is a terminal?**
> On Windows: press `Win + R`, type `cmd`, and press Enter.
> On Mac: press `Cmd + Space`, type `Terminal`, and press Enter.

---

### Step 2 — Download the project

Open your terminal and run:

```bash
git clone https://github.com/YOUR_USERNAME/podologa.git
cd podologa
```

> Replace `YOUR_USERNAME` with the actual GitHub username where this project lives.

---

### Step 3 — Set up the backend (Python API)

Open a terminal inside the `backend/` folder:

```bash
cd backend
```

**Create a virtual environment** (this keeps Python dependencies isolated):

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac / Linux
python3 -m venv venv
source venv/bin/activate
```

> You should see `(venv)` at the start of your terminal prompt — that means it worked.

**Install Python dependencies:**

```bash
pip install -r requirements.txt
```

---

### Step 4 — Configure environment variables

Environment variables are settings that contain sensitive information (passwords, API keys) and are never stored in the code itself.

Copy the example file:

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open the new `.env` file in any text editor (Notepad, TextEdit, VS Code) and fill in the values. At minimum, for local development you only need these two:

```
DATABASE_URL=sqlite:///./test_local.db
SECRET_KEY=any-random-string-you-want-here
```

All other variables (WhatsApp, Google Calendar, Cloudinary, etc.) are optional for local testing — the app will work without them, those features just won't be active.

---

### Step 5 — Set up the database

```bash
alembic upgrade head
```

This creates all the database tables automatically. You should see output ending in `Running upgrade ... -> ...`.

---

### Step 6 — Create the first admin account

```bash
# Make sure uvicorn is running first (Step 7), then in a second terminal run:
curl -X POST http://localhost:8000/auth/bootstrap \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"your-password\"}"
```

> Replace `your-secret-key-here` with the `SECRET_KEY` value you set in `.env`.

---

### Step 7 — Install frontend dependencies

Open a **new terminal** (keep the previous one aside), navigate to the `frontend/` folder:

```bash
cd frontend
npm install
```

This downloads all the JavaScript packages — it may take a minute or two.

---

### Step 8 — Start the app

**Easiest way** — from the project root, start both frontend and backend at once:

```bash
# From the project root (not inside frontend/ or backend/)
npm install
npm run dev
```

Or start them separately in two terminals:

```bash
# Terminal 1 — Backend
cd backend
venv\Scripts\activate   # (Windows)
uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm start
```

**Open your browser:**
- Frontend: [http://localhost:4200](http://localhost:4200)
- Backend API docs: [http://localhost:8000/docs](http://localhost:8000/docs) (interactive API explorer)
- Admin panel: [http://localhost:4200/admin/login](http://localhost:4200/admin/login)

---

## Environment variables — full reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string. Use `sqlite:///./test_local.db` locally. |
| `SECRET_KEY` | Yes | Any random string — used to sign login tokens. |
| `CLOUDINARY_CLOUD_NAME` | For gallery | Cloud name from [cloudinary.com](https://cloudinary.com) dashboard. |
| `CLOUDINARY_API_KEY` | For gallery | API key from Cloudinary. |
| `CLOUDINARY_API_SECRET` | For gallery | API secret from Cloudinary. |
| `WHATSAPP_PHONE_NUMBER_ID` | For WhatsApp | From Meta for Developers dashboard. |
| `WHATSAPP_API_TOKEN` | For WhatsApp | Bearer token for sending messages. |
| `WHATSAPP_VERIFY_TOKEN` | For WhatsApp | A custom token you choose for webhook verification. |
| `SMTP_HOST` | For emails | e.g. `smtp.gmail.com`. Leave empty to print emails to the terminal. |
| `SMTP_PORT` | For emails | Usually `587`. |
| `SMTP_USER` | For emails | Your Gmail address. |
| `SMTP_PASSWORD` | For emails | Gmail App Password (not your real password). |
| `GOOGLE_CLIENT_ID` | For Calendar | From Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | For Calendar | From Google Cloud Console. |
| `GOOGLE_REFRESH_TOKEN` | For Calendar | Obtained via the OAuth2 setup script. |
| `ANTHROPIC_API_KEY` | For AI captions | From [console.anthropic.com](https://console.anthropic.com). |
| `CORS_EXTRA_ORIGINS` | Production | Comma-separated list of allowed frontend domains. |
| `FB_PAGE_ID` | For social posts | Facebook page ID. |
| `FB_PAGE_ACCESS_TOKEN` | For social posts | Long-lived token from Meta Business Suite. |
| `IG_BUSINESS_ACCOUNT_ID` | For social posts | Instagram Business Account ID. |

---

## Troubleshooting

**`python` not found on Windows:**
Try using `py` instead of `python` — e.g. `py -m venv venv`.

**Port already in use:**
Something else is using port 4200 or 8000. Find and close it, or change the port:
```bash
# Backend on a different port
uvicorn main:app --reload --port 8001
```

**`npm install` fails:**
Make sure your Node.js version is 20 or higher: `node --version`.

**`alembic upgrade head` fails:**
Make sure your virtual environment is active (you should see `(venv)` in your terminal prompt) and that `DATABASE_URL` is correctly set in `.env`.

**Frontend shows "Cannot connect to API":**
Make sure the backend is running on port 8000 before opening the frontend.

---

## Project structure

```
podologa/
├── backend/                 # Python API (FastAPI)
│   ├── main.py              # App entry point
│   ├── models.py            # Database tables
│   ├── routers/             # API endpoints (one file per feature)
│   ├── alembic/             # Database migration history
│   ├── .env.example         # Template for your .env file
│   └── requirements.txt     # Python dependencies
│
├── frontend/                # Angular web app
│   ├── src/app/
│   │   ├── home/            # Landing page
│   │   ├── reservas/        # Booking form
│   │   ├── galeria/         # Photo gallery
│   │   └── admin/           # Private admin dashboard
│   └── package.json
│
└── package.json             # Root scripts (npm run dev)
```

---

## Deploying to production

This project is set up to deploy to **Railway** (backend) and **Vercel** (frontend).

See the full deployment history and configuration in:
- `backend/railway.toml` — Railway deploy settings
- `frontend/vercel.json` — Vercel configuration
- `frontend/src/environments/environment.prod.ts` — Production API URL

The backend runs migrations automatically on every deploy (`alembic upgrade head` is part of the start command).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and commit: `git commit -m "feat: add my feature"`
4. Push and open a Pull Request

---

## License

Private project. All rights reserved — Libélula Podología y Terapias.
