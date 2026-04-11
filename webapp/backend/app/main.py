"""FastAPI application entry point."""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.websocket_manager import manager
from app.auth import decode_token
from app.routers import auth, users, cards, transactions, alerts, admin, travel, simulation
from app.routers import predict, model, security, disputes
from app.routers import chatbot, reports, darkweb, merchants

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database ready.")
    yield


app = FastAPI(
    title="FraudGuard API",
    version="1.0.0",
    description="Credit Card Fraud Detection Platform",
    lifespan=lifespan,
)

# Build allowed origins from env var + defaults
_frontend_url = os.getenv("FRONTEND_URL", "")
_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
if _frontend_url:
    _origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
for r in [auth.router, users.router, cards.router, transactions.router,
          alerts.router, admin.router, travel.router, simulation.router,
          predict.router, model.router, security.router, disputes.router,
          chatbot.router, reports.router, darkweb.router, merchants.router]:
    app.include_router(r)


# ── WebSocket endpoint ─────────────────────────────────────────────────────────

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket, token: str = Query(...)):
    """
    Real-time alert stream.
    Connect with: ws://localhost:8000/ws/alerts?token=<access_token>
    """
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)
    # Also register admins under "admin" key for broadcast
    try:
        while True:
            # Keep connection alive; server pushes messages via manager
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@app.get("/health")
async def health():
    return {"status": "ok"}
