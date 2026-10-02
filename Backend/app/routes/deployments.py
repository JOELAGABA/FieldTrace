from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schema


router = APIRouter(
    prefix="/deployments",
    tags=["Deployments"]
)


@router.get("", response_model=List[schema.DeploymentResponse])
def get_deployments(db: Session = Depends(get_db)):
    deployments = db.query(models.Deployment).all()
    return deployments


@router.post("", response_model=schema.DeploymentResponse)
def create_deployment(
    deployment: schema.DeploymentCreate,
    db: Session = Depends(get_db)
):
    new_deployment = models.Deployment(
        **deployment.model_dump()
    )

    db.add(new_deployment)
    db.commit()
    db.refresh(new_deployment)

    return new_deployment