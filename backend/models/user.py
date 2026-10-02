from sqlalchemy import Column, Integer, String, Boolean, Enum as SQLEnum
import enum
from database import Base


class UserRole(str, enum.Enum):
    TRAINEE = "TRAINEE"
    TRAINER = "TRAINER"
    ADMIN = "ADMIN"


class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.TRAINEE)
    status = Column(SQLEnum(UserStatus), nullable=False, default=UserStatus.PENDING)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)


