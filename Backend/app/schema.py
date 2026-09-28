from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MeasurementCreate(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    sensor_id: Optional[int] = None
    value: Optional[float] = None

class MeasurementResponse(MeasurementCreate):
    id: int
    recorded_at: datetime

    class Config:
        from_attributes = True