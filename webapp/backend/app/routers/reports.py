"""PDF fraud report generation."""
import io
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import User, Transaction, FraudAlert, Card
from app.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/pdf")
async def generate_pdf(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.units import cm
    except ImportError:
        return {"error": "reportlab not installed. Run: pip install reportlab"}

    # Fetch data
    txn_r = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
        .order_by(desc(Transaction.timestamp)).limit(50)
    )
    txns = txn_r.scalars().all()

    alert_r = await db.execute(
        select(FraudAlert).where(FraudAlert.user_id == user.id)
        .order_by(desc(FraudAlert.created_at)).limit(20)
    )
    alerts = alert_r.scalars().all()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm,
                             leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    navy = colors.HexColor("#0F172A")
    blue = colors.HexColor("#3B82F6")
    red  = colors.HexColor("#EF4444")
    green = colors.HexColor("#10B981")
    amber = colors.HexColor("#F59E0B")

    title_style = ParagraphStyle("title", parent=styles["Title"],
                                  textColor=navy, fontSize=22, spaceAfter=4)
    sub_style   = ParagraphStyle("sub", parent=styles["Normal"],
                                  textColor=colors.HexColor("#64748B"), fontSize=10)
    h2_style    = ParagraphStyle("h2", parent=styles["Heading2"],
                                  textColor=navy, fontSize=13, spaceBefore=14, spaceAfter=6)
    body_style  = ParagraphStyle("body", parent=styles["Normal"], fontSize=9, leading=14)

    story = []

    # Header
    story.append(Paragraph("🛡️ FraudGuard", title_style))
    story.append(Paragraph(f"Fraud Detection Report — {user.full_name}", sub_style))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}", sub_style))
    story.append(HRFlowable(width="100%", thickness=1, color=blue, spaceAfter=12))

    # Summary stats
    high = sum(1 for t in txns if t.risk_level == "HIGH")
    med  = sum(1 for t in txns if t.risk_level == "MEDIUM")
    low  = sum(1 for t in txns if t.risk_level == "LOW")
    total_spend = sum(t.amount for t in txns)
    pending_alerts = sum(1 for a in alerts if a.status == "PENDING")

    story.append(Paragraph("Summary", h2_style))
    summary_data = [
        ["Metric", "Value"],
        ["Total Transactions Analysed", str(len(txns))],
        ["Total Spend", f"${total_spend:,.2f}"],
        ["High Risk Transactions", str(high)],
        ["Medium Risk Transactions", str(med)],
        ["Low Risk Transactions", str(low)],
        ["Pending Alerts", str(pending_alerts)],
        ["Fraud Rate", f"{(high/len(txns)*100):.1f}%" if txns else "0%"],
    ]
    t = Table(summary_data, colWidths=[10*cm, 6*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), blue),
        ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
        ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID",       (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING",    (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))

    # High-risk transactions table
    if high > 0:
        story.append(Paragraph("High Risk Transactions", h2_style))
        hr_txns = [t for t in txns if t.risk_level == "HIGH"]
        rows = [["Merchant", "Amount", "Score", "Country", "Date"]]
        for tx in hr_txns[:15]:
            rows.append([
                tx.merchant_name or "Unknown",
                f"${tx.amount:.2f}",
                f"{tx.fraud_score:.0f}/100" if tx.fraud_score else "—",
                tx.country or "—",
                tx.timestamp.strftime("%d %b %Y") if tx.timestamp else "—",
            ])
        ht = Table(rows, colWidths=[5*cm, 3*cm, 2.5*cm, 2.5*cm, 3*cm])
        ht.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), red),
            ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
            ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",   (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#FFF5F5")]),
            ("GRID",       (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING",    (0,0), (-1,-1), 5),
        ]))
        story.append(ht)
        story.append(Spacer(1, 0.4*cm))

    # Recent alerts
    if alerts:
        story.append(Paragraph("Recent Fraud Alerts", h2_style))
        a_rows = [["Risk", "Score", "Status", "Reason", "Date"]]
        for a in alerts[:10]:
            a_rows.append([
                a.risk_level or "—",
                f"{a.fraud_score:.0f}" if a.fraud_score else "—",
                a.status or "—",
                (a.reason or "—")[:50],
                a.created_at.strftime("%d %b %Y") if a.created_at else "—",
            ])
        at = Table(a_rows, colWidths=[2*cm, 2*cm, 3*cm, 7*cm, 3*cm])
        at.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), amber),
            ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
            ("FONTNAME",   (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",   (0,0), (-1,-1), 8),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#FFFBEB")]),
            ("GRID",       (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING",    (0,0), (-1,-1), 5),
        ]))
        story.append(at)

    # Footer
    story.append(Spacer(1, 0.8*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0")))
    story.append(Paragraph(
        "This report is generated by FraudGuard and is intended for personal security review only. "
        "For disputes or compliance queries, contact your card issuer.",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=7,
                       textColor=colors.HexColor("#94A3B8"), spaceBefore=6)
    ))

    doc.build(story)
    buf.seek(0)
    filename = f"fraudguard_report_{user.full_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})
