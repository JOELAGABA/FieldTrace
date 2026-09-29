from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class SensorNode(Base):
    __tablename__ = "sensor_nodes"

    id = Column(Integer, primary_key=True, index=True)
    node_name = Column(String(100), nullable=False)
    device_identifier = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(
        Integer,
        ForeignKey("sensor_nodes.id", ondelete="CASCADE"),
        nullable=False
    )
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)

    deployment_id = Column(
        Integer,
        ForeignKey("deployments.id", ondelete="CASCADE"),
        nullable=False
    )

    recorded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    soil_temperature = Column(Float, nullable=True)
    soil_moisture = Column(Float, nullable=True)
    soil_ph = Column(Float, nullable=True)