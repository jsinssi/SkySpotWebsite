"""
SkySpot API — v1.4
/api/spaces: finds MAX(generated_at) then fetches all 199 rows for that batch.
/api/forecast/occupancy: ML-driven hourly occupancy forecast for Mon–Fri.
"""
import logging
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from ml_predictor import build_response, generate_week_forecast

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Populated at startup with the active model's pk from ml_models
_active_model_id: Optional[int] = None

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://liamadmin:CHANGE_ME@liam-postgres-server.postgres.database.azure.com:5432/skyspot?ssl=require",
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _active_model_id
    logger.info("SkySpot API starting")
    try:
        async with async_session() as s:
            existing = (await s.execute(text("""
                SELECT model_id FROM ml_models
                WHERE model_name = 'skyspot-occupancy-automl' AND version = '1.0'
                LIMIT 1
            """))).fetchone()
            if existing:
                _active_model_id = existing.model_id
                await s.execute(text(
                    "UPDATE ml_models SET is_active = true, artifact_path = '/app/backend/model.pkl'"
                    " WHERE model_id = :mid"
                ), {"mid": _active_model_id})
            else:
                row = (await s.execute(text("""
                    INSERT INTO ml_models
                        (model_name, model_type, version, artifact_path,
                         is_active, trained_at, notes)
                    VALUES
                        ('skyspot-occupancy-automl', 'sklearn', '1.0',
                         '/app/backend/model.pkl', true,
                         '2026-04-23 17:18:51+00',
                         'Azure ML AutoML, 19 features, predicts lot-level occupancy pct')
                    RETURNING model_id
                """))).fetchone()
                if row:
                    _active_model_id = row.model_id
            await s.commit()
            logger.info("ML model registered in ml_models with id=%s", _active_model_id)
    except Exception as exc:
        logger.warning("Could not register ML model in DB: %s", exc)
    yield
    await engine.dispose()


app = FastAPI(title="SkySpot API", version="1.3.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SpaceStatus(BaseModel):
    space_id: str
    status: str
    confidence: Optional[float] = None
    observed_at: Optional[datetime] = None
    data_source: str


class SpacesResponse(BaseModel):
    spaces: List[SpaceStatus]
    total: int
    occupied: int
    vacant: int
    unknown: int
    last_updated: Optional[datetime] = None
    data_source: str


class WeatherCurrent(BaseModel):
    recorded_at: datetime
    temperature_c: Optional[float] = None
    feels_like_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    wind_speed_ms: Optional[float] = None
    wind_dir_deg: Optional[float] = None
    precipitation_mm: Optional[float] = None
    weather_code: Optional[int] = None
    description: Optional[str] = None
    is_forecast: bool = False


class WeatherForecastDay(BaseModel):
    forecast_date: str
    temp_max_c: Optional[float] = None
    temp_min_c: Optional[float] = None
    precipitation_sum_mm: Optional[float] = None
    precipitation_prob_max: Optional[float] = None
    wind_speed_max_ms: Optional[float] = None
    weather_code: Optional[int] = None
    description: Optional[str] = None
    sunrise: Optional[str] = None
    sunset: Optional[str] = None


class WeatherHourlySlot(BaseModel):
    recorded_at: datetime
    temperature_c: Optional[float] = None
    weather_code: Optional[int] = None
    description: Optional[str] = None
    precipitation_mm: Optional[float] = None
    wind_speed_ms: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    db_connected: bool


class HourlySlot(BaseModel):
    hour: int
    label: str
    occupancy: float


class PeakTime(BaseModel):
    time: str
    label: str
    occupancy: float
    level: str  # "high" | "low"


class ForecastResponse(BaseModel):
    today_hourly: List[HourlySlot]
    weekly_heatmap: Dict[str, List[float]]
    typical_hourly: List[float]
    peak_times: List[PeakTime]
    generated_at: datetime
    data_source: str


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    try:
        async with async_session() as s:
            await s.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        logger.warning("DB health check failed: %s", exc)
        db_ok = False
    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        service="skyspot-api",
        db_connected=db_ok,
    )


# ── Spaces ────────────────────────────────────────────────────────────────────

@app.get("/api/spaces", response_model=SpacesResponse)
async def get_spaces():
    """
    Step 1: SELECT MAX(generated_at) FROM occupancy_generated  — instant with index
    Step 2: SELECT all rows WHERE generated_at = <that timestamp> — 199 rows, instant
    Step 3: Overlay any real drone data from occupancy_real (small table)
    """
    try:
        async with async_session() as session:

            # 1. Most recent generated batch timestamp
            max_ts_row = (await session.execute(text(
                "SELECT MAX(generated_at) AS max_ts FROM occupancy_generated"
            ))).fetchone()
            max_ts = max_ts_row.max_ts if max_ts_row else None

            # 2. All 199 rows for that batch
            if max_ts:
                gen_rows = (await session.execute(text(
                    "SELECT space_id, status, confidence, generated_at AS observed_at, "
                    "'generated' AS data_source "
                    "FROM occupancy_generated "
                    "WHERE generated_at = :ts"
                ), {"ts": max_ts})).fetchall()
            else:
                gen_rows = []

            # 3. Latest real drone observation per space (small table, always fast)
            real_rows = (await session.execute(text("""
                SELECT DISTINCT ON (space_id)
                    space_id, status, confidence, observed_at, 'real' AS data_source
                FROM occupancy_real
                ORDER BY space_id, observed_at DESC
            """))).fetchall()

        # Merge — real takes priority over generated
        real_map = {r.space_id: r for r in real_rows}
        gen_map  = {r.space_id: r for r in gen_rows}
        all_ids  = sorted(set(real_map) | set(gen_map))

        result: List[SpaceStatus] = []
        last_updated: Optional[datetime] = None
        real_count = gen_count = 0

        for sid in all_ids:
            row = real_map.get(sid) or gen_map.get(sid)
            if not row:
                continue
            if row.data_source == "real":
                real_count += 1
            else:
                gen_count += 1
            obs = row.observed_at
            if obs and (last_updated is None or obs > last_updated):
                last_updated = obs
            result.append(SpaceStatus(
                space_id=sid,
                status=row.status,
                confidence=row.confidence,
                observed_at=obs,
                data_source=row.data_source,
            ))

        occupied = sum(1 for s in result if s.status == "occupied")
        vacant   = sum(1 for s in result if s.status == "vacant")
        unknown  = sum(1 for s in result if s.status == "unknown")

        return SpacesResponse(
            spaces=result,
            total=len(result),
            occupied=occupied,
            vacant=vacant,
            unknown=unknown,
            last_updated=last_updated,
            data_source="real" if real_count >= gen_count else "generated",
        )

    except Exception as exc:
        logger.exception("Failed to fetch spaces")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Weather ───────────────────────────────────────────────────────────────────

@app.get("/api/weather/current", response_model=WeatherCurrent)
async def get_weather_current():
    try:
        async with async_session() as session:
            row = (await session.execute(text("""
                SELECT recorded_at, temperature_c, feels_like_c, humidity_pct,
                       wind_speed_ms, wind_dir_deg, precipitation_mm, weather_code, description, is_forecast
                FROM weather_hourly
                WHERE recorded_at BETWEEN now() - interval '3 hours' AND now() + interval '2 hours'
                ORDER BY ABS(EXTRACT(EPOCH FROM (recorded_at - now())))
                LIMIT 1
            """))).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No weather data yet")
        return WeatherCurrent(**row._mapping)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch current weather")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/weather/forecast", response_model=List[WeatherForecastDay])
async def get_weather_forecast():
    try:
        async with async_session() as session:
            rows = (await session.execute(text("""
                SELECT forecast_date::text, temp_max_c, temp_min_c,
                       precipitation_sum_mm, precipitation_prob_max,
                       wind_speed_max_ms, weather_code, description,
                       sunrise::text, sunset::text
                FROM weather_daily
                WHERE forecast_date >= CURRENT_DATE
                ORDER BY forecast_date LIMIT 7
            """))).fetchall()
        return [WeatherForecastDay(**r._mapping) for r in rows]
    except Exception as exc:
        logger.exception("Failed to fetch forecast")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/weather/hourly", response_model=List[WeatherHourlySlot])
async def get_weather_hourly():
    try:
        async with async_session() as session:
            rows = (await session.execute(text("""
                SELECT recorded_at, temperature_c, weather_code, description,
                       precipitation_mm, wind_speed_ms
                FROM weather_hourly
                WHERE recorded_at >= now() - interval '1 hour'
                  AND recorded_at <= now() + interval '26 hours'
                ORDER BY recorded_at
                LIMIT 28
            """))).fetchall()
        return [WeatherHourlySlot(**r._mapping) for r in rows]
    except Exception as exc:
        logger.exception("Failed to fetch hourly weather")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Forecast ──────────────────────────────────────────────────────────────────

def _week_monday(ref: date) -> date:
    """Return the Monday of the ISO week containing ref."""
    return ref - timedelta(days=ref.weekday())


async def _load_or_generate_forecast(session: AsyncSession, force: bool = False) -> dict:
    """
    Return a forecast response dict. Uses cached ml_predictions rows when fresh
    (generated today). Regenerates when stale, missing, or force=True.
    """
    today = date.today()
    monday = _week_monday(today)
    friday = monday + timedelta(days=4)

    # Check for cached predictions for this week (space_id IS NULL = aggregate)
    if not force:
        cached = (await session.execute(text("""
            SELECT p.predicted_for, p.predicted_occupancy_rate, p.created_at
            FROM ml_predictions p
            WHERE p.space_id IS NULL
              AND p.predicted_for >= :monday
              AND p.predicted_for < :friday_end
              AND DATE(p.created_at AT TIME ZONE 'UTC') = :today
            ORDER BY p.predicted_for
        """), {
            "monday": monday,
            "friday_end": friday + timedelta(days=1),
            "today": today,
        })).fetchall()

        if cached:
            logger.info("Returning %d cached forecast rows", len(cached))
            preds = [
                {
                    "predicted_for": r.predicted_for,
                    "predicted_occupancy_rate": r.predicted_occupancy_rate,
                    "day_label": None,  # build_response derives from weekday()
                    "created_at": r.created_at,
                }
                for r in cached
            ]
            return build_response(preds, today)

    # Fetch calendar_days rows for Mon–Fri of this week
    cal_rows = (await session.execute(text("""
        SELECT day, day_of_week, month, is_weekend, semester,
               is_lecture_week, is_exam_period, is_reading_week, is_mid_sem_break,
               is_bank_holiday, is_easter_break, is_christmas_break,
               campus_open, expected_parking_impact_pct,
               temp_mean_c, temp_max_c, precip_mm, wind_max_ms, weather_code
        FROM calendar_days
        WHERE day >= :monday AND day <= :friday
        ORDER BY day
    """), {"monday": monday, "friday": friday})).fetchall()

    if not cal_rows:
        raise HTTPException(status_code=503, detail="No calendar_days rows found for this week")

    predictions = generate_week_forecast(cal_rows)

    # Delete stale aggregate predictions for this week then bulk insert
    await session.execute(text("""
        DELETE FROM ml_predictions
        WHERE space_id IS NULL
          AND predicted_for >= :monday
          AND predicted_for < :friday_end
    """), {"monday": monday, "friday_end": friday + timedelta(days=1)})

    model_id = _active_model_id
    for p in predictions:
        await session.execute(text("""
            INSERT INTO ml_predictions
                (model_id, predicted_for, space_id, predicted_status,
                 predicted_occupancy_rate, prediction_confidence)
            VALUES
                (:model_id, :predicted_for, NULL, NULL, :occ_rate, NULL)
        """), {
            "model_id": model_id,
            "predicted_for": p["predicted_for"],
            "occ_rate": round(p["occupancy_pct"] / 100.0, 6),
        })
    await session.commit()
    logger.info("Stored %d forecast predictions in ml_predictions", len(predictions))

    return build_response(predictions, today)


@app.get("/api/forecast/occupancy", response_model=ForecastResponse)
async def get_forecast_occupancy():
    try:
        async with async_session() as session:
            return await _load_or_generate_forecast(session)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Forecast generation failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/forecast/refresh", response_model=ForecastResponse)
async def refresh_forecast():
    """Force-regenerate this week's ML predictions regardless of cache."""
    try:
        async with async_session() as session:
            return await _load_or_generate_forecast(session, force=True)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Forecast refresh failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/data")
async def legacy_data():
    resp = await get_spaces()
    return [{"space_id": s.space_id, "status": s.status} for s in resp.spaces]
