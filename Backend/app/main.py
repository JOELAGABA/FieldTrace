from fastapi import FastAPI
from app.database import engine, Base
from app import models
from app.routes import measurements, sensor_nodes, deployments

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FieldTrace API")

app.include_router(measurements.router)
app.include_router(sensor_nodes.router)
app.include_router(deployments.router)


@app.get("/")
def root():
    return {"message": "FieldTrace API running"}