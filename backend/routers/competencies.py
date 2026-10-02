from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.user import User, UserRole, UserStatus
from models.course import Course, CourseStatus, CourseEnrollment
from models.profile import Skill, UserSkill, CourseCompetency, TrainerProfile, TraineeProfile, ProficiencyLevel
from schemas.competency import (
    CourseCompetencyCreate,
    CourseCompetencyUpdate,
    CourseCompetencyResponse,
    SkillGapItem,
    CourseRecommendation,
    TraineeCourseSkillGapResponse,
    TraineeOverallSkillGapResponse,
    TrainerCompetencyCoverage,
    TrainerMatchItem,
    CourseTrainerMatchingResponse,
)
from security import require_trainee, require_trainer, require_admin, get_current_user

router = APIRouter(prefix="/api", tags=["competencies-and-matching"])

PROFICIENCY_SCORES = {
    "Beginner": 1,
    "Intermediate": 2,
    "Advanced": 3,
    "Expert": 4,
}


def _verify_course_ownership_or_admin(course: Course, current_user: User):
    role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_str == "ADMIN":
        return
    if course.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage competency requirements for your own courses."
        )


# ==========================================
# 1. COURSE COMPETENCY REQUIREMENTS
# ==========================================

@router.get("/courses/{course_id}/competencies", response_model=List[CourseCompetencyResponse])
def get_course_competencies(
    course_id: int,
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return db.query(CourseCompetency).filter(CourseCompetency.course_id == course_id).all()


@router.post("/courses/{course_id}/competencies", response_model=CourseCompetencyResponse, status_code=status.HTTP_201_CREATED)
def add_course_competency(
    course_id: int,
    payload: CourseCompetencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    _verify_course_ownership_or_admin(course, current_user)

    skill = None
    if payload.skill_id:
        skill = db.query(Skill).filter(Skill.id == payload.skill_id).first()
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found in catalog")
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either skill_id or skill_name is required")

    # Check for existing competency requirement on this course
    existing = db.query(CourseCompetency).filter(
        CourseCompetency.course_id == course_id,
        CourseCompetency.skill_id == skill.id
    ).first()

    prof_val = payload.min_proficiency.value if hasattr(payload.min_proficiency, 'value') else payload.min_proficiency
    weight_val = payload.weight if payload.weight and payload.weight > 0 else 1

    if existing:
        existing.min_proficiency = prof_val
        existing.weight = weight_val
        db.commit()
        db.refresh(existing)
        return existing

    new_comp = CourseCompetency(
        course_id=course_id,
        skill_id=skill.id,
        min_proficiency=prof_val,
        weight=weight_val
    )
    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)
    return new_comp


@router.put("/courses/{course_id}/competencies/{competency_id}", response_model=CourseCompetencyResponse)
def update_course_competency(
    course_id: int,
    competency_id: int,
    payload: CourseCompetencyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    _verify_course_ownership_or_admin(course, current_user)

    competency = db.query(CourseCompetency).filter(
        CourseCompetency.id == competency_id,
        CourseCompetency.course_id == course_id
    ).first()

    if not competency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competency requirement not found on this course")

    if payload.min_proficiency is not None:
        competency.min_proficiency = payload.min_proficiency.value if hasattr(payload.min_proficiency, 'value') else payload.min_proficiency
    if payload.weight is not None and payload.weight > 0:
        competency.weight = payload.weight

    db.commit()
    db.refresh(competency)
    return competency


@router.delete("/courses/{course_id}/competencies/{competency_id}")
def delete_course_competency(
    course_id: int,
    competency_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    _verify_course_ownership_or_admin(course, current_user)

    competency = db.query(CourseCompetency).filter(
        CourseCompetency.id == competency_id,
        CourseCompetency.course_id == course_id
    ).first()

    if not competency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competency requirement not found on this course")

    db.delete(competency)
    db.commit()
    return {"message": "Competency requirement removed successfully"}


# ==========================================
# 2. TRAINEE SKILL-GAP ANALYSIS & RECOMMENDATIONS
# ==========================================

def _compute_trainee_course_gap(trainee: User, course: Course, db: Session) -> TraineeCourseSkillGapResponse:
    competencies = db.query(CourseCompetency).filter(CourseCompetency.course_id == course.id).all()
    user_skills_list = db.query(UserSkill).filter(UserSkill.user_id == trainee.id).all()
    user_skills_map = {us.skill_id: us for us in user_skills_list}

    matched_skills: List[SkillGapItem] = []
    insufficient_skills: List[SkillGapItem] = []
    missing_skills: List[SkillGapItem] = []

    total_weight = 0
    earned_score = 0.0

    for comp in competencies:
        w = comp.weight if comp.weight and comp.weight > 0 else 1
        total_weight += w

        req_level_str = comp.min_proficiency.value if hasattr(comp.min_proficiency, 'value') else str(comp.min_proficiency)
        req_val = PROFICIENCY_SCORES.get(req_level_str, 1)

        us = user_skills_map.get(comp.skill_id)

        if not us:
            missing_skills.append(
                SkillGapItem(
                    skill_id=comp.skill_id,
                    skill_name=comp.skill.name if comp.skill else f"Skill #{comp.skill_id}",
                    category=comp.skill.category if comp.skill else None,
                    required_proficiency=comp.min_proficiency,
                    trainee_proficiency=None,
                    status="MISSING",
                    weight=w,
                    score_awarded=0.0,
                    gap_message=f"Missing competency: required minimum level is {req_level_str}."
                )
            )
        else:
            trainee_level_str = us.proficiency.value if hasattr(us.proficiency, 'value') else str(us.proficiency)
            trainee_val = PROFICIENCY_SCORES.get(trainee_level_str, 1)

            if trainee_val >= req_val:
                score = float(w)
                earned_score += score
                matched_skills.append(
                    SkillGapItem(
                        skill_id=comp.skill_id,
                        skill_name=comp.skill.name if comp.skill else f"Skill #{comp.skill_id}",
                        category=comp.skill.category if comp.skill else None,
                        required_proficiency=comp.min_proficiency,
                        trainee_proficiency=us.proficiency,
                        status="MATCHED",
                        weight=w,
                        score_awarded=score,
                        gap_message=f"Verified match: {trainee_level_str} meets or exceeds required {req_level_str}."
                    )
                )
            else:
                score = round(float(w) * (trainee_val / req_val), 2)
                earned_score += score
                insufficient_skills.append(
                    SkillGapItem(
                        skill_id=comp.skill_id,
                        skill_name=comp.skill.name if comp.skill else f"Skill #{comp.skill_id}",
                        category=comp.skill.category if comp.skill else None,
                        required_proficiency=comp.min_proficiency,
                        trainee_proficiency=us.proficiency,
                        status="INSUFFICIENT",
                        weight=w,
                        score_awarded=score,
                        gap_message=f"Insufficient proficiency: current {trainee_level_str} is below required {req_level_str}."
                    )
                )

    match_percentage = round((earned_score / total_weight) * 100, 1) if total_weight > 0 else 100.0

    # Real database course recommendations targeting gap skills
    recommendations: List[CourseRecommendation] = []
    gap_skill_ids = [item.skill_id for item in missing_skills + insufficient_skills]

    if gap_skill_ids:
        # Find other published courses that cover these gap skills
        candidate_comps = db.query(CourseCompetency).join(Course).filter(
            Course.status == CourseStatus.PUBLISHED,
            Course.id != course.id,
            CourseCompetency.skill_id.in_(gap_skill_ids)
        ).all()

        course_to_skills = {}
        for c_comp in candidate_comps:
            c_id = c_comp.course_id
            if c_id not in course_to_skills:
                course_to_skills[c_id] = {
                    "course": c_comp.course,
                    "skills": []
                }
            skill_name = c_comp.skill.name if c_comp.skill else f"Skill #{c_comp.skill_id}"
            if skill_name not in course_to_skills[c_id]["skills"]:
                course_to_skills[c_id]["skills"].append(skill_name)

        for c_id, data in course_to_skills.items():
            c = data["course"]
            skills_str = ", ".join(data["skills"])
            recommendations.append(
                CourseRecommendation(
                    course_id=c.id,
                    title=c.title,
                    description=c.description,
                    skills_covered=data["skills"],
                    reason=f"Recommended bridge module: develops {skills_str} required for this course."
                )
            )

    return TraineeCourseSkillGapResponse(
        trainee_id=trainee.id,
        trainee_name=trainee.name,
        course_id=course.id,
        course_title=course.title,
        match_percentage=match_percentage,
        total_competencies=len(competencies),
        matched_count=len(matched_skills),
        insufficient_count=len(insufficient_skills),
        missing_count=len(missing_skills),
        matched_skills=matched_skills,
        insufficient_skills=insufficient_skills,
        missing_skills=missing_skills,
        recommendations=recommendations
    )


@router.get("/trainee/skill-gap/{course_id}", response_model=TraineeCourseSkillGapResponse)
def get_trainee_course_skill_gap(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return _compute_trainee_course_gap(current_user, course, db)


@router.get("/trainee/skill-gap", response_model=TraineeOverallSkillGapResponse)
def get_trainee_overall_skill_gap(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    # Retrieve all courses the trainee is enrolled in
    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.trainee_id == current_user.id).all()
    enrolled_courses = [enr.course for enr in enrollments if enr.course]

    # If not enrolled in any, inspect all published courses to give comprehensive baseline
    if not enrolled_courses:
        enrolled_courses = db.query(Course).filter(Course.status == CourseStatus.PUBLISHED).limit(5).all()

    course_gaps: List[TraineeCourseSkillGapResponse] = []
    total_pct = 0.0
    all_gap_skills_set = set()
    aggregated_recommendations: List[CourseRecommendation] = []
    seen_rec_courses = set()

    for c in enrolled_courses:
        gap = _compute_trainee_course_gap(current_user, c, db)
        course_gaps.append(gap)
        total_pct += gap.match_percentage

        for m in gap.missing_skills:
            all_gap_skills_set.add(m.skill_name)
        for i in gap.insufficient_skills:
            all_gap_skills_set.add(i.skill_name)

        for rec in gap.recommendations:
            if rec.course_id not in seen_rec_courses:
                seen_rec_courses.add(rec.course_id)
                aggregated_recommendations.append(rec)

    avg_match = round(total_pct / len(course_gaps), 1) if course_gaps else 100.0

    return TraineeOverallSkillGapResponse(
        trainee_id=current_user.id,
        trainee_name=current_user.name,
        total_enrolled_courses=len(enrollments),
        average_match_percentage=avg_match,
        course_gaps=course_gaps,
        all_gap_skills=sorted(list(all_gap_skills_set)),
        curated_recommendations=aggregated_recommendations
    )


@router.get("/trainee/recommendations", response_model=List[CourseRecommendation])
def get_trainee_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainee)
):
    overall_gap = get_trainee_overall_skill_gap(db=db, current_user=current_user)
    return overall_gap.curated_recommendations


# ==========================================
# 3. TRAINER MATCHING ALGORITHM
# ==========================================

def _compute_trainer_matches_for_course(course: Course, db: Session) -> CourseTrainerMatchingResponse:
    competencies = db.query(CourseCompetency).filter(CourseCompetency.course_id == course.id).all()
    total_weight = sum(comp.weight if comp.weight and comp.weight > 0 else 1 for comp in competencies)

    # Get all active approved trainers
    trainers = db.query(User).filter(
        User.role == UserRole.TRAINER,
        User.status == UserStatus.APPROVED
    ).all()

    ranked_trainers: List[TrainerMatchItem] = []

    for trainer in trainers:
        trainer_skills = db.query(UserSkill).filter(UserSkill.user_id == trainer.id).all()
        trainer_skills_map = {us.skill_id: us for us in trainer_skills}
        trainer_profile = db.query(TrainerProfile).filter(TrainerProfile.user_id == trainer.id).first()

        matched_list: List[TrainerCompetencyCoverage] = []
        insufficient_list: List[TrainerCompetencyCoverage] = []
        missing_list: List[TrainerCompetencyCoverage] = []

        earned_score = 0.0

        for comp in competencies:
            w = comp.weight if comp.weight and comp.weight > 0 else 1
            req_level_str = comp.min_proficiency.value if hasattr(comp.min_proficiency, 'value') else str(comp.min_proficiency)
            req_val = PROFICIENCY_SCORES.get(req_level_str, 1)

            us = trainer_skills_map.get(comp.skill_id)

            if not us:
                missing_list.append(
                    TrainerCompetencyCoverage(
                        skill_id=comp.skill_id,
                        skill_name=comp.skill.name if comp.skill else f"Skill #{comp.skill_id}",
                        category=comp.skill.category if comp.skill else None,
                        required_proficiency=comp.min_proficiency,
                        trainer_proficiency=None,
                        status="MISSING",
                        weight=w,
                        score_awarded=0.0,
                        message="Expertise missing: skill not declared in trainer profile."
                    )
                )
            else:
                trainer_level_str = us.proficiency.value if hasattr(us.proficiency, 'value') else str(us.proficiency)
                trainer_val = PROFICIENCY_SCORES.get(trainer_level_str, 1)

                if trainer_val >= req_val:
                    score = float(w)
                    earned_score += score
                    matched_list.append(
                        TrainerCompetencyCoverage(
                            skill_id=comp.skill_id,
                            skill_name=comp.skill.name if comp.skill else f"Skill #{comp.skill_id}",
                            category=comp.skill.category if comp.skill else None,
                            required_proficiency=comp.min_proficiency,
                            trainer_proficiency=us.proficiency,
                            status="MATCHED",
                            weight=w,
                            score_awarded=score,
                            message=f"Full mastery: {trainer_level_str} meets/exceeds course required {req_level_str}."
                        )
                    )
                else:
                    score = round(float(w) * (trainer_val / req_val), 2)
                    earned_score += score
                    insufficient_list.append(
                        TrainerCompetencyCoverage(
                            skill_id=comp.skill_id,
                            skill_name=comp.skill.name if comp.skill else f"Skill #{comp.skill_id}",
                            category=comp.skill.category if comp.skill else None,
                            required_proficiency=comp.min_proficiency,
                            trainer_proficiency=us.proficiency,
                            status="INSUFFICIENT",
                            weight=w,
                            score_awarded=score,
                            message=f"Partial mastery: declared {trainer_level_str} is below required {req_level_str}."
                        )
                    )

        match_pct = round((earned_score / total_weight) * 100, 1) if total_weight > 0 else 100.0

        ranked_trainers.append(
            TrainerMatchItem(
                trainer_id=trainer.id,
                trainer_name=trainer.name,
                trainer_email=trainer.email,
                qualification=trainer_profile.qualification if trainer_profile else None,
                specialization=trainer_profile.specialization if trainer_profile else None,
                match_percentage=match_pct,
                matched_skills_count=len(matched_list),
                total_skills_count=len(competencies),
                matched_competencies=matched_list,
                insufficient_competencies=insufficient_list,
                missing_competencies=missing_list
            )
        )

    # Rank trainers by match_percentage descending, then by matched_skills_count descending
    ranked_trainers.sort(key=lambda t: (t.match_percentage, t.matched_skills_count), reverse=True)

    return CourseTrainerMatchingResponse(
        course_id=course.id,
        course_title=course.title,
        required_competencies_count=len(competencies),
        required_competencies=competencies,
        total_trainers_evaluated=len(trainers),
        ranked_trainers=ranked_trainers
    )


@router.get("/courses/{course_id}/trainer-matches", response_model=CourseTrainerMatchingResponse)
def get_course_trainer_matches(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_trainer)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return _compute_trainer_matches_for_course(course, db)


@router.get("/admin/trainer-matching/{course_id}", response_model=CourseTrainerMatchingResponse)
def get_admin_trainer_matching(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return _compute_trainer_matches_for_course(course, db)
