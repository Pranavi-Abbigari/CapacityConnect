from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timezone

from database import get_db
from models.user import User, UserRole
from models.course import Course, CourseEnrollment
from models.feedback import CourseFeedback, TrainerFeedback
from schemas.feedback import (
    CourseFeedbackCreate,
    CourseFeedbackResponse,
    CourseFeedbackSummaryResponse,
    TrainerFeedbackCreate,
    TrainerFeedbackResponse,
    TrainerFeedbackSummaryResponse,
    MyFeedbackSubmissionsResponse,
)
from security import get_current_user, require_trainee
from services.completion import create_notification

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("/courses", response_model=CourseFeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_course_feedback(
    payload: CourseFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee),
):
    # 1. Validate rating
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be an integer between 1 and 5",
        )

    # 2. Check course exists
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    # 3. Check trainee is enrolled in course
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == payload.course_id,
        CourseEnrollment.trainee_id == current_user.id,
    ).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course to submit feedback",
        )

    # 4. Check for duplicate feedback
    existing = db.query(CourseFeedback).filter(
        CourseFeedback.course_id == payload.course_id,
        CourseFeedback.trainee_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted feedback for this course",
        )

    # 5. Create feedback
    clean_comment = payload.comment.strip() if payload.comment else None
    feedback = CourseFeedback(
        course_id=payload.course_id,
        trainee_id=current_user.id,
        rating=payload.rating,
        comment=clean_comment,
        created_at=datetime.now(timezone.utc),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    # Notify trainer if assigned
    if course.trainer_id and course.trainer_id != current_user.id:
        try:
            create_notification(
                db,
                user_id=course.trainer_id,
                title="⭐ New Course Feedback",
                message=f"A trainee submitted a {payload.rating}-star review for '{course.title}'.",
                type="FEEDBACK",
                link=f"/trainer?tab=courses#course_feedback_{course.id}",
            )
        except Exception as e:
            print(f"Error creating feedback notification: {e}")

    return CourseFeedbackResponse(
        id=feedback.id,
        course_id=feedback.course_id,
        trainee_id=feedback.trainee_id,
        trainee_name=current_user.name,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=feedback.created_at,
    )


@router.get("/courses/{course_id}", response_model=CourseFeedbackSummaryResponse)
def get_course_feedback(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    feedbacks = db.query(CourseFeedback).options(
        joinedload(CourseFeedback.trainee)
    ).filter(CourseFeedback.course_id == course_id).order_by(CourseFeedback.created_at.desc()).all()

    total_reviews = len(feedbacks)
    avg_rating = round(sum(f.rating for f in feedbacks) / total_reviews, 1) if total_reviews > 0 else 0.0

    reviews_list = [
        CourseFeedbackResponse(
            id=f.id,
            course_id=f.course_id,
            trainee_id=f.trainee_id,
            trainee_name=f.trainee.name if f.trainee else "Anonymous Trainee",
            rating=f.rating,
            comment=f.comment,
            created_at=f.created_at,
        )
        for f in feedbacks
    ]

    return CourseFeedbackSummaryResponse(
        course_id=course.id,
        course_title=course.title,
        average_rating=avg_rating,
        total_reviews=total_reviews,
        reviews=reviews_list,
    )


@router.post("/trainers", response_model=TrainerFeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_trainer_feedback(
    payload: TrainerFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee),
):
    # 1. Validate rating
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be an integer between 1 and 5",
        )

    # 2. Check trainer exists and has TRAINER role
    trainer = db.query(User).filter(User.id == payload.trainer_id).first()
    if not trainer or trainer.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer not found",
        )

    # 3. Check course exists and is taught by this trainer
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    if course.trainer_id != payload.trainer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trainer is not associated with this course",
        )

    # 4. Check trainee is enrolled in course
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == payload.course_id,
        CourseEnrollment.trainee_id == current_user.id,
    ).first()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course to submit feedback for this trainer",
        )

    # 5. Prevent duplicate submission
    existing = db.query(TrainerFeedback).filter(
        TrainerFeedback.trainer_id == payload.trainer_id,
        TrainerFeedback.trainee_id == current_user.id,
        TrainerFeedback.course_id == payload.course_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted feedback for this trainer on this course",
        )

    clean_comment = payload.comment.strip() if payload.comment else None
    feedback = TrainerFeedback(
        trainer_id=payload.trainer_id,
        trainee_id=current_user.id,
        course_id=payload.course_id,
        rating=payload.rating,
        comment=clean_comment,
        created_at=datetime.now(timezone.utc),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    # Notify trainer
    try:
        create_notification(
            db,
            user_id=trainer.id,
            title="🌟 New Trainer Review",
            message=f"A trainee submitted a {payload.rating}-star review for your instruction in '{course.title}'.",
            type="FEEDBACK",
            link="/trainer?tab=profile",
        )
    except Exception as e:
        print(f"Error creating trainer notification: {e}")

    return TrainerFeedbackResponse(
        id=feedback.id,
        trainer_id=feedback.trainer_id,
        trainer_name=trainer.name,
        trainee_id=feedback.trainee_id,
        trainee_name=current_user.name,
        course_id=feedback.course_id,
        course_title=course.title,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=feedback.created_at,
    )


@router.get("/trainers/{trainer_id}", response_model=TrainerFeedbackSummaryResponse)
def get_trainer_feedback(
    trainer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trainer = db.query(User).filter(User.id == trainer_id).first()
    if not trainer or trainer.role != UserRole.TRAINER:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer not found",
        )

    feedbacks = db.query(TrainerFeedback).options(
        joinedload(TrainerFeedback.trainee),
        joinedload(TrainerFeedback.course),
    ).filter(TrainerFeedback.trainer_id == trainer_id).order_by(TrainerFeedback.created_at.desc()).all()

    total_reviews = len(feedbacks)
    avg_rating = round(sum(f.rating for f in feedbacks) / total_reviews, 1) if total_reviews > 0 else 0.0

    reviews_list = [
        TrainerFeedbackResponse(
            id=f.id,
            trainer_id=f.trainer_id,
            trainer_name=trainer.name,
            trainee_id=f.trainee_id,
            trainee_name=f.trainee.name if f.trainee else "Anonymous Trainee",
            course_id=f.course_id,
            course_title=f.course.title if f.course else f"Course #{f.course_id}",
            rating=f.rating,
            comment=f.comment,
            created_at=f.created_at,
        )
        for f in feedbacks
    ]

    return TrainerFeedbackSummaryResponse(
        trainer_id=trainer.id,
        trainer_name=trainer.name,
        average_rating=avg_rating,
        total_reviews=total_reviews,
        reviews=reviews_list,
    )


@router.get("/my-submissions", response_model=MyFeedbackSubmissionsResponse)
def get_my_feedback_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee),
):
    course_feedbacks = db.query(CourseFeedback).filter(
        CourseFeedback.trainee_id == current_user.id
    ).order_by(CourseFeedback.created_at.desc()).all()

    trainer_feedbacks = db.query(TrainerFeedback).options(
        joinedload(TrainerFeedback.trainer),
        joinedload(TrainerFeedback.course),
    ).filter(
        TrainerFeedback.trainee_id == current_user.id
    ).order_by(TrainerFeedback.created_at.desc()).all()

    c_list = [
        CourseFeedbackResponse(
            id=f.id,
            course_id=f.course_id,
            trainee_id=f.trainee_id,
            trainee_name=current_user.name,
            rating=f.rating,
            comment=f.comment,
            created_at=f.created_at,
        )
        for f in course_feedbacks
    ]

    t_list = [
        TrainerFeedbackResponse(
            id=f.id,
            trainer_id=f.trainer_id,
            trainer_name=f.trainer.name if f.trainer else f"Trainer #{f.trainer_id}",
            trainee_id=f.trainee_id,
            trainee_name=current_user.name,
            course_id=f.course_id,
            course_title=f.course.title if f.course else f"Course #{f.course_id}",
            rating=f.rating,
            comment=f.comment,
            created_at=f.created_at,
        )
        for f in trainer_feedbacks
    ]

    return MyFeedbackSubmissionsResponse(
        course_feedbacks=c_list,
        trainer_feedbacks=t_list,
    )
