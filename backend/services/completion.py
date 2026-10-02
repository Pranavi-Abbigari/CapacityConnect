import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from models.course import Course, CourseEnrollment
from models.quiz import Quiz, Attempt
from models.notification import Notification

DEFAULT_PASSING_SCORE = float(os.getenv("DEFAULT_PASSING_SCORE", "50.0"))


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "INFO",
    link: Optional[str] = None
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
        is_read=False,
        created_at=datetime.now(timezone.utc)
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def evaluate_and_update_course_completion(
    db: Session,
    course_id: int,
    trainee_id: int
) -> Optional[Dict[str, Any]]:
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.trainee_id == trainee_id
    ).first()

    if not enrollment:
        return None

    course = db.query(Course).filter(Course.id == course_id).first()
    course_title = course.title if course else f"Course #{course_id}"

    # Get quizzes for this course
    course_quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).all()
    total_quizzes = len(course_quizzes)

    quiz_ids = [q.id for q in course_quizzes]
    attempts: List[Attempt] = []
    if quiz_ids:
        attempts = db.query(Attempt).filter(
            Attempt.quiz_id.in_(quiz_ids),
            Attempt.trainee_id == trainee_id
        ).all()

    attempts_by_quiz: Dict[int, List[Attempt]] = {}
    for att in attempts:
        attempts_by_quiz.setdefault(att.quiz_id, []).append(att)

    quiz_evaluations = []
    passed_count = 0
    scores_for_calc = []

    for q in course_quizzes:
        q_attempts = attempts_by_quiz.get(q.id, [])
        best_score = max((a.score for a in q_attempts), default=0.0) if q_attempts else 0.0
        has_questions = len(q.questions) > 0 if hasattr(q, 'questions') and q.questions else True
        passed = (len(q_attempts) > 0 and best_score >= DEFAULT_PASSING_SCORE) if has_questions else (len(q_attempts) > 0)

        if passed:
            passed_count += 1
            scores_for_calc.append(best_score)
        elif q_attempts:
            scores_for_calc.append(best_score)

        quiz_evaluations.append({
            "quiz_id": q.id,
            "quiz_title": q.title,
            "passed": passed,
            "best_score": round(best_score, 1) if q_attempts else None,
            "attempts_count": len(q_attempts)
        })

    is_satisfied = (total_quizzes > 0 and passed_count == total_quizzes)
    avg_score = round(sum(scores_for_calc) / len(scores_for_calc), 1) if scores_for_calc else None

    grade = None
    if avg_score is not None:
        if avg_score >= 90:
            grade = "A+"
        elif avg_score >= 80:
            grade = "A"
        elif avg_score >= 70:
            grade = "B"
        elif avg_score >= 60:
            grade = "C"
        elif avg_score >= DEFAULT_PASSING_SCORE:
            grade = "Pass"
        else:
            grade = "Fail"

    # Set completed_at if newly satisfied
    if is_satisfied and enrollment.completed_at is None:
        now = datetime.now(timezone.utc)
        enrollment.completed_at = now
        db.commit()
        db.refresh(enrollment)

        create_notification(
            db,
            user_id=trainee_id,
            title="Course Completed! 🎉",
            message=f"Congratulations! You completed all assessments for '{course_title}' with an average score of {avg_score}%.",
            type="SUCCESS",
            link="/trainee?tab=my-courses"
        )

    is_completed = (enrollment.completed_at is not None) or is_satisfied

    return {
        "course_id": course_id,
        "course_title": course_title,
        "trainee_id": trainee_id,
        "is_completed": is_completed,
        "completed_at": enrollment.completed_at,
        "total_quizzes": total_quizzes,
        "passed_quizzes": passed_count,
        "average_score": avg_score,
        "grade": grade,
        "quiz_evaluations": quiz_evaluations
    }
