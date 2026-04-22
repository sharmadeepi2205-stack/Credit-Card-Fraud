# 🛡️ FraudGuard — Credit Card Fraud Detection Platform

A full-stack, real-time credit card fraud detection system powered by Machine Learning. Built with FastAPI, React, and SQLite — runs entirely locally with no external services required.

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| 🤖 **ML Fraud Scoring** | Random Forest / XGBoost model scores every transaction 0–100 |
| ⚡ **Real-time Alerts** | WebSocket-powered live fraud alerts pushed instantly to the UI |
| 🚨 **Freeze Account Alerts** | High-risk transactions trigger a freeze-card popup in real time |
| 🔐 **JWT + MFA Auth** | Login with email OTP two-factor authentication |
| 💳 **Card Management** | Add, block, or restrict cards to online-only |
| 📊 **Dashboard & Analytics** | Daily fraud stats, model metrics, spending trends |
| 🗺️ **Location Timeline** | Geographic transaction history and impossible travel detection |
| 🕵️ **Fraud Simulation** | Sandbox with 8 attack scenarios + 3 high-risk live injection scenarios |
| 🧾 **Disputes** | File and track transaction disputes |
| 🌐 **Network Graph** | Visualize transaction relationships |
| 🔍 **Dark Web Monitor** | Simulated dark web credential monitoring |
| 🤝 **Merchant Analytics** | Per-merchant fraud rate and spend breakdown |
| 🛠️ **Admin Panel** | Fraud rule CRUD, case management, CSV export |
| 💬 **AI Chatbot** | In-app fraud assistant |

---

## 🚀 Quick Start

### Option A — One-click (Windows)

```bat
start.bat
```

Installs all dependencies, seeds the database, and opens both servers in separate terminal windows.

### Option B — Manual (two terminals)

**Terminal 1 — Backend:**
```bash
cd webapp/backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd webapp/frontend
npm install
npm run dev
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| **App** | http://localhost:5173 |
| **API** | http://localhost:8000 |
| **API Docs** (Swagger) | http://localhost:8000/docs |

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@fraudguard.dev` | `Admin1234!` |
| Demo User | `demo@fraudguard.dev` | `Demo1234!` |

---

## 🏗️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — async Python web framework
- **SQLAlchemy 2.0** (async) + **SQLite** via `aiosqlite` — zero-config database
- **Pydantic v2** — request/response validation
- **python-jose** — JWT token auth
- **passlib + bcrypt** — password hashing
- **WebSockets** — real-time alert streaming

### Frontend
- **React 18** + **Vite** — fast dev server with HMR
- **Tailwind CSS** — utility-first styling
- **Recharts** — charts and analytics visualizations
- **Axios** — HTTP client with auto token refresh
- **react-hot-toast** — toast notifications
- **lucide-react** — icons

### ML Engine
- **scikit-learn** — Random Forest classifier
- **XGBoost** — gradient boosting model
- **pandas / numpy** — feature engineering
- **imbalanced-learn** — SMOTE oversampling for class imbalance
- **joblib** — model serialization
- Pre-trained model at `models/model.pkl`, trained on the [Kaggle Credit Card Fraud dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)

---

## 📁 Project Structure

```
Credit-Card-Fraud/
├── data/
│   └── creditcard.csv          # Kaggle fraud dataset (284,807 transactions)
├── models/
│   └── model.pkl               # Pre-trained ML model
├── webapp/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py         # FastAPI app entry point + WebSocket
│   │   │   ├── models.py       # SQLAlchemy ORM models
│   │   │   ├── schemas.py      # Pydantic request/response schemas
│   │   │   ├── auth.py         # JWT + OTP authentication
│   │   │   ├── config.py       # Settings (reads from .env)
│   │   │   ├── database.py     # Async SQLite engine + session
│   │   │   ├── ml_service.py   # ML scoring + rule engine
│   │   │   ├── ml_engine.py    # Model loading utilities
│   │   │   ├── notifications.py# Email + WebSocket push
│   │   │   ├── websocket_manager.py
│   │   │   └── routers/
│   │   │       ├── auth.py         # Register, login, OTP
│   │   │       ├── users.py        # Profile, notification prefs
│   │   │       ├── cards.py        # Card CRUD + status
│   │   │       ├── transactions.py # Submit + history + velocity
│   │   │       ├── alerts.py       # Fraud alerts + actions
│   │   │       ├── admin.py        # Stats, cases, rules, export
│   │   │       ├── simulation.py   # CSV seed, stream, high-risk inject
│   │   │       ├── predict.py      # Direct ML prediction endpoint
│   │   │       ├── disputes.py     # Dispute filing
│   │   │       ├── travel.py       # Travel notices
│   │   │       ├── security.py     # Security settings
│   │   │       ├── chatbot.py      # AI assistant
│   │   │       ├── reports.py      # Report generation
│   │   │       ├── darkweb.py      # Dark web monitoring
│   │   │       └── merchants.py    # Merchant analytics
│   │   ├── .env                # Local environment config
│   │   ├── seed.py             # DB seeder (demo users + fraud rules)
│   │   └── requirements.txt
│   └── frontend/
│       └── src/
│           ├── pages/          # One file per page/route
│           ├── components/     # Reusable UI components
│           ├── context/        # React context (Auth, Alerts, Theme, Prefs)
│           ├── api/client.js   # Axios instance with token refresh
│           └── lib/wsUrl.js    # WebSocket URL helper
├── start.bat                   # One-click Windows startup script
└── README.md
```

---

## ⚙️ Environment Configuration

The backend reads from `webapp/backend/.env`. All defaults work out of the box — no setup needed for local dev.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./fraudguard.db` | Database — SQLite by default |
| `SECRET_KEY` | `local-dev-secret-key-...` | JWT signing key — **change in production** |
| `MODEL_PATH` | `../../models/model.pkl` | Path to trained ML model |
| `CSV_PATH` | `../../data/creditcard.csv` | Path to Kaggle transaction CSV |
| `SMTP_USER` / `SMTP_PASS` | *(empty)* | Leave blank — emails print to console in dev |
| `ENVIRONMENT` | `development` | Set to `production` to enable real SMTP email |

---

## 🎮 Fraud Simulation

Go to **Simulation** in the sidebar to run attack scenarios.

### ML Scoring Scenarios (predict only)
| Scenario | Description |
|----------|-------------|
| Card Skimming Attack | Rapid ATM withdrawals across countries |
| Account Takeover | Large purchases from new devices |
| Card-Not-Present (CNP) Fraud | Card testing + large online purchase |
| Velocity / Burst Attack | 5 rapid-fire transactions |
| Impossible Travel | Mumbai → Paris in 10 minutes |

### High-Risk Live Injection (triggers freeze popup)
| Scenario | Fraud Score | What happens |
|----------|-------------|--------------|
| 🏧 Stolen Card — ATM Spree | 94–97 | Transactions saved to DB, freeze alert popup appears |
| 🔓 Account Takeover | 91–95 | Large luxury purchases, new device fingerprint |
| 🤖 Card Testing + Large Fraud | 78–96 | $1 test → $3,499 purchase pattern |

When a high-risk scenario runs, a **freeze-account modal** pops up in real time with:
- Fraud score, merchant, amount, country
- Reason the transaction was flagged
- **Freeze Card Now** button — immediately blocks the card
- **It was me** button — dismisses the alert

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login step 1 (sends OTP) |
| POST | `/api/auth/verify-otp` | Login step 2 (verify OTP → JWT) |
| GET | `/api/users/me` | Get current user profile |
| GET/POST | `/api/cards` | List / add cards |
| PATCH | `/api/cards/{id}/status` | Block / online-only |
| GET/POST | `/api/transactions` | Transaction history / submit |
| GET | `/api/transactions/velocity` | Live velocity counters |
| GET/PATCH | `/api/alerts` | List / resolve alerts |
| POST | `/api/alerts/{id}/block-card` | One-click card freeze |
| POST | `/api/alerts/{id}/respond` | approve / soft_block / hard_block |
| GET | `/api/admin/stats/daily` | Daily fraud statistics |
| GET | `/api/admin/stats/model-metrics` | ML model performance metrics |
| GET/PATCH | `/api/admin/cases` | Fraud case management |
| GET/POST/PATCH | `/api/admin/rules` | Fraud rule CRUD |
| GET | `/api/admin/export/alerts` | Export alerts as CSV |
| POST | `/api/simulate/seed` | Seed N transactions from CSV |
| POST | `/api/simulate/stream` | Stream live transactions |
| POST | `/api/simulate/high-risk` | Inject high-risk transactions + freeze alert |
| POST | `/api/predict` | Direct ML prediction |
| WS | `/ws/alerts?token=` | Real-time WebSocket alert stream |

Full interactive docs: **http://localhost:8000/docs**

---

## 🔒 Security Notes

- Card PANs are never stored — only tokenized IDs (`tok_<uuid>`)
- All admin routes require `is_admin=True`
- Audit logs track every card block, rule change, and case close
- OTPs expire in 5 minutes and are single-use
- JWT access tokens expire in 60 minutes; refresh tokens in 7 days
- Passwords hashed with bcrypt

---

## 📊 Dataset

The ML model is trained on the [Kaggle Credit Card Fraud Detection dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud):
- 284,807 transactions
- 492 fraudulent (0.17% — highly imbalanced)
- Features V1–V28 are PCA-transformed for privacy
- SMOTE used to handle class imbalance during training
