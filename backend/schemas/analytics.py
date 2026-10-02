from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict


class AnalyticsKPIs(BaseModel):
    total_users: int
    total_trainees: int
    total_trainers: int
    total_courses: int
    total_enrollments: int
    completed_enrollments: int
    overall_completion_rate: float
    total_quizzes: int
    total_attempts: int
    platform_average_quiz_score: float
    total_certificates_issued: int
    active_certificates: int
    revoked_certificates: int

    model_config = ConfigDict(from_attributes=True)


class CourseCompletionMetric(BaseModel):
    course_id: int
    course_title: str
    trainer_name: str
    total_enrolled: int
    completed_count: int
    completion_rate: float
    average_quiz_score: float

    model_config = ConfigDict(from_attributes=True)


class GradeDistribution(BaseModel):
    A_plus: int
    A: int
    B: int
    C: int
    Pass: int
    Fail: int

    model_config = ConfigDict(from_attributes=True)


class SkillAcquisitionItem(BaseModel):
    skill_id: int
    skill_name: str
    category: Optional[str] = None
    learner_count: int

    model_config = ConfigDict(from_attributes=True)


class SkillGapItem(BaseModel):
    skill_id: int
    skill_name: str
    gap_count: int

    model_config = ConfigDict(from_attributes=True)


class SkillIntelligence(BaseModel):
    most_acquired_skills: List[SkillAcquisitionItem] = []
    top_skill_gaps: List[SkillGapItem] = []

    model_config = ConfigDict(from_attributes=True)


class TrainerPerformanceMetric(BaseModel):
    trainer_id: int
    trainer_name: str
    total_courses: int
    total_students: int
    average_student_score: float
    completion_rate: float

    model_config = ConfigDict(from_attributes=True)


class AdminAnalyticsOverviewResponse(BaseModel):
    kpis: AnalyticsKPIs
    completion_metrics: List[CourseCompletionMetric] = []
    grade_distribution: Dict[str, int]
    skill_intelligence: SkillIntelligence
    trainer_performance: List[TrainerPerformanceMetric] = []

    model_config = ConfigDict(from_attributes=True)
