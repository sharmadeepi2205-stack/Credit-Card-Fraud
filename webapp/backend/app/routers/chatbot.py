"""
AI Fraud Assistant — rule-based LLM-style chatbot.
Injects user's transaction context to answer fraud questions in plain English.
No external API key required — uses pattern matching + template responses.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
import re
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, Transaction, FraudAlert, Card
from app.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chatbot"])


class ChatMessage(BaseModel):
    message: str
    transaction_id: Optional[str] = None


def _risk_label(score):
    if score is None: return "unknown"
    if score >= 70: return "HIGH"
    if score >= 35: return "MEDIUM"
    return "LOW"


def _plain_reason(reason: str) -> str:
    if not reason or reason == "Automated risk assessment":
        return "a combination of unusual signals"
    parts = [r.strip().lower() for r in reason.split(";") if r.strip()]
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + f", and {parts[-1]}"


async def _get_context(user: User, db: AsyncSession, txn_id: Optional[str] = None):
    """Build context dict from user's recent transactions and alerts."""
    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
        .order_by(desc(Transaction.timestamp)).limit(20)
    )
    txns = txn_result.scalars().all()

    alert_result = await db.execute(
        select(FraudAlert).where(FraudAlert.user_id == user.id,
                                  FraudAlert.status == "PENDING").limit(5)
    )
    pending_alerts = alert_result.scalars().all()

    card_result = await db.execute(
        select(Card).where(Card.user_id == user.id)
    )
    cards = card_result.scalars().all()

    specific_txn = None
    if txn_id:
        t = await db.execute(select(Transaction).where(
            Transaction.id == txn_id, Transaction.user_id == user.id))
        specific_txn = t.scalar_one_or_none()

    high_risk = [t for t in txns if t.risk_level == "HIGH"]
    total_spend = sum(t.amount for t in txns)
    avg_amount = total_spend / len(txns) if txns else 0

    return {
        "txns": txns,
        "pending_alerts": pending_alerts,
        "cards": cards,
        "high_risk": high_risk,
        "total_spend": total_spend,
        "avg_amount": avg_amount,
        "specific_txn": specific_txn,
        "name": user.full_name.split()[0],
    }


def _generate_response(msg: str, ctx: dict) -> str:
    msg_lower = msg.lower()
    name = ctx["name"]
    txns = ctx["txns"]
    high_risk = ctx["high_risk"]
    pending = ctx["pending_alerts"]
    cards = ctx["cards"]
    specific = ctx["specific_txn"]

    # ── Specific transaction query ─────────────────────────────────────────────
    if specific:
        score = specific.fraud_score or 0
        risk = _risk_label(score)
        merchant = specific.merchant_name or "Unknown merchant"
        amount = specific.amount
        reason = _plain_reason(specific.reason or "")
        if risk == "LOW":
            return (f"✅ **{merchant} — ${amount:.2f}** looks safe, {name}. "
                    f"The fraud score was **{score:.0f}/100** (low risk). "
                    f"No unusual signals were detected for this transaction.")
        elif risk == "MEDIUM":
            return (f"⚠️ **{merchant} — ${amount:.2f}** was flagged as **medium risk** "
                    f"(score: {score:.0f}/100). It was flagged because of {reason}. "
                    f"If you made this transaction, you can mark it as 'This is me' on the Alerts page.")
        else:
            return (f"🚨 **{merchant} — ${amount:.2f}** was flagged as **HIGH RISK** "
                    f"(score: {score:.0f}/100). It was flagged because of {reason}. "
                    f"If you didn't make this transaction, go to Alerts and tap **Block payment** immediately.")

    # ── Why was my card flagged ────────────────────────────────────────────────
    if any(w in msg_lower for w in ["why", "flagged", "blocked", "declined", "reason"]):
        if not high_risk:
            return (f"Good news, {name}! 🎉 None of your recent transactions have been flagged as high risk. "
                    f"Your account looks secure.")
        t = high_risk[0]
        reason = _plain_reason(t.reason or "")
        return (f"Your most recent high-risk transaction was **{t.merchant_name or 'Unknown'} — "
                f"${t.amount:.2f}** (score: {t.fraud_score:.0f}/100). "
                f"It was flagged because of **{reason}**. "
                f"Head to the **Alerts page** to review and take action.")

    # ── Is this transaction safe ───────────────────────────────────────────────
    if any(w in msg_lower for w in ["safe", "legit", "legitimate", "real", "mine", "my transaction"]):
        if not txns:
            return f"I don't see any recent transactions for your account yet, {name}."
        t = txns[0]
        score = t.fraud_score or 0
        risk = _risk_label(score)
        if risk == "LOW":
            return (f"✅ Your most recent transaction — **{t.merchant_name or 'Unknown'} ${t.amount:.2f}** — "
                    f"looks safe (score: {score:.0f}/100). No unusual patterns detected.")
        else:
            return (f"⚠️ Your most recent transaction — **{t.merchant_name or 'Unknown'} ${t.amount:.2f}** — "
                    f"has a fraud score of **{score:.0f}/100** ({risk} risk). "
                    f"If you made this purchase, you can confirm it on the Alerts page.")

    # ── Pending alerts ─────────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["alert", "notification", "pending", "review"]):
        if not pending:
            return f"You have no pending alerts right now, {name}. Your account is all clear! ✅"
        return (f"You have **{len(pending)} pending alert(s)**, {name}. "
                f"The most recent one has a fraud score of **{pending[0].fraud_score:.0f}/100**. "
                f"Go to the **Alerts page** to review and take action.")

    # ── Card status ────────────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["card", "freeze", "frozen", "block", "locked"]):
        if not cards:
            return f"You don't have any cards linked yet, {name}. Add one on the Cards page."
        frozen = [c for c in cards if c.status == "BLOCKED"]
        active = [c for c in cards if c.status == "ACTIVE"]
        if frozen:
            return (f"You have **{len(frozen)} frozen card(s)** and **{len(active)} active card(s)**. "
                    f"Go to the **Cards page** or **Security page** to unfreeze a card.")
        return (f"All your cards are active, {name}. "
                f"You can freeze a card instantly from the **Security page** if needed.")

    # ── Spending summary ───────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["spend", "spent", "amount", "total", "how much"]):
        if not txns:
            return f"No transactions found yet, {name}."
        avg = ctx["avg_amount"]
        total = ctx["total_spend"]
        return (f"Based on your last {len(txns)} transactions, {name}: "
                f"you've spent a total of **${total:.2f}** with an average of **${avg:.2f}** per transaction. "
                f"Your highest-risk transaction was **${max(t.amount for t in txns):.2f}**.")

    # ── Security tips ──────────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["tip", "safe", "protect", "secure", "advice", "help"]):
        return (f"Here are some quick security tips, {name}:\n\n"
                f"🔒 **Freeze your card** instantly from the Security page if you suspect compromise.\n"
                f"📍 **Enable Geo-lock** to block transactions from countries you don't visit.\n"
                f"💰 **Set spend limits** per category to cap risky purchases.\n"
                f"🔔 **Keep alerts on** so you're notified the moment something unusual happens.\n"
                f"🚫 **Never share your OTP** — we will never ask for it.")

    # ── High risk summary ──────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["risk", "fraud", "suspicious", "unusual", "anomaly"]):
        if not high_risk:
            return f"No high-risk transactions detected recently, {name}. Your account looks clean! ✅"
        merchants = list({t.merchant_name or "Unknown" for t in high_risk[:3]})
        return (f"I found **{len(high_risk)} high-risk transaction(s)** in your recent history, {name}. "
                f"Flagged merchants include: **{', '.join(merchants)}**. "
                f"Visit the **Alerts page** to review each one.")

    # ── Greeting ───────────────────────────────────────────────────────────────
    if any(w in msg_lower for w in ["hi", "hello", "hey", "hola", "namaste"]):
        alert_note = f" You have **{len(pending)} pending alert(s)** to review." if pending else " Your account looks clear! ✅"
        return (f"Hi {name}! 👋 I'm your FraudGuard AI assistant. I can help you with:\n\n"
                f"• **'Was my last transaction safe?'**\n"
                f"• **'Why was my card flagged?'**\n"
                f"• **'How much have I spent?'**\n"
                f"• **'Show my pending alerts'**\n"
                f"• **'Give me security tips'**\n\n"
                f"{alert_note}")

    # ── Default ────────────────────────────────────────────────────────────────
    return (f"I'm not sure I understood that, {name}. Try asking:\n\n"
            f"• *'Was my last transaction safe?'*\n"
            f"• *'Why was my card flagged?'*\n"
            f"• *'How much have I spent recently?'*\n"
            f"• *'Show my pending alerts'*\n"
            f"• *'Give me security tips'*")


@router.post("")
async def chat(
    body: ChatMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ctx = await _get_context(user, db, body.transaction_id)
    reply = _generate_response(body.message, ctx)
    return {"reply": reply, "timestamp": datetime.utcnow().isoformat()}
