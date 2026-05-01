#!/usr/bin/env python3
"""
One-off script: registers the ML model in ml_models and seeds this week's
hourly occupancy predictions into ml_predictions.

Usage (from the backend/ directory):
    DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/skyspot?ssl=require" python seed_forecast.py
"""
import asyncio
import os
import sys
from datetime import date, timedelta, timezone, datetime

import asyncpg

sys.path.insert(0, os.path.dirname(__file__))
from ml_predictor import generate_week_forecast


def _build_asyncpg_dsn(url: str) -> tuple[str, bool]:
    """Strip SQLAlchemy prefix and extract ssl flag for asyncpg."""
    needs_ssl = "ssl=require" in url
    dsn = url.replace("postgresql+asyncpg://", "postgresql://")
    dsn = dsn.split("?")[0]
    return dsn, needs_ssl


class _Row:
    """Wrap an asyncpg Record as a simple attribute object for ml_predictor."""
    def __init__(self, record):
        for k, v in record.items():
            setattr(self, k, v)


async def main():
    raw_url = os.getenv("DATABASE_URL", "")
    if not raw_url or "CHANGE_ME" in raw_url:
        print("ERROR: Set DATABASE_URL to the real connection string, e.g.:")
        print('  DATABASE_URL="postgresql+asyncpg://user:pass@host/db?ssl=require" python seed_forecast.py')
        sys.exit(1)

    dsn, needs_ssl = _build_asyncpg_dsn(raw_url)
    print(f"Connecting to database...")
    conn = await asyncpg.connect(dsn, ssl="require" if needs_ssl else None)
    print("Connected.\n")

    try:
        # ── Step 1: register model in ml_models ──────────────────────────────
        existing = await conn.fetchrow(
            "SELECT model_id FROM ml_models WHERE model_name = $1 AND version = $2",
            "skyspot-occupancy-automl", "1.0",
        )
        if existing:
            model_id = existing["model_id"]
            await conn.execute(
                "UPDATE ml_models SET is_active = true, artifact_path = $1 WHERE model_id = $2",
                "/app/backend/model.pkl", model_id,
            )
            print(f"[ml_models] Already registered — model_id={model_id}, marked active.")
        else:
            model_id = await conn.fetchval("""
                INSERT INTO ml_models
                    (model_name, model_type, version, artifact_path,
                     is_active, trained_at, notes)
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                RETURNING model_id
            """,
                "skyspot-occupancy-automl", "sklearn", "1.0",
                "/app/backend/model.pkl", True,
                datetime(2026, 4, 23, 17, 18, 51, tzinfo=timezone.utc),
                "Azure ML AutoML, 19 features, predicts lot-level occupancy pct",
            )
            print(f"[ml_models] Registered new model — model_id={model_id}")

        # ── Step 2: fetch calendar_days for Mon–Fri this week ────────────────
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        friday = monday + timedelta(days=4)
        print(f"\n[calendar_days] Fetching rows for {monday} – {friday}...")

        records = await conn.fetch("""
            SELECT day, day_of_week, month, is_weekend, semester,
                   is_lecture_week, is_exam_period, is_reading_week, is_mid_sem_break,
                   is_bank_holiday, is_easter_break, is_christmas_break,
                   campus_open, expected_parking_impact_pct,
                   temp_mean_c, temp_max_c, precip_mm, wind_max_ms, weather_code
            FROM calendar_days
            WHERE day >= $1 AND day <= $2
            ORDER BY day
        """, monday, friday)

        if not records:
            print(f"ERROR: No calendar_days rows found for {monday}–{friday}.")
            print("Make sure your calendar_days table is populated for this week.")
            sys.exit(1)

        print(f"[calendar_days] Found {len(records)} rows.")

        # ── Step 3: run ML predictions ────────────────────────────────────────
        print("\n[ml_predictor] Running model predictions (this may take a moment)...")
        cal_rows = [_Row(r) for r in records]
        predictions = generate_week_forecast(cal_rows)
        print(f"[ml_predictor] Generated {len(predictions)} predictions.")

        # ── Step 4: delete stale + insert new ────────────────────────────────
        friday_end = friday + timedelta(days=1)
        result = await conn.execute("""
            DELETE FROM ml_predictions
            WHERE space_id IS NULL
              AND predicted_for >= $1
              AND predicted_for < $2
        """, monday, friday_end)
        print(f"\n[ml_predictions] Cleared old aggregate rows: {result}")

        async with conn.transaction():
            for p in predictions:
                await conn.execute("""
                    INSERT INTO ml_predictions
                        (model_id, predicted_for, space_id, predicted_status,
                         predicted_occupancy_rate, prediction_confidence)
                    VALUES ($1,$2,NULL,NULL,$3,NULL)
                """,
                    model_id,
                    p["predicted_for"],
                    round(p["occupancy_pct"] / 100.0, 6),
                )

        print(f"[ml_predictions] Inserted {len(predictions)} rows. ✓")

        # ── Summary ───────────────────────────────────────────────────────────
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM ml_predictions WHERE space_id IS NULL"
        )
        sample = await conn.fetch("""
            SELECT TO_CHAR(predicted_for, 'Dy HH24:MI') AS slot,
                   ROUND((predicted_occupancy_rate * 100)::numeric, 1) AS pct
            FROM ml_predictions
            WHERE space_id IS NULL
            ORDER BY predicted_for
            LIMIT 5
        """)
        print(f"\nTotal aggregate rows in ml_predictions: {count}")
        print("Sample predictions:")
        for row in sample:
            print(f"  {row['slot']}  →  {row['pct']}%")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
