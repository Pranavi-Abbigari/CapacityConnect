from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timezone

from database import get_db
from models.user import User, UserRole
from models.course import Course, CourseEnrollment
from models.announcement import Announcement
from schemas.announcement import AnnouncementCreate, AnnouncementResponse
from security import get_current_user
from services.completion import create_notification

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. RBAC: Trainees cannot create announcements
    if current_user.role == UserRole.TRAINEE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trainees are not authorized to create announcements",
        )

    course = None
    if payload.course_id is not None:
        course = db.query(Course).filter(Course.id == payload.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified course not found",
            )

    # 2. RBAC: Trainers can only post announcements for their own courses
    if current_user.role == UserRole.TRAINER:
        if payload.course_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trainers must specify a course for announcements",
            )
        if course.trainer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trainers can only create announcements for courses they teach",
            )

    # 3. Create announcement
    announcement = Announcement(
        author_id=current_user.id,
        course_id=payload.course_id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    # 4. Dispatch Notifications using existing notification infrastructure
    try:
        if payload.course_id is not None and course:
            # Course-specific announcement: notify enrolled trainees
            enrollments = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == payload.course_id
            ).all()
            target_user_ids = [e.trainee_id for e in enrollments if e.trainee_id != current_user.id]

            for uid in target_user_ids:
                create_notification(
                    db,
                    user_id=uid,
                    title=f"📢 Announcement: {course.title}",
                    message=f"{announcement.title}: {announcement.content[:120]}",
                    type="ANNOUNCEMENT",
                    link=f"/trainee?tab=announcements#announcement_{announcement.id}",
                )
        else:
            # Global/institutional announcement (Admin only): notify active users safely
            active_users = db.query(User).filter(
                User.is_active == True,
                User.id != current_user.id
            ).limit(200).all()

            for u in active_users:
                dest_link = "/trainee?tab=announcements" if u.role == UserRole.TRAINEE else "/trainer?tab=announcements"
                create_notification(
                    db,
                    user_id=u.id,
                    title="📢 Campus Announcement",
                    message=f"{announcement.title}: {announcement.content[:120]}",
                    type="ANNOUNCEMENT",
                    link=dest_link,
                )
    except Exception as e:
        print(f"Error dispatching announcement notifications: {e}")

    return AnnouncementResponse(
        id=announcement.id,
        author_id=announcement.author_id,
        author_name=current_user.name,
        author_role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        course_id=announcement.course_id,
        course_title=course.title if course else None,
        title=announcement.title,
        content=announcement.content,
        created_at=announcement.created_at,
    )


@router.get("", response_model=List[AnnouncementResponse])
def get_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Announcement).options(
        joinedload(Announcement.author),
        joinedload(Announcement.course),
    )

    if current_user.role == UserRole.ADMIN:
        # Admins see all announcements
        announcements = query.order_by(Announcement.created_at.desc()).all()
    elif current_user.role == UserRole.TRAINER:
        # Trainers see global announcements + announcements for their courses
        my_course_ids = [c.id for c in db.query(Course.id).filter(Course.trainer_id == current_user.id).all()]
        announcements = query.filter(
            (Announcement.course_id.is_(None)) | (Announcement.course_id.in_(my_course_ids))
        ).order_by(Announcement.created_at.desc()).all()
    else:
        # Trainees see global announcements + announcements for enrolled courses
        enrolled_course_ids = [e.course_id for e in db.query(CourseEnrollment.course_id).filter(CourseEnrollment.trainee_id == current_user.id).all()]
        announcements = query.filter(
            (Announcement.course_id.is_(None)) | (Announcement.course_id.in_(enrolled_course_ids))
        ).order_by(Announcement.created_at.desc()).all()

    return [
        AnnouncementResponse(
            id=a.id,
            author_id=a.author_id,
            author_name=a.author.name if a.author else f"User #{a.author_id}",
            author_role=a.author.role.value if a.author and hasattr(a.author.role, 'value') else (str(a.author.role) if a.author else None),
            course_id=a.course_id,
            course_title=a.course.title if a.course else None,
            title=a.title,
            content=a.content,
            created_at=a.created_at,
        )
        for a in announcements
    ]
