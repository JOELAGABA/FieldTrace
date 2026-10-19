from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models
from app.routes import measurements, sensor_nodes, deployments

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FieldTrace API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(measurements.router)
app.include_router(sensor_nodes.router)
app.include_router(deployments.router)


@app.get("/")
def root():
    return {"message": "FieldTrace API running"}