"""Notification service — email (mock/SMTP) + in-app WebSocket push."""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.config import get_settings
from app.websocket_manager import manager

settings = get_settings()
logger = logging.getLogger(__name__)


async def send_in_app(user_id: str, alert_id: str, risk_level: str,
                      amount: float, reason: str, fraud_score: float):
    payload = {
        "type": "FRAUD_ALERT",
        "alert_id": alert_id,
        "risk_level": risk_level,
        "amount": amount,
        "reason": reason,
        "fraud_score": fraud_score,
    }
    await manager.send_to_user(user_id, payload)
    await manager.broadcast_admin({"type": "ADMIN_ALERT", "user_id": user_id, **payload})


def send_email_alert(to_email: str, subject: str, body: str):
    """Send email via SMTP. Logs to console in dev mode."""
    if settings.environment == "development" or not settings.smtp_user:
        logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}\n{body}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.from_email
        msg["To"] = to_email
        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.sendmail(settings.from_email, to_email, msg.as_string())
    except Exception as e:
        logger.error(f"Email send failed: {e}")


def send_otp_email(to_email: str, otp_code: str, purpose: str = "login"):
    subject = "Your FraudGuard OTP Code"
    body = f"""
    <h2>FraudGuard Security Code</h2>
    <p>Your one-time password for <strong>{purpose}</strong> is:</p>
    <h1 style="letter-spacing:8px">{otp_code}</h1>
    <p>This code expires in {settings.otp_expire_minutes} minutes.</p>
    <p>If you did not request this, please contact support immediately.</p>
    """
    send_email_alert(to_email, subject, body)


def send_fraud_alert_email(to_email: str, amount: float, merchant: Optional[str],
                           risk_level: str, fraud_score: float, reason: str):
    subject = f"⚠️ Suspicious Transaction Detected — {risk_level} Risk"
    body = f"""
    <h2>Fraud Alert</h2>
    <p>A <strong>{risk_level}</strong> risk transaction was detected on your account.</p>
    <table>
      <tr><td><b>Amount</b></td><td>${amount:.2f}</td></tr>
      <tr><td><b>Merchant</b></td><td>{merchant or 'Unknown'}</td></tr>
      <tr><td><b>Fraud Score</b></td><td>{fraud_score:.1f}/100</td></tr>
      <tr><td><b>Reason</b></td><td>{reason}</td></tr>
    </table>
    <p>Log in to your FraudGuard dashboard to review and take action.</p>
    """
    send_email_alert(to_email, subject, body)
