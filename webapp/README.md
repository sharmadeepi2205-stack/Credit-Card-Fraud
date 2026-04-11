# FraudGuard — Full-Stack Credit Card Fraud Detection

Built on top of the existing `fraud_detection_app` ML engine.

## Stack
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts
- **Real-time**: WebSocket (FastAPI native)
- **Auth**: JWT + email OTP (MFA)
- **ML**: Wraps existing `fraud_detection_app` engine (Random Forest / XGBoost)
- **Infra**: Docker Compose

---

## Quick Start (Docker)

```bash
# From repo root
cd webapp
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Admin: admin@fraudguard.dev / Admin1234!
- Demo user: demo@fraudguard.dev / Demo1234!

---

## Local Dev (no Docker)

### Backend

```bash
# 1. Start Postgres + Redis (or use Docker for just those)
docker compose up db redis -d

# 2. Install deps
cd webapp/backend
pip install -r requirements.txt

# 3. Copy and edit env
cp .env.example .env

# 4. Seed DB
python seed.py

# 5. Run API
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd webapp/frontend
npm install
npm run dev   # http://localhost:5173
```

---

## Seeding Kaggle Data

After logging in as the demo user:

1. Add a card on the Cards page (or it's pre-seeded).
2. Go to Transactions → click **Simulate Stream** to stream 20 transactions from `creditcard.csv` in real-time.
3. Or call the API directly:

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
│   ├── seed.py
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── pages/           # Login, Dashboard, Transactions, Alerts, Cards, Admin
│       ├── context/         # AuthContext, AlertsContext (WebSocket)
│       ├── components/      # Layout, sidebar
│       └── api/client.js    # Axios + auto-refresh
└── docker-compose.yml
```

---

## Security Notes
- Card PANs are never stored — only tokenized IDs (`tok_<uuid>`)
- All admin routes require `is_admin=True`
- Audit logs track every card block, rule change, and case close
- OTPs expire in 5 minutes and are single-use
- JWT access tokens expire in 60 minutes; refresh tokens in 7 days
