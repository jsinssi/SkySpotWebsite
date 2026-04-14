from sqlalchemy import Column, Integer, String, DateTime, func
from database import Base


class ParkingSpace(Base):
    __tablename__ = "parking_spaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    space_id = Column(String(10), unique=True, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="free")  # free | occupied
    row = Column(String(5), nullable=True)
    type = Column(String(20), nullable=True, default="standard")
    notes = Column(String(255), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
