from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schema


router = APIRouter(
    prefix="/measurements",
    tags=["Measurements"]
)


@router.get("", response_model=List[schema.MeasurementResponse])
def get_measurements(db: Session = Depends(get_db)):
    measurements = db.query(models.Measurement).all()
    return measurements


@router.post("", response_model=schema.MeasurementResponse)
def create_measurement(
    measurement: schema.MeasurementCreate,
    db: Session = Depends(get_db)
):
    new_measurement = models.Measurement(
        **measurement.model_dump()
    )

    db.add(new_measurement)
    db.commit()
    db.refresh(new_measurement)

    return new_measurement