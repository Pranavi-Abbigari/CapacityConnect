from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class CourseFeedback(Base):
    __tablename__ = "course_feedback"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    course = relationship("Course", backref="feedbacks")
    trainee = relationship("User", backref="course_feedbacks")

    __table_args__ = (
        UniqueConstraint("course_id", "trainee_id", name="unique_course_trainee_feedback"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_course_feedback_rating_range"),
    )


class TrainerFeedback(Base):
    __tablename__ = "trainer_feedback"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    trainer = relationship("User", foreign_keys=[trainer_id], backref="trainer_feedbacks_received")
    trainee = relationship("User", foreign_keys=[trainee_id], backref="trainer_feedbacks_given")
    course = relationship("Course", backref="trainer_feedbacks")

    __table_args__ = (
        UniqueConstraint("trainer_id", "trainee_id", "course_id", name="unique_trainer_trainee_course_feedback"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_trainer_feedback_rating_range"),
    )
