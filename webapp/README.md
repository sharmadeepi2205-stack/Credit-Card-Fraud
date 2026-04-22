# FraudGuard — Full-Stack Credit Card Fraud Detection

Built on top of the existing `fraud_detection_app` ML engine.

## Stack
- **Backend**: FastAPI + SQLAlchemy (async) + SQLite
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts
- **Real-time**: WebSocket (FastAPI native)
- **Auth**: JWT + email OTP (MFA)
- **ML**: Wraps existing `fraud_detection_app` engine (Random Forest / XGBoost)

---

## Quick Start

### Option A — One-click (Windows)

From the repo root:

```bat
start.bat
```

This installs dependencies, seeds the database, and opens both servers in separate terminal windows.

---

### Option B — Manual

#### Backend

```bash
cd webapp/backend

# Install dependencies
pip install -r requirements.txt

# Seed the database (creates SQLite DB + demo users)
python seed.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd webapp/frontend

npm install
npm run dev   # http://localhost:5173
```

---

## URLs

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Demo Accounts

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@fraudguard.dev | Admin1234! |
| Demo  | demo@fraudguard.dev  | Demo1234!  |

---

## Environment Configuration

The backend reads from `webapp/backend/.env`. Defaults work out of the box with SQLite.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./fraudguard.db` | Database connection string |
| `SECRET_KEY` | (set in .env) | JWT signing key — change in production |
| `MODEL_PATH` | `../../models/model.pkl` | Path to ML model |
| `CSV_PATH` | `../../data/creditcard.csv` | Path to transaction CSV |
| `SMTP_USER` / `SMTP_PASS` | (empty) | Email — leave blank to use console mock |
| `ENVIRONMENT` | `development` | Set to `production` to enable real email |

---

## Seeding Transaction Data

After logging in as the demo user:

1. Go to **Transactions → Simulate Stream** to stream 20 transactions from `creditcard.csv` in real-time.
2. Or call the API directly:

```bash
# Seed 500 rows from CSV
curl -X POST "http://localhost:8000/api/simulate/seed?n=500" \
  -H "Authorization: Bearer <token>"

# Start a live stream (20 txns, 1.5s apart)
curl -X POST "http://localhost:8000/api/simulate/stream?count=20&delay=1.5" \
  -H "Authorization: Bearer <token>"
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login (step 1) |
| POST | /api/auth/verify-otp | MFA OTP verify → JWT |
| GET | /api/users/me | Current user |
| PATCH | /api/users/me/notifications | Update notification prefs |
| GET/POST | /api/cards | List / add cards |
| PATCH | /api/cards/{id}/status | Block / online-only |
| GET/POST | /api/transactions | History / submit transaction |
| GET/PATCH | /api/alerts | List / resolve alerts |
| POST | /api/alerts/{id}/block-card | One-click card block |
| GET/POST | /api/travel | Travel notices |
| GET | /api/admin/stats/daily | Daily fraud stats |
| GET | /api/admin/stats/model-metrics | ML model metrics |
| GET | /api/admin/cases | All fraud cases |
| PATCH | /api/admin/cases/{id} | Review/close case |
| GET/POST/PATCH | /api/admin/rules | Fraud rule CRUD |
| GET | /api/admin/export/alerts | CSV export |
| POST | /api/simulate/seed | Seed from CSV |
| POST | /api/simulate/stream | Live transaction stream |
| WS | /ws/alerts?token= | Real-time alert WebSocket |

Full interactive docs at http://localhost:8000/docs

---

## Architecture

```
webapp/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + WebSocket
│   │   ├── models.py        # SQLAlchemy ORM
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── auth.py          # JWT + OTP
│   │   ├── ml_service.py    # Wraps fraud_detection_app engine
│   │   ├── notifications.py # Email + WebSocket push
│   │   ├── websocket_manager.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── cards.py
│   │       ├── transactions.py
│   │       ├── alerts.py
│   │       ├── admin.py
│   │       ├── travel.py
│   │       └── simulation.py
│   ├── .env                 # Local environment config
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # Login, Dashboard, Transactions, Alerts, Cards, Admin
│       ├── context/         # AuthContext, AlertsContext (WebSocket)
│       ├── components/      # Layout, sidebar
│       └── api/client.js    # Axios + auto-refresh
└── README.md
```

---

## Security Notes
- Card PANs are never stored — only tokenized IDs (`tok_<uuid>`)
- All admin routes require `is_admin=True`
- Audit logs track every card block, rule change, and case close
- OTPs expire in 5 minutes and are single-use
- JWT access tokens expire in 60 minutes; refresh tokens in 7 days
