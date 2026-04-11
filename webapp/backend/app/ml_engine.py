"""
Enhanced ML engine with SHAP explanations, feature engineering,
ensemble scoring, and model metrics.
"""
import os, sys, logging, hashlib, math
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque

import numpy as np

logger = logging.getLogger(__name__)

# ── In-memory velocity / behavior stores ──────────────────────────────────────
_velocity: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))
_behavior: Dict[str, Dict] = {}

# ── MCC risk weights ───────────────────────────────────────────────────────────
MCC_RISK = {
    "Gambling": 0.85, "Crypto": 0.80, "Finance": 0.60,
    "Cash": 0.65, "Other": 0.55, "Gaming": 0.45,
    "Travel": 0.30, "Shopping": 0.20, "Food & Drink": 0.10,
    "Grocery": 0.08, "Streaming": 0.05, "Transport": 0.12,
    "Electronics": 0.25, "Fuel": 0.15,
}

HIGH_RISK_COUNTRIES = {"RU", "NG", "RO", "PK", "CN", "BR", "UA", "BY", "KP"}

# ── Feature engineering ────────────────────────────────────────────────────────

def _velocity_count(user_id: str, minutes: int) -> int:
    cutoff = datetime.utcnow() - timedelta(minutes=minutes)
    return sum(1 for ts in _velocity[user_id] if ts > cutoff)


def _amount_zscore(user_id: str, amount: float) -> float:
    hist = _behavior.get(user_id, {}).get("amounts", [])
    if len(hist) < 3:
        return 0.0
    mu = np.mean(hist)
    sigma = np.std(hist) or 1.0
    return (amount - mu) / sigma


def _geo_distance_km(lat1, lon1, lat2, lon2) -> float:
    if None in (lat1, lon1, lat2, lon2):
        return 0.0
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _cyclic_hour(hour: int):
    return math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24)


def _device_hash(device_id: str, ip: str) -> str:
    return hashlib.sha256(f"{device_id}:{ip}".encode()).hexdigest()[:16]


def _is_new_device(user_id: str, device_hash: str) -> bool:
    seen = _behavior.get(user_id, {}).get("devices", set())
    return device_hash not in seen


def build_features(txn: Dict[str, Any]) -> Dict[str, float]:
    uid = txn.get("user_id", "anon")
    amount = float(txn.get("amount", 0))
    hour = datetime.utcnow().hour
    hour_sin, hour_cos = _cyclic_hour(hour)
    dh = _device_hash(txn.get("device_id", ""), txn.get("ip_address", ""))
    last_loc = _behavior.get(uid, {}).get("last_location")
    lat, lon = txn.get("latitude"), txn.get("longitude")
    geo_dist = _geo_distance_km(
        last_loc[0] if last_loc else lat,
        last_loc[1] if last_loc else lon,
        lat, lon
    ) if last_loc and lat and lon else 0.0

    return {
        "amount": amount,
        "amount_zscore": _amount_zscore(uid, amount),
        "velocity_1min": _velocity_count(uid, 1),
        "velocity_1hr": _velocity_count(uid, 60),
        "velocity_24hr": _velocity_count(uid, 1440),
        "geo_distance_km": geo_dist,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "is_new_device": float(_is_new_device(uid, dh)),
        "mcc_risk": MCC_RISK.get(txn.get("merchant_category", "Other"), 0.3),
        "is_high_risk_country": float(txn.get("country", "") in HIGH_RISK_COUNTRIES),
        "hour": hour,
    }


def update_profile(txn: Dict[str, Any]):
    uid = txn.get("user_id", "anon")
    if uid not in _behavior:
        _behavior[uid] = {"amounts": [], "devices": set(), "last_location": None}
    _behavior[uid]["amounts"].append(float(txn.get("amount", 0)))
    if len(_behavior[uid]["amounts"]) > 200:
        _behavior[uid]["amounts"] = _behavior[uid]["amounts"][-200:]
    dh = _device_hash(txn.get("device_id", ""), txn.get("ip_address", ""))
    _behavior[uid]["devices"].add(dh)
    if txn.get("latitude") and txn.get("longitude"):
        _behavior[uid]["last_location"] = (txn["latitude"], txn["longitude"])
    _velocity[uid].append(datetime.utcnow())


# ── Rule-based scoring ─────────────────────────────────────────────────────────

def rule_score(features: Dict[str, float], txn: Dict[str, Any]) -> tuple[float, List[str]]:
    """Returns 0-100 score and list of triggered reasons."""
    score = 0.0
    reasons = []

    if features["velocity_1min"] >= 3:
        score += 30; reasons.append("Multiple transactions in under 1 minute")
    elif features["velocity_1hr"] >= 8:
        score += 20; reasons.append("Unusually high transaction frequency this hour")

    if features["amount_zscore"] > 3:
        score += 25; reasons.append("Amount is far above your usual spending")
    elif features["amount_zscore"] > 2:
        score += 12

    if features["geo_distance_km"] > 500:
        score += 30; reasons.append(f"Transaction {features['geo_distance_km']:.0f} km from last location")
    elif features["geo_distance_km"] > 200:
        score += 15

    if features["is_new_device"]:
        score += 15; reasons.append("Unrecognized device or browser")

    if features["mcc_risk"] > 0.7:
        score += 20; reasons.append(f"High-risk merchant category")
    elif features["mcc_risk"] > 0.5:
        score += 10

    if features["is_high_risk_country"]:
        score += 20; reasons.append(f"Transaction from high-risk country")

    if features["hour"] in range(1, 5):
        score += 8; reasons.append("Transaction at unusual hour (1–5 AM)")

    return min(score, 100.0), reasons


# ── SHAP-style feature importance ─────────────────────────────────────────────

def compute_shap(features: Dict[str, float], final_score: float) -> List[Dict]:
    """
    Approximate SHAP values — weighted contribution of each feature to final score.
    Returns top 5 features sorted by absolute impact.
    """
    weights = {
        "velocity_1min": 0.30, "velocity_1hr": 0.15,
        "amount_zscore": 0.25, "geo_distance_km": 0.30,
        "is_new_device": 0.15, "mcc_risk": 0.20,
        "is_high_risk_country": 0.20, "hour_sin": 0.05,
        "amount": 0.10,
    }
    baseline = 15.0  # average fraud score
    contributions = []
    for feat, w in weights.items():
        val = features.get(feat, 0)
        # Normalize value to 0-1 range per feature
        norm = {
            "velocity_1min": min(val / 5, 1),
            "velocity_1hr": min(val / 10, 1),
            "amount_zscore": min(abs(val) / 4, 1),
            "geo_distance_km": min(val / 1000, 1),
            "is_new_device": val,
            "mcc_risk": val,
            "is_high_risk_country": val,
            "hour_sin": abs(val),
            "amount": min(val / 5000, 1),
        }.get(feat, 0)
        impact = round(w * norm * (final_score - baseline) / 100, 3)
        contributions.append({
            "feature": feat,
            "value": round(val, 3),
            "impact": impact,
            "direction": "increases_risk" if impact > 0 else "decreases_risk",
        })
    contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
    return contributions[:5]


# ── Main scorer ────────────────────────────────────────────────────────────────

def score(txn: Dict[str, Any]) -> Dict[str, Any]:
    features = build_features(txn)
    rule_s, reasons = rule_score(features, txn)

    # Try ML model
    ml_s = 0.0
    try:
        _root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
        if _root not in sys.path:
            sys.path.insert(0, _root)
        from fraud_detection_app.predict import predict_transaction
        import pandas as pd
        if txn.get("ml_features"):
            df = pd.DataFrame([txn["ml_features"]])
            pred = predict_transaction(df)
            ml_s = pred["fraud_probability"] * 100
    except Exception:
        pass

    # Ensemble: 60% rules + 40% ML (or 100% rules if no ML)
    final = (rule_s * 0.6 + ml_s * 0.4) if ml_s > 0 else rule_s

    if final >= 70:
        risk = "HIGH"
    elif final >= 35:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    shap_vals = compute_shap(features, final)
    update_profile(txn)

    return {
        "fraud_score": round(final, 1),
        "risk_level": risk,
        "reason": "; ".join(reasons) if reasons else "Automated risk assessment",
        "shap": shap_vals,
        "features": features,
        "ml_score": round(ml_s, 1),
        "rule_score": round(rule_s, 1),
    }
