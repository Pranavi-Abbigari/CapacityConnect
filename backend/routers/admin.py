import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User, UserRole, UserStatus
from models.course import Course, CourseEnrollment
from models.quiz import Attempt
from schemas.auth import UserResponse
from schemas.admin import AdminDashboardResponse
from security import require_admin, oauth2_scheme, get_current_user

ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "admin_secret_key")


class ApproveUserRequest(BaseModel):
    user_id: int


router = APIRouter(prefix="/api/admin", tags=["admin"])


def verify_admin_authority(
    token: Optional[str] = Depends(oauth2_scheme),
    x_admin_secret: Optional[str] = Header(None, alias="x-admin-secret"),
    db: Session = Depends(get_db)
) -> bool:
    if token:
        user = get_current_user(token=token, db=db)
        require_admin(current_user=user)
        return True
    if x_admin_secret == ADMIN_SECRET_KEY:
        return True
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/approve-user", response_model=UserResponse)
def approve_user(
    request: ApproveUserRequest,
    db: Session = Depends(get_db),
    authorized: bool = Depends(verify_admin_authority)
):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.status = UserStatus.APPROVED
    db.commit()
    db.refresh(user)
    return user


@router.get("/pending-users", response_model=List[UserResponse])
def get_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    pending = db.query(User).filter(User.status == UserStatus.PENDING).all()
    return pending


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(User).all()


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    total_users = db.query(User).count()
    total_trainees = db.query(User).filter(User.role == UserRole.TRAINEE).count()
    total_trainers = db.query(User).filter(User.role == UserRole.TRAINER).count()
    total_courses = db.query(Course).count()
    total_enrollments = db.query(CourseEnrollment).count()
    total_attempts = db.query(Attempt).count()

    return AdminDashboardResponse(
        total_users=total_users,
        total_trainees=total_trainees,
        total_trainers=total_trainers,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        total_attempts=total_attempts
    )
