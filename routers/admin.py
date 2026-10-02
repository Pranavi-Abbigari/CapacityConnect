from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User, UserStatus
from schemas.auth import UserResponse


class ApproveUserRequest(BaseModel):
    user_id: int


router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/approve-user", response_model=UserResponse)
def approve_user(
    request: ApproveUserRequest,
    db: Session = Depends(get_db),
    x_admin_secret: str = Header(default="admin_secret_key")
):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.status = UserStatus.APPROVED
    db.commit()
    db.refresh(user)
    return user
