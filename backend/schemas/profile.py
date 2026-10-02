from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import Optional, List
from datetime import datetime


class ProficiencyLevel(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"
    EXPERT = "Expert"


class SkillBase(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None


class SkillCreate(SkillBase):
    pass


class SkillResponse(SkillBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserSkillCreate(BaseModel):
    skill_id: Optional[int] = None
    skill_name: Optional[str] = None
    category: Optional[str] = None
    proficiency: ProficiencyLevel = ProficiencyLevel.BEGINNER
    evidence: Optional[str] = None


class UserSkillUpdate(BaseModel):
    proficiency: Optional[ProficiencyLevel] = None
    evidence: Optional[str] = None


class UserSkillResponse(BaseModel):
    id: int
    user_id: int
    skill_id: int
    proficiency: ProficiencyLevel
    evidence: Optional[str] = None
    created_at: Optional[datetime] = None
    skill: Optional[SkillResponse] = None

    model_config = ConfigDict(from_attributes=True)


class TraineeProfileUpdate(BaseModel):
    qualification: Optional[str] = None
    work_experience: Optional[str] = None
    interests: Optional[str] = None
    profile_summary: Optional[str] = None


class TraineeProfileResponse(BaseModel):
    user_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    qualification: Optional[str] = None
    work_experience: Optional[str] = None
    interests: Optional[str] = None
    profile_summary: Optional[str] = None
    updated_at: Optional[datetime] = None
    skills: List[UserSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TrainerProfileUpdate(BaseModel):
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    work_experience: Optional[str] = None
    expertise_summary: Optional[str] = None


class TrainerProfileResponse(BaseModel):
    user_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    work_experience: Optional[str] = None
    expertise_summary: Optional[str] = None
    updated_at: Optional[datetime] = None
    skills: List[UserSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)


class AdminUserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    status: str
    trainee_profile: Optional[TraineeProfileResponse] = None
    trainer_profile: Optional[TrainerProfileResponse] = None
    skills: List[UserSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)
