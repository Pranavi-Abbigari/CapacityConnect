from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
import models
from routers import (
    auth_router,
    admin_router,
    courses_router,
    quizzes_router,
    profiles_router,
    competencies_router,
    seed_initial_skills,
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Safely seed initial reusable skills catalog
try:
    with SessionLocal() as db_session:
        seed_initial_skills(db_session)
except Exception as e:
    print(f"Skill seeding notice: {e}")

app = FastAPI(title="CapacityConnect API")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(courses_router)
app.include_router(quizzes_router)
app.include_router(profiles_router)
app.include_router(competencies_router)


@app.get("/")
def read_root():
    return {"message": "CapacityConnect API is running"}
