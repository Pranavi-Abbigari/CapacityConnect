from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models.course import CourseEnrollment
from models.quiz import Quiz, Attempt
from models.notification import Notification
from services.completion import create_notification


def check_and_create_deadline_notifications(
    db: Session,
    user_id: int,
    hours_window: int = 72
) -> List[Dict[str, Any]]:
    """
    Safely checks upcoming quiz deadlines for enrolled courses of the given trainee.
    Sends at most one deterministic notification per quiz.
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=hours_window)

    # 1. Get courses trainee is enrolled in
    enrollments = db.query(CourseEnrollment).filter(
        CourseEnrollment.trainee_id == user_id
    ).all()
    if not enrollments:
        return []

    course_ids = [e.course_id for e in enrollments]

    # 2. Get quizzes with an upcoming deadline within the window
    # Note: SQLite stores datetime; compare with aware or naive handling
    upcoming_quizzes = db.query(Quiz).filter(
        Quiz.course_id.in_(course_ids),
        Quiz.deadline.isnot(None),
        Quiz.deadline > now,
        Quiz.deadline <= cutoff
    ).all()

    reminders = []
    for quiz in upcoming_quizzes:
        # Check if already submitted by this trainee
        attempt = db.query(Attempt).filter(
            Attempt.quiz_id == quiz.id,
            Attempt.trainee_id == user_id
        ).first()
        if attempt:
            continue  # Already submitted

        # Check for existing notification to avoid duplicate spam
        link_tag = f"/trainee?tab=quizzes#deadline_quiz_{quiz.id}"
        existing = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.link.like(f"%deadline_quiz_{quiz.id}%")
        ).first()

        if existing:
            continue  # Already notified

        # Format remaining time
        deadline_dt = quiz.deadline
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
        diff = deadline_dt - now
        hours_left = max(1, int(diff.total_seconds() // 3600))
        time_str = f"{hours_left}h left" if hours_left < 24 else f"{hours_left // 24}d {hours_left % 24}h left"

        notif = create_notification(
            db,
            user_id=user_id,
            title="⏰ Upcoming Quiz Deadline",
            message=f"Assessment '{quiz.title}' is due soon ({time_str}). Please complete it before the deadline.",
            type="DEADLINE",
            link=link_tag
        )
        reminders.append({
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "deadline": quiz.deadline.isoformat(),
            "notification_id": notif.id
        })

    return reminders
