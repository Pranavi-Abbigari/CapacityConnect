from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from models.certificate import CertificateStatus


class CertificateIssueRequest(BaseModel):
    course_id: int
    trainee_id: int
    grade: Optional[str] = None


class CertificateResponse(BaseModel):
    id: int
    certificate_code: str
    course_id: int
    course_title: Optional[str] = None
    trainee_id: int
    trainee_name: Optional[str] = None
    issuer_id: int
    issuer_name: Optional[str] = None
    issue_date: datetime
    status: CertificateStatus
    grade: Optional[str] = None
    verification_hash: str
    verification_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CertificateVerificationResponse(BaseModel):
    certificate_code: str
    status: str
    is_valid: bool
    course_title: str
    trainee_name: str
    issuer_name: str
    issue_date: datetime
    grade: Optional[str] = None
    verification_hash: str


class QuizEvaluationItem(BaseModel):
    quiz_id: int
    quiz_title: str
    passed: bool
    best_score: Optional[float] = None
    attempts_count: int


class CourseCompletionStatusResponse(BaseModel):
    course_id: int
    course_title: str
    trainee_id: int
    is_completed: bool
    completed_at: Optional[datetime] = None
    total_quizzes: int
    passed_quizzes: int
    average_score: Optional[float] = None
    grade: Optional[str] = None
    quiz_evaluations: List[QuizEvaluationItem] = []


class TraineeCourseCompletionSummary(BaseModel):
    trainee_id: int
    trainee_name: str
    trainee_email: str
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    is_completed: bool
    has_certificate: bool
    certificate_id: Optional[int] = None
    certificate_code: Optional[str] = None
    certificate_status: Optional[str] = None
    suggested_grade: Optional[str] = None
    average_score: Optional[float] = None
