from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# -------------------------
# Sensor Node Schemas
# -------------------------

class SensorNodeCreate(BaseModel):
    node_name: str
    device_identifier: str
    status: str = "active"


class SensorNodeResponse(SensorNodeCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# -------------------------
# Deployment Schemas
# -------------------------

class DeploymentCreate(BaseModel):
    sensor_id: int
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    started_at: datetime
    ended_at: Optional[datetime] = None


class DeploymentResponse(DeploymentCreate):
    id: int

    class Config:
        from_attributes = True


# -------------------------
# Measurement Schemas
# -------------------------

class MeasurementCreate(BaseModel):
    deployment_id: int
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_temperature: Optional[float] = None
    soil_moisture: Optional[float] = None
    soil_ph: Optional[float] = None


class MeasurementResponse(MeasurementCreate):
    id: int
    recorded_at: datetime

    class Config:
        from_attributes = True