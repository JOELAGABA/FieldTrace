from fastapi import FastAPI
from app.database import engine, Base
from app.routes import measurements

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FieldTrace API")

app.include_router(measurements.router)

@app.get("/")
def root():
    return {"message": "FieldTrace API running"}
