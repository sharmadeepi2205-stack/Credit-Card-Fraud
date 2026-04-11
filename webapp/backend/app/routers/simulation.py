"""
Simulation router — seed from CSV and stream transactions.
GET  /api/simulate/seed      — load N rows from creditcard.csv into DB
POST /api/simulate/stream    — fire one random transaction for a card
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
from app.models import User, Card, Transaction, FraudAlert, AlertStatus
from app.auth import get_current_user
from app.ml_service import score_transaction
from app.notifications import send_in_app

router = APIRouter(prefix="/api/simulate", tags=["simulation"])

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
