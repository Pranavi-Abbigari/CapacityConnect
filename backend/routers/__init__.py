from routers.auth import router as auth_router
from routers.admin import router as admin_router
from routers.courses import router as courses_router
from routers.quizzes import router as quizzes_router
from routers.profiles import router as profiles_router, seed_initial_skills
from routers.competencies import router as competencies_router
from routers.certificates import router as certificates_router
from routers.notifications import router as notifications_router

__all__ = [
    "auth_router",
    "admin_router",
    "courses_router",
    "quizzes_router",
    "profiles_router",
    "competencies_router",
    "certificates_router",
    "notifications_router",
    "seed_initial_skills",
]
