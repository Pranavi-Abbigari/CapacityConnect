from fastapi import FastAPI
from database import engine, Base
import models
from routers import auth_router, admin_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CapacityConnect API")

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/")
def read_root():
    return {"message": "CapacityConnect API is running"}
