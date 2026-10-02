from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from models.user import User
from models.course import Course
from models.quiz import Quiz, Question, Attempt, AttemptDetail
from schemas.quiz import (
    QuizCreate,
    QuizResponse,
    QuestionCreate,
    QuestionResponse,
    QuizSubmitRequest,
    AttemptResponse,
    QuizResultsSummaryResponse,
)
from security import require_trainer, require_trainee, get_current_user

router = APIRouter(prefix="/api", tags=["quizzes"])


@router.post("/quizzes", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def create_quiz(
    quiz_data: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    course = db.query(Course).filter(Course.id == quiz_data.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    new_quiz = Quiz(
        course_id=quiz_data.course_id,
        title=quiz_data.title,
        deadline=quiz_data.deadline
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)
    return new_quiz


@router.get("/quizzes", response_model=List[QuizResponse])
def list_quizzes(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Quiz).options(joinedload(Quiz.questions))
    if course_id is not None:
        query = query.filter(Quiz.course_id == course_id)
    return query.all()


@router.post("/quizzes/{quiz_id}/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def add_question(
    quiz_id: int,
    q_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    new_question = Question(
        quiz_id=quiz_id,
        text=q_data.text,
        options=q_data.options,
        correct_index=q_data.correct_index,
        explanation=q_data.explanation
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).options(joinedload(Quiz.questions)).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    return quiz


@router.post("/quizzes/{quiz_id}/submit", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
def submit_quiz(
    quiz_id: int,
    submit_data: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    quiz = db.query(Quiz).options(joinedload(Quiz.questions)).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    questions_by_id = {q.id: q for q in quiz.questions}
    total_questions = len(questions_by_id)

    if total_questions == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit attempt for a quiz with no questions"
        )

    correct_count = 0
    attempt_details_to_create = []

    for ans in submit_data.answers:
        q = questions_by_id.get(ans.question_id)
        if not q:
            continue
        is_correct = (ans.selected_index == q.correct_index)
        if is_correct:
            correct_count += 1
        attempt_details_to_create.append({
            "question_id": q.id,
            "selected_index": ans.selected_index,
            "is_correct": is_correct
        })

    score_percentage = round((correct_count / total_questions) * 100.0, 2)

    new_attempt = Attempt(
        quiz_id=quiz_id,
        trainee_id=current_user.id,
        score=score_percentage
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)

    for detail_data in attempt_details_to_create:
        detail = AttemptDetail(
            attempt_id=new_attempt.id,
            question_id=detail_data["question_id"],
            selected_index=detail_data["selected_index"],
            is_correct=detail_data["is_correct"]
        )
        db.add(detail)

    db.commit()
    db.refresh(new_attempt)
    return new_attempt


@router.get("/trainee/my-attempts", response_model=List[AttemptResponse])
def get_my_attempts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    attempts = db.query(Attempt).options(
        joinedload(Attempt.quiz).joinedload(Quiz.questions),
        joinedload(Attempt.details)
    ).filter(Attempt.trainee_id == current_user.id).all()
    return attempts


@router.get("/trainer/quizzes/{quiz_id}/results", response_model=QuizResultsSummaryResponse)
def get_quiz_results(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    attempts = db.query(Attempt).options(
        joinedload(Attempt.details),
        joinedload(Attempt.trainee)
    ).filter(Attempt.quiz_id == quiz_id).all()

    total_attempts = len(attempts)
    avg_score = round(sum(a.score for a in attempts) / total_attempts, 2) if total_attempts > 0 else 0.0

    return QuizResultsSummaryResponse(
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        total_attempts=total_attempts,
        average_score=avg_score,
        attempts=attempts
    )
