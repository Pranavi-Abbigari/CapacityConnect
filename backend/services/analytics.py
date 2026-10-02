import csv
import io
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import func

from models.user import User, UserRole
from models.course import Course, CourseEnrollment
from models.quiz import Quiz, Attempt
from models.profile import Skill, UserSkill, CourseCompetency, ProficiencyLevel
from models.certificate import Certificate, CertificateStatus
from services.completion import DEFAULT_PASSING_SCORE
from schemas.analytics import (
    AnalyticsKPIs,
    CourseCompletionMetric,
    SkillAcquisitionItem,
    SkillGapItem,
    SkillIntelligence,
    TrainerPerformanceMetric,
    AdminAnalyticsOverviewResponse,
)

PROFICIENCY_SCORES = {
    "Beginner": 1,
    "Intermediate": 2,
    "Advanced": 3,
    "Expert": 4,
}


def get_admin_analytics_overview(db: Session) -> AdminAnalyticsOverviewResponse:
    # 1. KPIs
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_trainees = db.query(func.count(User.id)).filter(User.role == UserRole.TRAINEE).scalar() or 0
    total_trainers = db.query(func.count(User.id)).filter(User.role == UserRole.TRAINER).scalar() or 0
    total_courses = db.query(func.count(Course.id)).scalar() or 0
    total_enrollments = db.query(func.count(CourseEnrollment.id)).scalar() or 0
    completed_enrollments = (
        db.query(func.count(CourseEnrollment.id))
        .filter(CourseEnrollment.completed_at.isnot(None))
        .scalar() or 0
    )
    overall_completion_rate = (
        round((completed_enrollments / total_enrollments) * 100.0, 1) if total_enrollments > 0 else 0.0
    )
    total_quizzes = db.query(func.count(Quiz.id)).scalar() or 0
    total_attempts = db.query(func.count(Attempt.id)).scalar() or 0
    platform_avg_score = db.query(func.avg(Attempt.score)).scalar()
    platform_average_quiz_score = round(float(platform_avg_score), 1) if platform_avg_score is not None else 0.0

    total_certificates_issued = db.query(func.count(Certificate.id)).scalar() or 0
    active_certificates = (
        db.query(func.count(Certificate.id))
        .filter(Certificate.status == CertificateStatus.ACTIVE)
        .scalar() or 0
    )
    revoked_certificates = (
        db.query(func.count(Certificate.id))
        .filter(Certificate.status == CertificateStatus.REVOKED)
        .scalar() or 0
    )

    kpis = AnalyticsKPIs(
        total_users=total_users,
        total_trainees=total_trainees,
        total_trainers=total_trainers,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        completed_enrollments=completed_enrollments,
        overall_completion_rate=overall_completion_rate,
        total_quizzes=total_quizzes,
        total_attempts=total_attempts,
        platform_average_quiz_score=platform_average_quiz_score,
        total_certificates_issued=total_certificates_issued,
        active_certificates=active_certificates,
        revoked_certificates=revoked_certificates,
    )

    # 2. Course Completion Metrics
    courses = db.query(Course).all()
    completion_metrics: List[CourseCompletionMetric] = []
    for c in courses:
        enrolled_count = db.query(func.count(CourseEnrollment.id)).filter(CourseEnrollment.course_id == c.id).scalar() or 0
        comp_count = (
            db.query(func.count(CourseEnrollment.id))
            .filter(CourseEnrollment.course_id == c.id, CourseEnrollment.completed_at.isnot(None))
            .scalar() or 0
        )
        comp_rate = round((comp_count / enrolled_count) * 100.0, 1) if enrolled_count > 0 else 0.0

        # Course average quiz score
        avg_score_val = (
            db.query(func.avg(Attempt.score))
            .join(Quiz, Attempt.quiz_id == Quiz.id)
            .filter(Quiz.course_id == c.id)
            .scalar()
        )
        avg_quiz_score = round(float(avg_score_val), 1) if avg_score_val is not None else 0.0

        trainer_name = c.trainer.name if c.trainer else "Unknown"
        completion_metrics.append(
            CourseCompletionMetric(
                course_id=c.id,
                course_title=c.title,
                trainer_name=trainer_name,
                total_enrolled=enrolled_count,
                completed_count=comp_count,
                completion_rate=comp_rate,
                average_quiz_score=avg_quiz_score,
            )
        )

    # 3. Grade Distribution
    grade_distribution: Dict[str, int] = {
        "A+": 0,
        "A": 0,
        "B": 0,
        "C": 0,
        "Pass": 0,
        "Fail": 0,
    }
    cert_grades = db.query(Certificate.grade, func.count(Certificate.id)).group_by(Certificate.grade).all()
    for g, count in cert_grades:
        if not g:
            continue
        g_clean = g.strip()
        if g_clean in grade_distribution:
            grade_distribution[g_clean] += count
        elif g_clean.upper() == "PASS":
            grade_distribution["Pass"] += count
        elif g_clean.upper() == "FAIL":
            grade_distribution["Fail"] += count

    # Also count attempts with score < DEFAULT_PASSING_SCORE as Fail if grade_distribution["Fail"] == 0
    failed_attempts = db.query(func.count(Attempt.id)).filter(Attempt.score < DEFAULT_PASSING_SCORE).scalar() or 0
    if grade_distribution["Fail"] == 0:
        grade_distribution["Fail"] = failed_attempts

    # 4. Skill Intelligence
    # Most acquired skills
    acquired_skills_rows = (
        db.query(Skill.id, Skill.name, Skill.category, func.count(UserSkill.id).label("learner_count"))
        .join(UserSkill, Skill.id == UserSkill.skill_id)
        .group_by(Skill.id, Skill.name, Skill.category)
        .order_by(func.count(UserSkill.id).desc())
        .limit(10)
        .all()
    )
    most_acquired_skills: List[SkillAcquisitionItem] = [
        SkillAcquisitionItem(
            skill_id=row[0],
            skill_name=row[1],
            category=row[2],
            learner_count=row[3],
        )
        for row in acquired_skills_rows
    ]

    # Top skill gaps from enrolled courses and competency requirements
    enrollments = db.query(CourseEnrollment).all()
    user_skills_all = db.query(UserSkill).all()
    user_skills_map: Dict[int, Dict[int, int]] = {}
    for us in user_skills_all:
        lvl_str = us.proficiency.value if hasattr(us.proficiency, "value") else str(us.proficiency)
        user_skills_map.setdefault(us.user_id, {})[us.skill_id] = PROFICIENCY_SCORES.get(lvl_str, 1)

    competencies_all = db.query(CourseCompetency).all()
    course_comps: Dict[int, List[CourseCompetency]] = {}
    skill_names: Dict[int, str] = {}
    for comp in competencies_all:
        course_comps.setdefault(comp.course_id, []).append(comp)
        if comp.skill:
            skill_names[comp.skill_id] = comp.skill.name

    gap_counter: Dict[int, int] = {}
    for enr in enrollments:
        comps = course_comps.get(enr.course_id, [])
        trainee_skills = user_skills_map.get(enr.trainee_id, {})
        for comp in comps:
            req_str = comp.min_proficiency.value if hasattr(comp.min_proficiency, "value") else str(comp.min_proficiency)
            req_score = PROFICIENCY_SCORES.get(req_str, 1)
            trainee_score = trainee_skills.get(comp.skill_id, 0)
            if trainee_score < req_score:
                gap_counter[comp.skill_id] = gap_counter.get(comp.skill_id, 0) + 1

    sorted_gaps = sorted(gap_counter.items(), key=lambda x: x[1], reverse=True)[:10]
    top_skill_gaps: List[SkillGapItem] = [
        SkillGapItem(
            skill_id=sid,
            skill_name=skill_names.get(sid, f"Skill #{sid}"),
            gap_count=cnt,
        )
        for sid, cnt in sorted_gaps
    ]

    skill_intelligence = SkillIntelligence(
        most_acquired_skills=most_acquired_skills,
        top_skill_gaps=top_skill_gaps,
    )

    # 5. Trainer Performance
    trainers = db.query(User).filter(User.role == UserRole.TRAINER).all()
    trainer_performance: List[TrainerPerformanceMetric] = []
    for t in trainers:
        trainer_courses = db.query(Course).filter(Course.trainer_id == t.id).all()
        course_ids = [cr.id for cr in trainer_courses]
        total_courses_count = len(trainer_courses)

        total_students = 0
        completion_rate = 0.0
        avg_student_score = 0.0

        if course_ids:
            total_students = (
                db.query(func.count(func.distinct(CourseEnrollment.trainee_id)))
                .filter(CourseEnrollment.course_id.in_(course_ids))
                .scalar() or 0
            )

            total_enr = (
                db.query(func.count(CourseEnrollment.id))
                .filter(CourseEnrollment.course_id.in_(course_ids))
                .scalar() or 0
            )
            completed_enr = (
                db.query(func.count(CourseEnrollment.id))
                .filter(
                    CourseEnrollment.course_id.in_(course_ids),
                    CourseEnrollment.completed_at.isnot(None),
                )
                .scalar() or 0
            )
            completion_rate = round((completed_enr / total_enr) * 100.0, 1) if total_enr > 0 else 0.0

            avg_score_raw = (
                db.query(func.avg(Attempt.score))
                .join(Quiz, Attempt.quiz_id == Quiz.id)
                .filter(Quiz.course_id.in_(course_ids))
                .scalar()
            )
            avg_student_score = round(float(avg_score_raw), 1) if avg_score_raw is not None else 0.0

        trainer_performance.append(
            TrainerPerformanceMetric(
                trainer_id=t.id,
                trainer_name=t.name,
                total_courses=total_courses_count,
                total_students=total_students,
                average_student_score=avg_student_score,
                completion_rate=completion_rate,
            )
        )

    return AdminAnalyticsOverviewResponse(
        kpis=kpis,
        completion_metrics=completion_metrics,
        grade_distribution=grade_distribution,
        skill_intelligence=skill_intelligence,
        trainer_performance=trainer_performance,
    )


def generate_enrollments_csv(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Enrollment ID",
        "Course ID",
        "Course Title",
        "Trainee ID",
        "Trainee Name",
        "Trainee Email",
        "Enrolled At",
        "Completed At",
        "Status",
        "Average Score",
    ])

    enrollments = db.query(CourseEnrollment).all()
    for enr in enrollments:
        status_val = "COMPLETED" if enr.completed_at else "IN_PROGRESS"

        # Trainee avg score for this course
        avg_score_raw = (
            db.query(func.avg(Attempt.score))
            .join(Quiz, Attempt.quiz_id == Quiz.id)
            .filter(Quiz.course_id == enr.course_id, Attempt.trainee_id == enr.trainee_id)
            .scalar()
        )
        avg_score_str = f"{round(float(avg_score_raw), 1)}%" if avg_score_raw is not None else "N/A"

        course_title = enr.course.title if enr.course else f"Course #{enr.course_id}"
        trainee_name = enr.trainee.name if enr.trainee else f"User #{enr.trainee_id}"
        trainee_email = enr.trainee.email if enr.trainee else "N/A"
        enrolled_at_str = enr.enrolled_at.strftime("%Y-%m-%d %H:%M:%S") if enr.enrolled_at else "N/A"
        completed_at_str = enr.completed_at.strftime("%Y-%m-%d %H:%M:%S") if enr.completed_at else "N/A"

        writer.writerow([
            enr.id,
            enr.course_id,
            course_title,
            enr.trainee_id,
            trainee_name,
            trainee_email,
            enrolled_at_str,
            completed_at_str,
            status_val,
            avg_score_str,
        ])

    return output.getvalue()


def generate_certificates_csv(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Certificate ID",
        "Certificate Code",
        "Course ID",
        "Course Title",
        "Trainee ID",
        "Trainee Name",
        "Issuer Name",
        "Issue Date",
        "Grade",
        "Status",
        "Verification Hash",
    ])

    certs = db.query(Certificate).all()
    for cert in certs:
        course_title = cert.course.title if cert.course else f"Course #{cert.course_id}"
        trainee_name = cert.trainee.name if cert.trainee else f"User #{cert.trainee_id}"
        issuer_name = cert.issuer.name if cert.issuer else "System Admin"
        issue_date_str = cert.issue_date.strftime("%Y-%m-%d %H:%M:%S") if cert.issue_date else "N/A"
        status_str = cert.status.value if hasattr(cert.status, "value") else str(cert.status)

        writer.writerow([
            cert.id,
            cert.certificate_code,
            cert.course_id,
            course_title,
            cert.trainee_id,
            trainee_name,
            issuer_name,
            issue_date_str,
            cert.grade or "N/A",
            status_str,
            cert.verification_hash,
        ])

    return output.getvalue()


def generate_courses_performance_csv(db: Session) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Course ID",
        "Course Title",
        "Trainer ID",
        "Trainer Name",
        "Total Enrolled",
        "Completed Count",
        "Completion Rate %",
        "Avg Score %",
        "Certificates Issued",
    ])

    courses = db.query(Course).all()
    for c in courses:
        trainer_name = c.trainer.name if c.trainer else "Unknown"
        total_enrolled = (
            db.query(func.count(CourseEnrollment.id)).filter(CourseEnrollment.course_id == c.id).scalar() or 0
        )
        completed_count = (
            db.query(func.count(CourseEnrollment.id))
            .filter(CourseEnrollment.course_id == c.id, CourseEnrollment.completed_at.isnot(None))
            .scalar() or 0
        )
        completion_rate = (
            round((completed_count / total_enrolled) * 100.0, 1) if total_enrolled > 0 else 0.0
        )

        avg_score_raw = (
            db.query(func.avg(Attempt.score))
            .join(Quiz, Attempt.quiz_id == Quiz.id)
            .filter(Quiz.course_id == c.id)
            .scalar()
        )
        avg_score = round(float(avg_score_raw), 1) if avg_score_raw is not None else 0.0

        certs_count = (
            db.query(func.count(Certificate.id)).filter(Certificate.course_id == c.id).scalar() or 0
        )

        writer.writerow([
            c.id,
            c.title,
            c.trainer_id,
            trainer_name,
            total_enrolled,
            completed_count,
            f"{completion_rate}%",
            f"{avg_score}%",
            certs_count,
        ])

    return output.getvalue()
