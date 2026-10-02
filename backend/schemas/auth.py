from pydantic import BaseModel, EmailStr, ConfigDict
from enum import Enum


class UserRole(str, Enum):
    TRAINEE = "TRAINEE"
    TRAINER = "TRAINER"
    ADMIN = "ADMIN"


class UserStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.TRAINEE


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: UserRole
    status: UserStatus
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str



