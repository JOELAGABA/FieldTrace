from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schema


router = APIRouter(
    prefix="/sensor-nodes",
    tags=["Sensor Nodes"]
)


@router.get("", response_model=List[schema.SensorNodeResponse])
def get_sensor_nodes(db: Session = Depends(get_db)):
    sensor_nodes = db.query(models.SensorNode).all()
    return sensor_nodes


@router.post("", response_model=schema.SensorNodeResponse)
def create_sensor_node(
    sensor_node: schema.SensorNodeCreate,
    db: Session = Depends(get_db)
):
    new_sensor_node = models.SensorNode(
        **sensor_node.model_dump()
    )

    db.add(new_sensor_node)
    db.commit()
    db.refresh(new_sensor_node)

    return new_sensor_node 
