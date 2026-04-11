"""Seed script — creates admin + demo user with a card and default fraud rules."""
import asyncio, sys, os, uuid

# Run from webapp/backend/
sys.path.insert(0, os.path.dirname(__file__))

from app.database import AsyncSessionLocal, init_db
from app.models import User, Card, NotificationPreference, FraudRule
from app.auth import hash_password


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        admin = User(
            id=str(uuid.uuid4()), email="admin@fraudguard.dev",
            hashed_password=hash_password("Admin1234!"),
            full_name="Admin User", is_admin=True, mfa_enabled=False,
        )
        db.add(admin)
        db.add(NotificationPreference(user_id=admin.id))

        demo = User(
            id=str(uuid.uuid4()), email="demo@fraudguard.dev",
            hashed_password=hash_password("Demo1234!"),
            full_name="Demo User", mfa_enabled=False,
        )
        db.add(demo)
        db.add(NotificationPreference(user_id=demo.id))
        db.add(Card(
            user_id=demo.id, token=f"tok_{uuid.uuid4().hex}",
            last_four="4242", card_type="VISA", bin_prefix="411111", credit_limit=10000.0,
        ))

        for rule in [
            FraudRule(name="velocity_5_in_10min", rule_type="VELOCITY",
                      description="Block >5 txns in 10 min",
                      parameters={"max_txn": 5, "window_minutes": 10}),
            FraudRule(name="max_daily_amount", rule_type="AMOUNT",
                      description="Flag daily spend > $5000",
                      parameters={"max_daily_usd": 5000}),
            FraudRule(name="geo_mismatch", rule_type="GEO",
                      description="Flag BIN/country mismatch",
                      parameters={"enabled": True}),
        ]:
            db.add(rule)

        await db.commit()
        print("Seed complete.")
        print("  Admin: admin@fraudguard.dev / Admin1234!")
        print("  Demo:  demo@fraudguard.dev  / Demo1234!")


if __name__ == "__main__":
    asyncio.run(seed())
