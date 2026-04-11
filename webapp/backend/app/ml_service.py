"""
ML service — wraps the existing fraud_detection_app engine.
Falls back to a lightweight rule-only scorer if the model isn't available.
"""
import os
import sys
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Allow importing from the repo root fraud_detection_app package
_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

# Also try one level up (when running from webapp/backend/)
_alt_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
if _alt_root not in sys.path:
    sys.path.insert(0, _alt_root)

try:
    from fraud_detection_app.predict import predict_transaction, prepare_input, load_model
    from fraud_detection_app.risk_engine import combine_risk_scores, categorize_risk, add_transaction, get_burst_risk
    from fraud_detection_app.geo_velocity import calculate_velocity_risk
    from fraud_detection_app.device_fingerprint import get_device_risk_score
    from fraud_detection_app.behavior_profile import get_deviation_score, update_profile
    from fraud_detection_app.anomaly_detection import load_anomaly_detector, detect_anomaly
    _ENGINE_AVAILABLE = True
    logger.info("fraud_detection_app engine loaded successfully")
except Exception as e:
    _ENGINE_AVAILABLE = False
    logger.warning(f"fraud_detection_app engine not available: {e}. Using rule-only fallback.")

# ── BIN lookup (mock) ──────────────────────────────────────────────────────────

BIN_MAP: Dict[str, Dict] = {
    "411111": {"issuer": "Chase", "country": "US", "brand": "VISA"},
    "555555": {"issuer": "Citi", "country": "US", "brand": "MASTERCARD"},
    "378282": {"issuer": "AmEx", "country": "US", "brand": "AMEX"},
    "601100": {"issuer": "Discover", "country": "US", "brand": "DISCOVER"},
    "400000": {"issuer": "HSBC", "country": "GB", "brand": "VISA"},
    "510510": {"issuer": "Barclays", "country": "GB", "brand": "MASTERCARD"},
}


def lookup_bin(bin_prefix: Optional[str]) -> Dict:
    if not bin_prefix:
        return {}
    return BIN_MAP.get(bin_prefix[:6], {"issuer": "Unknown", "country": "Unknown", "brand": "Unknown"})


# ── Rule-only fallback scorer ──────────────────────────────────────────────────

def _rule_only_score(txn: Dict[str, Any]) -> float:
    """Simple heuristic score 0-1 when ML model is unavailable."""
    score = 0.0
    amount = txn.get("amount", 0)
    if amount > 5000:
        score += 0.5
    elif amount > 1000:
        score += 0.2
    if txn.get("country") and txn.get("bin_country") and txn["country"] != txn["bin_country"]:
        score += 0.3
    return min(score, 1.0)


# ── Main scoring function ──────────────────────────────────────────────────────

def score_transaction(txn: Dict[str, Any]) -> Dict[str, Any]:
    """
    Score a transaction and return fraud_score (0-100), risk_level, reason.

    txn keys expected:
        user_id, amount, merchant_name, merchant_category,
        ip_address, device_id, user_agent, latitude, longitude, country,
        ml_features (dict with V1-V28 + Time — optional)
    """
    result = {
        "fraud_score": 0.0,
        "risk_level": "LOW",
        "reason": "",
        "bin_info": lookup_bin(txn.get("bin_prefix")),
    }

    reasons = []

    if _ENGINE_AVAILABLE and txn.get("ml_features"):
        try:
            import pandas as pd
            features_df = pd.DataFrame([txn["ml_features"]])
            pred = predict_transaction(features_df)
            ml_prob = pred["fraud_probability"]
        except Exception as e:
            logger.warning(f"ML prediction failed: {e}")
            ml_prob = _rule_only_score(txn)
    else:
        ml_prob = _rule_only_score(txn)

    # Rule scores (0-100)
    rule_scores: Dict[str, float] = {
        "behavior_deviation": 0,
        "geo_velocity": 0,
        "burst_detection": 0,
        "anomaly_score": 0,
        "device_risk": 0,
    }

    if _ENGINE_AVAILABLE:
        try:
            rule_scores["burst_detection"] = get_burst_risk(txn.get("user_id", "anon"))
            if rule_scores["burst_detection"] > 40:
                reasons.append("Rapid transaction burst detected")
        except Exception:
            pass

        try:
            if txn.get("latitude") and txn.get("longitude"):
                # Use a fixed "last location" offset to simulate velocity check
                current_loc = (txn["latitude"], txn["longitude"])
                last_loc = (txn["latitude"] + 0.01, txn["longitude"] + 0.01)
                rule_scores["geo_velocity"] = calculate_velocity_risk(last_loc, current_loc, 30)
                if rule_scores["geo_velocity"] > 60:
                    reasons.append("Impossible travel velocity detected")
        except Exception:
            pass

        try:
            from fraud_detection_app.device_fingerprint import generate_device_fingerprint, is_device_trusted
            fp = generate_device_fingerprint(
                txn.get("ip_address", "unknown"),
                txn.get("device_id", "unknown"),
                txn.get("user_agent", "unknown"),
            )
            trusted = is_device_trusted(txn.get("user_id", "anon"), fp)
            rule_scores["device_risk"] = get_device_risk_score(txn.get("user_id", "anon"), fp, trusted)
            if rule_scores["device_risk"] > 40:
                reasons.append("Unrecognized device fingerprint")
        except Exception:
            pass

        try:
            rule_scores["behavior_deviation"] = get_deviation_score(
                txn.get("user_id", "anon"),
                {"Amount": txn.get("amount", 0), "location": txn.get("country", "unknown")},
            )
            if rule_scores["behavior_deviation"] > 60:
                reasons.append("Unusual spending pattern")
        except Exception:
            pass

        try:
            final_score = combine_risk_scores(ml_prob, rule_scores)
            risk_cat = categorize_risk(final_score)
        except Exception:
            final_score = ml_prob * 100
            risk_cat = "FRAUD" if final_score > 70 else ("SUSPICIOUS" if final_score > 40 else "SAFE")
    else:
        final_score = ml_prob * 100
        risk_cat = "FRAUD" if final_score > 70 else ("SUSPICIOUS" if final_score > 40 else "SAFE")

    # BIN-country mismatch check
    bin_info = result["bin_info"]
    if bin_info.get("country") and txn.get("country"):
        if bin_info["country"] != txn["country"]:
            final_score = min(final_score + 15, 100)
            reasons.append(f"Card issued in {bin_info['country']} but transaction from {txn['country']}")

    # Map to RiskLevel enum string
    if final_score >= 70:
        risk_level = "HIGH"
    elif final_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    result["fraud_score"] = round(final_score, 2)
    result["risk_level"] = risk_level
    result["reason"] = "; ".join(reasons) if reasons else "Automated risk assessment"

    # Update behavior profile
    if _ENGINE_AVAILABLE:
        try:
            add_transaction({"user_id": txn.get("user_id"), "Amount": txn.get("amount", 0)})
            update_profile(txn.get("user_id", "anon"), txn.get("amount", 0))
        except Exception:
            pass

    return result
