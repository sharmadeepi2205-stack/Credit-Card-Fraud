"""
Inject realistic demo transactions + fraud alerts into the SQLite DB.
Run from webapp/backend/: python inject_transactions.py
"""
import sqlite3, uuid, json
from datetime import datetime, timedelta
import random

DB = "fraudguard.db"

USER_ID  = "1dc2ed46-aa48-427a-8faa-96b28c933a55"   # demo@fraudguard.dev
CARD_ID  = "d2f7480b-9b36-4699-8641-75ea3da92bb1"

now = datetime.utcnow()

# (merchant, category, country, amount, risk_level, fraud_score, reason, is_fraud)
TRANSACTIONS = [
    # ── Normal transactions ────────────────────────────────────────────────────
    ("Amazon",          "Shopping",     "US",  45.99,  "LOW",    8.2,  None, False),
    ("Starbucks",       "Food & Drink", "US",   6.50,  "LOW",    4.1,  None, False),
    ("Netflix",         "Streaming",    "US",  15.99,  "LOW",    3.7,  None, False),
    ("Walmart",         "Grocery",      "US",  87.34,  "LOW",   11.0,  None, False),
    ("Uber",            "Transport",    "US",  22.10,  "LOW",    9.5,  None, False),
    ("Spotify",         "Streaming",    "US",   9.99,  "LOW",    2.8,  None, False),
    ("Target",          "Shopping",     "US",  63.20,  "LOW",   12.3,  None, False),
    ("Shell",           "Fuel",         "US",  54.00,  "LOW",   14.1,  None, False),
    ("Whole Foods",     "Grocery",      "US",  112.45, "LOW",    7.9,  None, False),
    ("Apple Store",     "Electronics",  "US",  29.99,  "LOW",    6.2,  None, False),

    # ── Medium risk ────────────────────────────────────────────────────────────
    ("AliExpress",      "Shopping",     "CN",  199.00, "MEDIUM", 52.4,
     "Transaction from unusual country", False),
    ("Steam",           "Gaming",       "RU",  49.99,  "MEDIUM", 47.8,
     "New device fingerprint detected", False),
    ("Booking.com",     "Travel",       "DE",  340.00, "MEDIUM", 55.1,
     "Large amount + new location", False),
    ("Zara Online",     "Shopping",     "FR",  178.50, "MEDIUM", 48.3,
     "BIN country mismatch", False),
    ("Grab",            "Transport",    "SG",  31.20,  "MEDIUM", 44.7,
     "Unusual spending pattern", False),

    # ── High risk / Fraud detected ─────────────────────────────────────────────
    ("Unknown Merchant","Other",        "RU", 2499.99, "HIGH",   91.3,
     "Large amount + new country + unrecognized device", True),
    ("CryptoExchange",  "Finance",      "CN", 1800.00, "HIGH",   88.7,
     "Rapid transaction burst detected; BIN country mismatch", True),
    ("Dark Web Store",  "Other",        "RO",  999.00, "HIGH",   94.1,
     "Impossible travel velocity detected; unusual spending pattern", True),
    ("FX Transfer",     "Finance",      "NG", 3200.00, "HIGH",   89.5,
     "Large amount + new country; repeated failed authorizations", True),
    ("ATM Withdrawal",  "Cash",         "BR",  500.00, "HIGH",   76.2,
     "Rapid transaction burst; geo-velocity anomaly", True),
    ("Online Casino",   "Gambling",     "MT",  750.00, "HIGH",   82.9,
     "Unusual spending pattern; new device fingerprint", True),
    ("Wire Transfer",   "Finance",      "PK", 4500.00, "HIGH",   96.4,
     "Large amount + new country; impossible travel velocity", True),
    ("Gift Cards",      "Shopping",     "US",  800.00, "HIGH",   78.3,
     "Rapid transaction burst detected; high-value gift card purchase", True),
    ("Luxury Goods",    "Shopping",     "AE", 5200.00, "HIGH",   93.7,
     "Large amount + new country; BIN country mismatch", True),
    ("Forex Platform",  "Finance",      "CY", 2100.00, "HIGH",   85.6,
     "Unusual spending pattern; unrecognized device", True),
]

conn = sqlite3.connect(DB)
cur  = conn.cursor()

txn_ids = []
for i, (merchant, category, country, amount, risk, score, reason, is_fraud) in enumerate(TRANSACTIONS):
    txn_id = str(uuid.uuid4())
    txn_ids.append((txn_id, risk, score, reason, merchant, amount))
    ts = (now - timedelta(hours=random.randint(1, 168))).isoformat()   # last 7 days

    cur.execute("""
        INSERT INTO transactions
          (id, card_id, user_id, amount, merchant_name, merchant_category,
           country, fraud_score, risk_level, is_fraud, timestamp)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, (txn_id, CARD_ID, USER_ID, amount, merchant, category,
          country, score, risk, 1 if is_fraud else 0, ts))

# Create fraud alerts for MEDIUM and HIGH risk
alert_count = 0
for txn_id, risk, score, reason, merchant, amount in txn_ids:
    if risk in ("MEDIUM", "HIGH"):
        alert_id = str(uuid.uuid4())
        status = "PENDING"
        ts = (now - timedelta(hours=random.randint(1, 48))).isoformat()
        cur.execute("""
            INSERT INTO fraud_alerts
              (id, user_id, card_id, transaction_id, fraud_score,
               risk_level, reason, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (alert_id, USER_ID, CARD_ID, txn_id, score,
              risk, reason, status, ts))
        alert_count += 1

conn.commit()
conn.close()

print(f"Inserted {len(TRANSACTIONS)} transactions and {alert_count} fraud alerts.")
print("Breakdown:")
print(f"  LOW risk:    {sum(1 for t in TRANSACTIONS if t[4]=='LOW')}")
print(f"  MEDIUM risk: {sum(1 for t in TRANSACTIONS if t[4]=='MEDIUM')}")
print(f"  HIGH risk:   {sum(1 for t in TRANSACTIONS if t[4]=='HIGH')}")
