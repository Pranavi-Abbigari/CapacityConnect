from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
from database import Base


class CourseStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(CourseStatus), nullable=False, default=CourseStatus.DRAFT)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    trainer = relationship("User", backref="courses")
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    enrolled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    course = relationship("Course", back_populates="enrollments")
    trainee = relationship("User", backref="enrollments")

    __table_args__ = (
        UniqueConstraint("course_id", "trainee_id", name="unique_course_trainee_enrollment"),
    )
