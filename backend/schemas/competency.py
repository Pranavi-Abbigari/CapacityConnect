from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from schemas.profile import ProficiencyLevel, SkillResponse


class CourseCompetencyCreate(BaseModel):
    skill_id: Optional[int] = None
    skill_name: Optional[str] = None
    category: Optional[str] = None
    min_proficiency: ProficiencyLevel = ProficiencyLevel.BEGINNER
    weight: Optional[int] = 1


class CourseCompetencyUpdate(BaseModel):
    min_proficiency: Optional[ProficiencyLevel] = None
    weight: Optional[int] = None


class CourseCompetencyResponse(BaseModel):
    id: int
    course_id: int
    skill_id: int
    min_proficiency: ProficiencyLevel
    weight: int = 1
    created_at: Optional[datetime] = None
    skill: Optional[SkillResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SkillGapItem(BaseModel):
    skill_id: int
    skill_name: str
    category: Optional[str] = None
    required_proficiency: ProficiencyLevel
    trainee_proficiency: Optional[ProficiencyLevel] = None
    status: str  # "MATCHED", "INSUFFICIENT", "MISSING"
    weight: int = 1
    score_awarded: float
    gap_message: str

    model_config = ConfigDict(from_attributes=True)


class CourseRecommendation(BaseModel):
    course_id: int
    title: str
    description: Optional[str] = None
    skills_covered: List[str] = []
    reason: str


class TraineeCourseSkillGapResponse(BaseModel):
    trainee_id: int
    trainee_name: str
    course_id: int
    course_title: str
    match_percentage: float
    total_competencies: int
    matched_count: int
    insufficient_count: int
    missing_count: int
    matched_skills: List[SkillGapItem] = []
    insufficient_skills: List[SkillGapItem] = []
    missing_skills: List[SkillGapItem] = []
    recommendations: List[CourseRecommendation] = []


class TraineeOverallSkillGapResponse(BaseModel):
    trainee_id: int
    trainee_name: str
    total_enrolled_courses: int
    average_match_percentage: float
    course_gaps: List[TraineeCourseSkillGapResponse] = []
    all_gap_skills: List[str] = []
    curated_recommendations: List[CourseRecommendation] = []


class TrainerCompetencyCoverage(BaseModel):
    skill_id: int
    skill_name: str
    category: Optional[str] = None
    required_proficiency: ProficiencyLevel
    trainer_proficiency: Optional[ProficiencyLevel] = None
    status: str  # "MATCHED", "INSUFFICIENT", "MISSING"
    weight: int = 1
    score_awarded: float
    message: str


class TrainerMatchItem(BaseModel):
    trainer_id: int
    trainer_name: str
    trainer_email: str
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    match_percentage: float
    matched_skills_count: int
    total_skills_count: int
    matched_competencies: List[TrainerCompetencyCoverage] = []
    insufficient_competencies: List[TrainerCompetencyCoverage] = []
    missing_competencies: List[TrainerCompetencyCoverage] = []


class CourseTrainerMatchingResponse(BaseModel):
    course_id: int
    course_title: str
    required_competencies_count: int
    required_competencies: List[CourseCompetencyResponse] = []
    total_trainers_evaluated: int
    ranked_trainers: List[TrainerMatchItem] = []
