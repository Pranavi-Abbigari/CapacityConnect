from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
from database import Base


class CertificateStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_code = Column(String, unique=True, index=True, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    issuer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    issue_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(SQLEnum(CertificateStatus), default=CertificateStatus.ACTIVE, nullable=False)
    grade = Column(String, nullable=True)
    verification_hash = Column(String, nullable=False)

    # Relationships
    course = relationship("Course", backref="certificates")
    trainee = relationship("User", foreign_keys=[trainee_id], backref="trainee_certificates")
    issuer = relationship("User", foreign_keys=[issuer_id], backref="issued_certificates")

    __table_args__ = (
        UniqueConstraint("course_id", "trainee_id", name="unique_course_trainee_certificate"),
    )
