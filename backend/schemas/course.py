from pydantic import BaseModel
from enum import Enum
from typing import Optional
from datetime import datetime


class CourseStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: CourseStatus = CourseStatus.PUBLISHED


class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    trainer_id: int
    status: CourseStatus
    created_at: datetime

    class Config:
        from_attributes = True


class EnrollmentResponse(BaseModel):
    id: int
    course_id: int
    trainee_id: int
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    course: Optional[CourseResponse] = None

    class Config:
        from_attributes = True
