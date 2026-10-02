from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from models.user import User
from models.course import Course, CourseStatus, CourseEnrollment
from models.certificate import Certificate
from schemas.course import CourseCreate, CourseResponse, EnrollmentResponse
from security import require_trainer, require_trainee, get_current_user
from services.completion import evaluate_and_update_course_completion

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


@router.get("/courses/{course_id}/completion-status")
def get_course_completion_status(
    course_id: int,
    trainee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    target_trainee_id = current_user.id
    if user_role in ["TRAINER", "ADMIN"] and trainee_id is not None:
        target_trainee_id = trainee_id
    elif user_role not in ["TRAINER", "ADMIN"] and trainee_id is not None and trainee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trainees can only view their own completion status"
        )

    eval_data = evaluate_and_update_course_completion(db, course_id, target_trainee_id)
    if not eval_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found for this course and trainee"
        )
    return eval_data


@router.get("/trainer/courses/{course_id}/trainees-completion")
def get_trainer_course_trainees_completion(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role == "TRAINER" and course.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view completion data for your own courses"
        )

    enrollments = db.query(CourseEnrollment).options(
        joinedload(CourseEnrollment.trainee)
    ).filter(CourseEnrollment.course_id == course_id).all()

    certificates = db.query(Certificate).filter(Certificate.course_id == course_id).all()
    cert_map = {c.trainee_id: c for c in certificates}

    results = []
    for enr in enrollments:
        eval_data = evaluate_and_update_course_completion(db, course_id, enr.trainee_id)
        cert = cert_map.get(enr.trainee_id)
        results.append({
            "trainee_id": enr.trainee.id,
            "trainee_name": enr.trainee.name,
            "trainee_email": enr.trainee.email,
            "enrolled_at": enr.enrolled_at,
            "completed_at": enr.completed_at,
            "is_completed": eval_data["is_completed"] if eval_data else False,
            "has_certificate": cert is not None,
            "certificate_id": cert.id if cert else None,
            "certificate_code": cert.certificate_code if cert else None,
            "certificate_status": cert.status.value if cert else None,
            "average_score": eval_data.get("average_score") if eval_data else None,
            "suggested_grade": eval_data.get("grade") if eval_data else "Pass"
        })

    return results

