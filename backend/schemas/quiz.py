from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from schemas.auth import UserResponse


class QuestionCreate(BaseModel):
    text: str
    options: List[str] = Field(..., min_length=4, max_length=4, description="List of 4 option strings")
    correct_index: int = Field(..., ge=0, le=3, description="Index of correct option (0-3)")
    explanation: Optional[str] = None


class QuestionResponse(BaseModel):
    id: int
    quiz_id: int
    text: str
    options: List[str]
    correct_index: Optional[int] = None
    explanation: Optional[str] = None

    class Config:
        from_attributes = True


class QuizCreate(BaseModel):
    course_id: int
    title: str
    deadline: Optional[datetime] = None


class QuizResponse(BaseModel):
    id: int
    course_id: int
    title: str
    deadline: Optional[datetime] = None
    created_at: datetime
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True


class AnswerSubmit(BaseModel):
    question_id: int
    selected_index: int = Field(..., ge=0, le=3)


class QuizSubmitRequest(BaseModel):
    answers: List[AnswerSubmit]


class AttemptDetailResponse(BaseModel):
    id: int
    question_id: int
    selected_index: int
    is_correct: bool

    class Config:
        from_attributes = True


class AttemptResponse(BaseModel):
    id: int
    quiz_id: int
    trainee_id: int
    score: float
    submitted_at: datetime
    details: List[AttemptDetailResponse] = []
    quiz: Optional[QuizResponse] = None
    trainee: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class QuizResultsSummaryResponse(BaseModel):
    quiz_id: int
    quiz_title: str
    total_attempts: int
    average_score: float
    attempts: List[AttemptResponse] = []
