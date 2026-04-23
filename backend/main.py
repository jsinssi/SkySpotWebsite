"""
SkySpot API — v1.3
/api/spaces: finds MAX(generated_at) then fetches all 199 rows for that batch.
Two fast indexed lookups — no materialized view needed.
"""
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://liamadmin:CHANGE_ME@liam-postgres-server.postgres.database.azure.com:5432/skyspot?ssl=require",
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SkySpot API starting")
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


class HealthResponse(BaseModel):
    status: str
    service: str
    db_connected: bool


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
                       wind_speed_ms, precipitation_mm, weather_code, description, is_forecast
                FROM weather_hourly
                ORDER BY recorded_at DESC LIMIT 1
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
                       wind_speed_max_ms, weather_code, description
                FROM weather_daily
                WHERE forecast_date >= CURRENT_DATE
                ORDER BY forecast_date LIMIT 7
            """))).fetchall()
        return [WeatherForecastDay(**r._mapping) for r in rows]
    except Exception as exc:
        logger.exception("Failed to fetch forecast")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/data")
async def legacy_data():
    resp = await get_spaces()
    return [{"space_id": s.space_id, "status": s.status} for s in resp.spaces]
