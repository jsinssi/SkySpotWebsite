"""
SkySpot ML predictor — loads model.pkl once at import time, exposes helpers
for building feature rows from calendar_days records and generating a full
Mon–Fri hourly forecast for the current ISO week.
"""
import logging
import pathlib
import pickle
from datetime import date, datetime, timedelta, timezone

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_MODEL_PATH = pathlib.Path(__file__).parent / "model.pkl"

try:
    with open(_MODEL_PATH, "rb") as _f:
        _model = pickle.load(_f)
    logger.info("ML model loaded from %s", _MODEL_PATH)
except Exception as exc:
    _model = None
    logger.error("Failed to load ML model: %s", exc)

# Feature column order must match the MLmodel signature exactly
_FEATURE_COLS = [
    "hour_of_day", "day_of_week", "month", "is_weekend",
    "is_lecture_week", "is_exam_period", "is_reading_week",
    "is_mid_sem_break", "is_bank_holiday", "is_easter_break",
    "is_christmas_break", "campus_open", "expected_parking_impact_pct",
    "semester", "temp_mean_c", "temp_max_c", "precip_mm",
    "wind_max_ms", "weather_code",
]

# Hours covered by the forecast (6 AM inclusive to 10 PM inclusive)
FORECAST_HOURS = list(range(6, 23))  # 17 slots

# Hours shown in the heat map (7 AM to 5 PM = 11 slots)
HEATMAP_HOURS = list(range(7, 18))

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"]


def _bool_to_str(value) -> str:
    """Convert a DB boolean (or None) to the string the model expects."""
    if value is None:
        return "False"
    return "True" if value else "False"


def _hour_label(hour: int) -> str:
    if hour == 12:
        return "12PM"
    if hour < 12:
        return f"{hour}AM"
    return f"{hour - 12}PM"


def build_feature_row(cd_row, hour: int) -> dict:
    """
    Build one feature dict from a calendar_days DB row plus an hour offset.
    Handles None values with safe defaults.
    """
    return {
        "hour_of_day": int(hour),
        "day_of_week": int(cd_row.day_of_week or 0),
        "month": int(cd_row.month or 1),
        "is_weekend": bool(cd_row.is_weekend),
        "is_lecture_week": _bool_to_str(cd_row.is_lecture_week),
        "is_exam_period": _bool_to_str(cd_row.is_exam_period),
        "is_reading_week": _bool_to_str(cd_row.is_reading_week),
        "is_mid_sem_break": _bool_to_str(cd_row.is_mid_sem_break),
        "is_bank_holiday": _bool_to_str(cd_row.is_bank_holiday),
        "is_easter_break": _bool_to_str(cd_row.is_easter_break),
        "is_christmas_break": _bool_to_str(cd_row.is_christmas_break),
        "campus_open": bool(cd_row.campus_open) if cd_row.campus_open is not None else True,
        "expected_parking_impact_pct": int(cd_row.expected_parking_impact_pct or 0),
        "semester": int(cd_row.semester or 0),
        "temp_mean_c": float(cd_row.temp_mean_c or 12.0),
        "temp_max_c": float(cd_row.temp_max_c or 15.0),
        "precip_mm": float(cd_row.precip_mm or 1.0),
        "wind_max_ms": float(cd_row.wind_max_ms or 5.0),
        "weather_code": int(cd_row.weather_code or 3),
    }


def generate_week_forecast(calendar_rows: list) -> list[dict]:
    """
    Given calendar_days rows for Mon–Fri, generate hourly occupancy predictions
    for all FORECAST_HOURS (6–22). Returns list of dicts with:
      day_date, day_label, hour, predicted_for (UTC datetime),
      occupancy_pct (clamped 0–100), weather_code
    """
    if _model is None:
        raise RuntimeError("ML model not loaded — check model.pkl exists in backend/")

    results = []
    rows_by_date = {r.day: r for r in calendar_rows}

    for cd_row in sorted(calendar_rows, key=lambda r: r.day):
        day_label = DAY_LABELS[cd_row.day_of_week % 7] if cd_row.day_of_week < 5 else None
        if day_label is None:
            continue  # skip weekends if they sneak in

        feature_rows = []
        hours = []
        for h in FORECAST_HOURS:
            feature_rows.append(build_feature_row(cd_row, h))
            hours.append(h)

        df = pd.DataFrame(feature_rows)[_FEATURE_COLS]
        raw_preds = _model.predict(df)

        # Model may output 0-1 fractions or 0-100 percentages; normalise to 0-100
        raw = np.array(raw_preds, dtype=float)
        if raw.max() <= 1.0:
            raw = raw * 100.0
        raw = np.clip(raw, 0.0, 100.0)

        for i, h in enumerate(hours):
            predicted_for = datetime(
                cd_row.day.year, cd_row.day.month, cd_row.day.day, h, 0, 0,
                tzinfo=timezone.utc,
            )
            results.append({
                "day_date": cd_row.day,
                "day_label": day_label,
                "hour": h,
                "predicted_for": predicted_for,
                "occupancy_pct": round(float(raw[i]), 2),
                "weather_code": int(cd_row.weather_code or 3),
            })

    return results


def build_response(predictions: list[dict], today_date: date) -> dict:
    """
    Shape raw prediction records into the API response dict.
    predictions: output of generate_week_forecast (or rows loaded from ml_predictions)
    """
    # Group by day_label then hour
    by_day: dict[str, dict[int, float]] = {d: {} for d in DAY_LABELS}
    for p in predictions:
        dl = p.get("day_label") or DAY_LABELS[p["predicted_for"].weekday()]
        h = p.get("hour") or p["predicted_for"].hour
        occ = p.get("occupancy_pct") or round(float(p.get("predicted_occupancy_rate", 0)) * 100, 2)
        if dl in by_day:
            by_day[dl][h] = occ

    # today_hourly: today if weekday, else next Monday
    today_wd = today_date.weekday()  # 0=Mon, 6=Sun
    if today_wd < 5:
        today_label = DAY_LABELS[today_wd]
    else:
        today_label = "Mon"

    today_hourly = [
        {"hour": h, "label": _hour_label(h), "occupancy": by_day.get(today_label, {}).get(h, 0.0)}
        for h in FORECAST_HOURS
    ]

    # weekly_heatmap: 11 slots per day (hours 7-17)
    weekly_heatmap = {
        dl: [by_day[dl].get(h, 0.0) for h in HEATMAP_HOURS]
        for dl in DAY_LABELS
    }

    # typical_hourly: mean across all 5 days for each hour slot
    typical_hourly = []
    for h in FORECAST_HOURS:
        vals = [by_day[dl].get(h, 0.0) for dl in DAY_LABELS if by_day[dl].get(h) is not None]
        typical_hourly.append(round(sum(vals) / len(vals), 2) if vals else 0.0)

    # peak_times: derived from today's hourly
    peak_times = _extract_peak_times(today_hourly)

    # generated_at: most recent prediction timestamp
    generated_at = max(
        (p.get("predicted_for") or p.get("created_at") for p in predictions),
        default=datetime.now(timezone.utc),
    )

    return {
        "today_hourly": today_hourly,
        "weekly_heatmap": weekly_heatmap,
        "typical_hourly": typical_hourly,
        "peak_times": peak_times,
        "generated_at": generated_at,
        "data_source": "ml_model",
    }


def _extract_peak_times(today_hourly: list[dict]) -> list[dict]:
    """Find up to 2 high peaks and 1 low valley from today's hourly predictions."""
    if not today_hourly:
        return []

    results = []
    occs = [s["occupancy"] for s in today_hourly]

    # High peaks: top 2 hours above 75%
    high_slots = sorted(
        [s for s in today_hourly if s["occupancy"] >= 75],
        key=lambda s: s["occupancy"],
        reverse=True,
    )[:2]
    # Spread them out — drop second peak if within 2 hours of first
    filtered_high = []
    for slot in high_slots:
        if not filtered_high or abs(slot["hour"] - filtered_high[-1]["hour"]) > 2:
            filtered_high.append(slot)

    for slot in sorted(filtered_high, key=lambda s: s["hour"]):
        occ = slot["occupancy"]
        label = "Very Busy" if occ >= 90 else "Busy"
        results.append({
            "time": slot["label"],
            "label": label,
            "occupancy": occ,
            "level": "high",
        })

    # Low valley: lowest hour below 50% (prefer midday 11-14)
    low_candidates = [s for s in today_hourly if s["occupancy"] < 50]
    midday = [s for s in low_candidates if 11 <= s["hour"] <= 14]
    low_slot = min(midday or low_candidates, key=lambda s: s["occupancy"], default=None)
    if low_slot:
        results.append({
            "time": low_slot["label"],
            "label": "Quieter",
            "occupancy": low_slot["occupancy"],
            "level": "low",
        })

    return results
