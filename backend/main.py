from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas import ParkingSpaceOut, HealthResponse

app = FastAPI(title="SkySpot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Placeholder data matching the Figma frontend
# These will be replaced with real database queries once PostgreSQL is connected
# ---------------------------------------------------------------------------
PARKING_SPACES = [
    {"space_id": "A092", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A093", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A094", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A095", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A096", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A097", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A098", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A099", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A100", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A101", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A141", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A142", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A143", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A144", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A145", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A146", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A147", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A148", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A149", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A150", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A151", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A152", "status": "occupied", "row": "A", "type": "standard"},
    {"space_id": "A153", "status": "free", "row": "A", "type": "standard"},
    {"space_id": "A154", "status": "occupied", "row": "A", "type": "standard"},
]


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return {"status": "healthy", "service": "skyspot-api"}


@app.get("/api/data", response_model=list[ParkingSpaceOut])
async def get_parking_data():
    """Return parking space data. Will be replaced with a database query later."""
    return PARKING_SPACES
