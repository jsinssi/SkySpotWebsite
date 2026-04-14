from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ParkingSpaceBase(BaseModel):
    space_id: str
    status: str
    row: Optional[str] = None
    type: Optional[str] = None


class ParkingSpaceOut(ParkingSpaceBase):
    """Response schema for parking space data."""

    class Config:
        from_attributes = True


class ParkingSpaceInDB(ParkingSpaceBase):
    """Full schema including DB fields."""
    id: int
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    status: str
    service: str
