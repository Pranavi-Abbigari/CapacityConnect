from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Announcement title")
    content: str = Field(..., min_length=1, description="Announcement body")
    course_id: Optional[int] = None

    @field_validator("title", "content")
    @classmethod
    def validate_not_whitespace_only(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Must not be empty or whitespace only")
        return v.strip()


class AnnouncementResponse(BaseModel):
    id: int
    author_id: int
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    course_id: Optional[int] = None
    course_title: Optional[str] = None
    title: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
