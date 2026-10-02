from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class CourseFeedbackCreate(BaseModel):
    course_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = None


class CourseFeedbackResponse(BaseModel):
    id: int
    course_id: int
    trainee_id: int
    trainee_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseFeedbackSummaryResponse(BaseModel):
    course_id: int
    course_title: Optional[str] = None
    average_rating: float
    total_reviews: int
    reviews: List[CourseFeedbackResponse]


class TrainerFeedbackCreate(BaseModel):
    trainer_id: int
    course_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = None


class TrainerFeedbackResponse(BaseModel):
    id: int
    trainer_id: int
    trainer_name: Optional[str] = None
    trainee_id: int
    trainee_name: Optional[str] = None
    course_id: int
    course_title: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrainerFeedbackSummaryResponse(BaseModel):
    trainer_id: int
    trainer_name: Optional[str] = None
    average_rating: float
    total_reviews: int
    reviews: List[TrainerFeedbackResponse]


class MyFeedbackSubmissionsResponse(BaseModel):
    course_feedbacks: List[CourseFeedbackResponse]
    trainer_feedbacks: List[TrainerFeedbackResponse]
