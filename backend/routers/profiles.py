from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.user import User, UserRole
from models.profile import Skill, UserSkill, TraineeProfile, TrainerProfile, ProficiencyLevel
from schemas.profile import (
    SkillResponse,
    UserSkillCreate,
    UserSkillUpdate,
    UserSkillResponse,
    TraineeProfileUpdate,
    TraineeProfileResponse,
    TrainerProfileUpdate,
    TrainerProfileResponse,
    AdminUserProfileResponse,
)
from security import require_trainee, require_trainer, require_admin

router = APIRouter(prefix="/api", tags=["profiles-and-skills"])

INITIAL_SKILLS = [
    {"name": "Python", "category": "Programming & Development", "description": "High-level programming language for web, data analysis, and automation."},
    {"name": "Java", "category": "Programming & Development", "description": "Object-oriented, class-based language for enterprise backend systems."},
    {"name": "JavaScript", "category": "Programming & Development", "description": "Core client-side and server-side language for interactive web applications."},
    {"name": "React", "category": "Web Development", "description": "Declarative component-based UI library for modern frontend apps."},
    {"name": "FastAPI", "category": "Web Development", "description": "High-performance Python web framework for building modern REST APIs."},
    {"name": "SQL", "category": "Data & Databases", "description": "Structured Query Language for querying and managing relational databases."},
    {"name": "Database Management", "category": "Data & Databases", "description": "Design, indexing, optimization, and administration of database systems."},
    {"name": "Communication", "category": "Soft Skills & Professional", "description": "Effective verbal, written, and collaborative communication in institutional settings."},
    {"name": "Leadership", "category": "Soft Skills & Professional", "description": "Team leadership, mentorship, strategic vision, and decision making."},
    {"name": "Project Management", "category": "Management & Methodologies", "description": "Planning, scoping, agile execution, and delivery of training programs."},
    {"name": "Data Analysis", "category": "Data & Analytics", "description": "Extracting actionable insights from structured data using statistical methods."},
    {"name": "Cloud Computing", "category": "Cloud & Infrastructure", "description": "Deployment, containerization, and scaling across cloud architectures."},
    {"name": "Machine Learning", "category": "AI & Data Science", "description": "Supervised, unsupervised algorithms and predictive modeling techniques."},
    {"name": "Cybersecurity", "category": "Security & Governance", "description": "Information security principles, threat mitigation, and data protection policies."}
]


def seed_initial_skills(db: Session):
    for s in INITIAL_SKILLS:
        existing = db.query(Skill).filter(Skill.name == s["name"]).first()
        if not existing:
            new_skill = Skill(
                name=s["name"],
                category=s["category"],
                description=s["description"]
            )
            db.add(new_skill)
    db.commit()


# ==========================================
# GENERAL SKILLS CATALOG
# ==========================================

@router.get("/skills", response_model=List[SkillResponse])
def get_skills_catalog(db: Session = Depends(get_db)):
    skills = db.query(Skill).order_by(Skill.category.asc(), Skill.name.asc()).all()
    return skills


# ==========================================
# TRAINEE PROFILE & SKILLS
# ==========================================

def _get_trainee_profile_data(user: User, db: Session) -> TraineeProfileResponse:
    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == user.id).first()
    if not profile:
        profile = TraineeProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    user_skills = db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
    return TraineeProfileResponse(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role),
        qualification=profile.qualification,
        work_experience=profile.work_experience,
        interests=profile.interests,
        profile_summary=profile.profile_summary,
        updated_at=profile.updated_at,
        skills=user_skills
    )


@router.get("/trainee/profile", response_model=TraineeProfileResponse)
def get_trainee_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    return _get_trainee_profile_data(current_user, db)


@router.put("/trainee/profile", response_model=TraineeProfileResponse)
def update_trainee_profile(
    payload: TraineeProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == current_user.id).first()
    if not profile:
        profile = TraineeProfile(user_id=current_user.id)
        db.add(profile)

    if payload.qualification is not None:
        profile.qualification = payload.qualification
    if payload.work_experience is not None:
        profile.work_experience = payload.work_experience
    if payload.interests is not None:
        profile.interests = payload.interests
    if payload.profile_summary is not None:
        profile.profile_summary = payload.profile_summary

    db.commit()
    db.refresh(profile)
    return _get_trainee_profile_data(current_user, db)


@router.get("/trainee/skills", response_model=List[UserSkillResponse])
def get_trainee_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    return db.query(UserSkill).filter(UserSkill.user_id == current_user.id).all()


def _add_or_update_user_skill(
    user: User,
    payload: UserSkillCreate,
    db: Session
) -> UserSkill:
    skill = None
    if payload.skill_id:
        skill = db.query(Skill).filter(Skill.id == payload.skill_id).first()
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    elif payload.skill_name:
        clean_name = payload.skill_name.strip()
        skill = db.query(Skill).filter(Skill.name.ilike(clean_name)).first()
        if not skill:
            skill = Skill(
                name=clean_name,
                category=payload.category or "General",
                description=f"Skill: {clean_name}"
            )
            db.add(skill)
            db.commit()
            db.refresh(skill)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either skill_id or skill_name must be provided")

    # Check if user already has this skill
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == user.id,
        UserSkill.skill_id == skill.id
    ).first()

    prof_val = payload.proficiency.value if hasattr(payload.proficiency, 'value') else payload.proficiency

    if user_skill:
        user_skill.proficiency = prof_val
        if payload.evidence is not None:
            user_skill.evidence = payload.evidence
    else:
        user_skill = UserSkill(
            user_id=user.id,
            skill_id=skill.id,
            proficiency=prof_val,
            evidence=payload.evidence
        )
        db.add(user_skill)

    db.commit()
    db.refresh(user_skill)
    return user_skill


@router.post("/trainee/skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
def add_trainee_skill(
    payload: UserSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    return _add_or_update_user_skill(current_user, payload, db)


@router.put("/trainee/skills/{skill_id}", response_model=UserSkillResponse)
def update_trainee_skill(
    skill_id: int,
    payload: UserSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        (UserSkill.skill_id == skill_id) | (UserSkill.id == skill_id)
    ).first()

    if not user_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found for this trainee")

    if payload.proficiency is not None:
        prof_val = payload.proficiency.value if hasattr(payload.proficiency, 'value') else payload.proficiency
        user_skill.proficiency = prof_val
    if payload.evidence is not None:
        user_skill.evidence = payload.evidence

    db.commit()
    db.refresh(user_skill)
    return user_skill


@router.delete("/trainee/skills/{skill_id}")
def delete_trainee_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        (UserSkill.skill_id == skill_id) | (UserSkill.id == skill_id)
    ).first()

    if not user_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found for this trainee")

    db.delete(user_skill)
    db.commit()
    return {"message": "Skill removed successfully"}


# ==========================================
# TRAINER PROFILE & SKILLS
# ==========================================

def _get_trainer_profile_data(user: User, db: Session) -> TrainerProfileResponse:
    profile = db.query(TrainerProfile).filter(TrainerProfile.user_id == user.id).first()
    if not profile:
        profile = TrainerProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    user_skills = db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
    return TrainerProfileResponse(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role),
        qualification=profile.qualification,
        specialization=profile.specialization,
        work_experience=profile.work_experience,
        expertise_summary=profile.expertise_summary,
        updated_at=profile.updated_at,
        skills=user_skills
    )


@router.get("/trainer/profile", response_model=TrainerProfileResponse)
def get_trainer_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    return _get_trainer_profile_data(current_user, db)


@router.put("/trainer/profile", response_model=TrainerProfileResponse)
def update_trainer_profile(
    payload: TrainerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    profile = db.query(TrainerProfile).filter(TrainerProfile.user_id == current_user.id).first()
    if not profile:
        profile = TrainerProfile(user_id=current_user.id)
        db.add(profile)

    if payload.qualification is not None:
        profile.qualification = payload.qualification
    if payload.specialization is not None:
        profile.specialization = payload.specialization
    if payload.work_experience is not None:
        profile.work_experience = payload.work_experience
    if payload.expertise_summary is not None:
        profile.expertise_summary = payload.expertise_summary

    db.commit()
    db.refresh(profile)
    return _get_trainer_profile_data(current_user, db)


@router.get("/trainer/skills", response_model=List[UserSkillResponse])
def get_trainer_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    return db.query(UserSkill).filter(UserSkill.user_id == current_user.id).all()


@router.post("/trainer/skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
def add_trainer_skill(
    payload: UserSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    return _add_or_update_user_skill(current_user, payload, db)


@router.put("/trainer/skills/{skill_id}", response_model=UserSkillResponse)
def update_trainer_skill(
    skill_id: int,
    payload: UserSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        (UserSkill.skill_id == skill_id) | (UserSkill.id == skill_id)
    ).first()

    if not user_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found for this trainer")

    if payload.proficiency is not None:
        prof_val = payload.proficiency.value if hasattr(payload.proficiency, 'value') else payload.proficiency
        user_skill.proficiency = prof_val
    if payload.evidence is not None:
        user_skill.evidence = payload.evidence

    db.commit()
    db.refresh(user_skill)
    return user_skill


@router.delete("/trainer/skills/{skill_id}")
def delete_trainer_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        (UserSkill.skill_id == skill_id) | (UserSkill.id == skill_id)
    ).first()

    if not user_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found for this trainer")

    db.delete(user_skill)
    db.commit()
    return {"message": "Skill removed successfully"}


# ==========================================
# ADMIN INSPECTION ENDPOINTS
# ==========================================

@router.get("/admin/users/{user_id}/profile", response_model=AdminUserProfileResponse)
def get_user_profile_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_skills = db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
    trainee_prof = None
    trainer_prof = None

    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    if role_str == "TRAINEE":
        trainee_prof = _get_trainee_profile_data(user, db)
    elif role_str == "TRAINER":
        trainer_prof = _get_trainer_profile_data(user, db)

    return AdminUserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=role_str,
        status=user.status.value if hasattr(user.status, 'value') else str(user.status),
        trainee_profile=trainee_prof,
        trainer_profile=trainer_prof,
        skills=user_skills
    )


@router.get("/admin/users/{user_id}/skills", response_model=List[UserSkillResponse])
def get_user_skills_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
