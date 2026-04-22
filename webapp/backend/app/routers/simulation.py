"""
Simulation router — seed from CSV and stream transactions.
GET  /api/simulate/seed           — load N rows from creditcard.csv into DB
POST /api/simulate/stream         — fire one random transaction for a card
POST /api/simulate/high-risk      — inject pre-crafted HIGH-risk transactions with freeze alerts
"""
import os
import sys
import random
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models import User, Card, CardStatus, Transaction, FraudAlert, AlertStatus, AuditLog, AuditAction
from app.auth import get_current_user
from app.ml_service import score_transaction
from app.notifications import send_in_app
from app.websocket_manager import manager

router = APIRouter(prefix="/api/simulate", tags=["simulation"])

# ── Pre-crafted HIGH-risk transaction scenarios ────────────────────────────────
HIGH_RISK_SCENARIOS = [
    {
        "name": "Stolen Card — International ATM Spree",
        "transactions": [
            {
                "amount": 980.00, "merchant_name": "ATM Moscow", "merchant_category": "Cash",
                "country": "RU", "device_id": "atm-ru-001", "ip_address": "185.220.101.5",
                "fraud_score": 94.5, "reason": "Card used at foreign ATM; country mismatch with BIN; rapid cash withdrawals",
            },
            {
                "amount": 1200.00, "merchant_name": "ATM Lagos", "merchant_category": "Cash",
                "country": "NG", "device_id": "atm-ng-002", "ip_address": "41.203.64.10",
                "fraud_score": 97.2, "reason": "Impossible travel: Moscow → Lagos in 4 minutes; unrecognized device",
            },
        ],
    },
    {
        "name": "Account Takeover — Large Luxury Purchases",
        "transactions": [
            {
                "amount": 4800.00, "merchant_name": "Dubai Luxury Goods", "merchant_category": "Shopping",
                "country": "AE", "device_id": "hacked-device-ae", "ip_address": "5.42.199.1",
                "fraud_score": 91.8, "reason": "Unusual spending pattern; new device fingerprint; amount exceeds daily limit",
            },
            {
                "amount": 2300.00, "merchant_name": "CryptoExchange Pro", "merchant_category": "Crypto",
                "country": "CN", "device_id": "hacked-device-cn", "ip_address": "103.21.244.5",
                "fraud_score": 95.1, "reason": "Rapid burst: 2 high-value transactions in 90 seconds; crypto exchange flagged",
            },
        ],
    },
    {
        "name": "Card Testing + Large Fraud Purchase",
        "transactions": [
            {
                "amount": 1.00, "merchant_name": "Test Merchant RO", "merchant_category": "Other",
                "country": "RO", "device_id": "bot-tester-001", "ip_address": "89.33.44.55",
                "fraud_score": 78.3, "reason": "Micro-transaction card testing pattern detected; bot-like device signature",
            },
            {
                "amount": 3499.99, "merchant_name": "Electronics Warehouse", "merchant_category": "Electronics",
                "country": "RO", "device_id": "bot-tester-001", "ip_address": "89.33.44.55",
                "fraud_score": 96.7, "reason": "Card testing followed by large purchase; same bot device; velocity burst",
            },
        ],
    },
]

_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
CSV_PATH = os.path.join(_repo_root, "data", "creditcard.csv")


def _load_csv_rows(n: int = 100):
    import pandas as pd
    if not os.path.exists(CSV_PATH):
        return []
    df = pd.read_csv(CSV_PATH).head(n)
    return df.to_dict(orient="records")


@router.post("/seed")
async def seed_transactions(
    n: int = Query(100, le=1000),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seed N transactions from the Kaggle CSV for the user's first card."""
    card_result = await db.execute(select(Card).where(Card.user_id == user.id).limit(1))
    card = card_result.scalar_one_or_none()
    if not card:
        raise HTTPException(400, "Add a card first before seeding transactions")

    rows = _load_csv_rows(n)
    if not rows:
        raise HTTPException(500, "creditcard.csv not found at data/creditcard.csv")

    merchants = ["Amazon", "Walmart", "Shell", "Starbucks", "Netflix", "Unknown"]
    countries = ["US", "GB", "DE", "FR", "CN", "RU", "BR"]

    created = 0
    for row in rows:
        ml_feats = {k: float(v) for k, v in row.items() if k not in ("Class", "Amount", "Time")}
        ml_feats["Time"] = float(row.get("Time", 0))
        amount = float(row.get("Amount", random.uniform(1, 500)))
        merchant = random.choice(merchants)
        country = random.choice(countries)

        txn_data = {
            "user_id": user.id,
            "amount": amount,
            "merchant_name": merchant,
            "country": country,
            "bin_prefix": card.bin_prefix,
            "ml_features": ml_feats,
        }
        score = score_transaction(txn_data)

        txn = Transaction(
            card_id=card.id,
            user_id=user.id,
            amount=amount,
            merchant_name=merchant,
            country=country,
            fraud_score=score["fraud_score"],
            risk_level=score["risk_level"],
            is_fraud=row.get("Class", 0) == 1,
            ml_features=ml_feats,
        )
        db.add(txn)
        created += 1

    await db.flush()
    return {"seeded": created}


async def _stream_loop(user_id: str, card_id: str, count: int, delay: float):
    """Background task: fire `count` simulated transactions with `delay` seconds between each."""
    rows = _load_csv_rows(count * 2)
    if not rows:
        return
    random.shuffle(rows)
    merchants = ["Amazon", "Walmart", "Shell", "Starbucks", "Netflix", "Unknown"]
    countries = ["US", "GB", "DE", "FR", "CN", "RU"]

    for row in rows[:count]:
        await asyncio.sleep(delay)
        async with AsyncSessionLocal() as db:
            ml_feats = {k: float(v) for k, v in row.items() if k not in ("Class", "Amount", "Time")}
            ml_feats["Time"] = float(row.get("Time", 0))
            amount = float(row.get("Amount", random.uniform(1, 500)))
            merchant = random.choice(merchants)
            country = random.choice(countries)

            score = score_transaction({
                "user_id": user_id, "amount": amount,
                "merchant_name": merchant, "country": country,
                "ml_features": ml_feats,
            })

            txn = Transaction(
                card_id=card_id, user_id=user_id,
                amount=amount, merchant_name=merchant, country=country,
                fraud_score=score["fraud_score"], risk_level=score["risk_level"],
                is_fraud=row.get("Class", 0) == 1, ml_features=ml_feats,
            )
            db.add(txn)
            await db.flush()

            if score["risk_level"] in ("MEDIUM", "HIGH"):
                alert = FraudAlert(
                    user_id=user_id, card_id=card_id, transaction_id=txn.id,
                    fraud_score=score["fraud_score"], risk_level=score["risk_level"],
                    reason=score["reason"], status=AlertStatus.PENDING,
                )
                db.add(alert)
                await db.flush()
                await send_in_app(user_id, alert.id, score["risk_level"],
                                  amount, score["reason"], score["fraud_score"])
            await db.commit()


@router.post("/stream")
async def start_stream(
    count: int = Query(20, le=200),
    delay: float = Query(1.0, ge=0.1, le=10.0),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a background streaming loop of simulated transactions."""
    card_result = await db.execute(select(Card).where(Card.user_id == user.id).limit(1))
    card = card_result.scalar_one_or_none()
    if not card:
        raise HTTPException(400, "Add a card first")

    background_tasks.add_task(_stream_loop, user.id, card.id, count, delay)
    return {"message": f"Streaming {count} transactions every {delay}s in background"}


async def _inject_high_risk(user_id: str, card_id: str, scenario_index: int):
    """Background task: inject high-risk transactions one by one with delays, push freeze alerts."""
    scenario = HIGH_RISK_SCENARIOS[scenario_index % len(HIGH_RISK_SCENARIOS)]
    for i, txn_def in enumerate(scenario["transactions"]):
        await asyncio.sleep(1.5 * i)
        async with AsyncSessionLocal() as db:
            txn = Transaction(
                card_id=card_id,
                user_id=user_id,
                amount=txn_def["amount"],
                merchant_name=txn_def["merchant_name"],
                merchant_category=txn_def.get("merchant_category"),
                country=txn_def["country"],
                device_id=txn_def.get("device_id"),
                ip_address=txn_def.get("ip_address"),
                fraud_score=txn_def["fraud_score"],
                risk_level="HIGH",
                is_fraud=True,
            )
            db.add(txn)
            await db.flush()

            alert = FraudAlert(
                user_id=user_id,
                card_id=card_id,
                transaction_id=txn.id,
                fraud_score=txn_def["fraud_score"],
                risk_level="HIGH",
                reason=txn_def["reason"],
                status=AlertStatus.PENDING,
            )
            db.add(alert)
            await db.flush()

            # Push standard fraud alert
            await send_in_app(
                user_id, alert.id, "HIGH",
                txn_def["amount"], txn_def["reason"], txn_def["fraud_score"],
            )

            # Push freeze recommendation WebSocket message
            await manager.send_to_user(user_id, {
                "type": "FREEZE_RECOMMENDATION",
                "alert_id": alert.id,
                "card_id": card_id,
                "fraud_score": txn_def["fraud_score"],
                "amount": txn_def["amount"],
                "merchant_name": txn_def["merchant_name"],
                "country": txn_def["country"],
                "reason": txn_def["reason"],
                "scenario": scenario["name"],
            })

            await db.commit()


@router.post("/high-risk")
async def inject_high_risk(
    scenario: int = Query(0, ge=0, le=2, description="0=ATM Spree, 1=Account Takeover, 2=Card Testing"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Inject pre-crafted HIGH-risk transactions that trigger freeze-account alerts.
    Transactions are streamed one by one with a short delay so the UI can react in real time.
    """
    card_result = await db.execute(select(Card).where(Card.user_id == user.id).limit(1))
    card = card_result.scalar_one_or_none()
    if not card:
        raise HTTPException(400, "Add a card first")

    s = HIGH_RISK_SCENARIOS[scenario % len(HIGH_RISK_SCENARIOS)]
    background_tasks.add_task(_inject_high_risk, user.id, card.id, scenario)
    return {
        "message": f"Injecting {len(s['transactions'])} HIGH-risk transactions for scenario: {s['name']}",
        "scenario": s["name"],
        "transaction_count": len(s["transactions"]),
    }


@router.get("/high-risk/scenarios")
async def list_high_risk_scenarios(user: User = Depends(get_current_user)):
    """List available high-risk simulation scenarios."""
    return [
        {"index": i, "name": s["name"], "transaction_count": len(s["transactions"])}
        for i, s in enumerate(HIGH_RISK_SCENARIOS)
    ]
