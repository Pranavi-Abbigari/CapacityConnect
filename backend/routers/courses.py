from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models.user import User
from models.course import Course, CourseStatus, CourseEnrollment
from schemas.course import CourseCreate, CourseResponse, EnrollmentResponse
from security import require_trainer, require_trainee, get_current_user

router = APIRouter(prefix="/api", tags=["courses"])


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    status_val = course_data.status.value if hasattr(course_data.status, 'value') else course_data.status
    new_course = Course(
        title=course_data.title,
        description=course_data.description,
        trainer_id=current_user.id,
        status=status_val
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course


@router.get("/courses", response_model=List[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).filter(Course.status == CourseStatus.PUBLISHED).all()
    return courses


@router.post("/courses/{course_id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Check if already enrolled
    existing_enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.trainee_id == current_user.id
    ).first()

    if existing_enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already enrolled in this course"
        )

    new_enrollment = CourseEnrollment(
        course_id=course_id,
        trainee_id=current_user.id
    )
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    return new_enrollment


@router.get("/trainee/my-courses", response_model=List[EnrollmentResponse])
def get_my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    enrollments = db.query(CourseEnrollment).options(
        joinedload(CourseEnrollment.course)
    ).filter(
        CourseEnrollment.trainee_id == current_user.id
    ).all()
    return enrollments


@router.get("/trainer/my-courses", response_model=List[CourseResponse])
def get_trainer_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    courses = db.query(Course).filter(Course.trainer_id == current_user.id).all()
    return courses
