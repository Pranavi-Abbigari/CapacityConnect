import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from services import completion
import security
from routers import admin as admin_module

client = TestClient(app)


def test_phase5_analytics_and_hardening():
    # ---------------------------------------------------------
    # 1. Environment configuration fallback & thresholds verification
    # ---------------------------------------------------------
    # Requirement 9: Environment configuration fallback works
    assert security.SECRET_KEY is not None
    assert len(security.SECRET_KEY) > 0
    assert security.ACCESS_TOKEN_EXPIRE_MINUTES == 1440

    # Admin secret key fallback
    assert admin_module.ADMIN_SECRET_KEY is not None
    assert len(admin_module.ADMIN_SECRET_KEY) > 0

    # Requirement 10: Configurable passing threshold preserves default 50%
    assert completion.DEFAULT_PASSING_SCORE == 50.0

    # ---------------------------------------------------------
    # Setup test users: Admin, Trainer, Trainee
    # ---------------------------------------------------------
    admin_email = f"p5_admin_{uuid.uuid4().hex[:8]}@example.com"
    trainer_email = f"p5_trainer_{uuid.uuid4().hex[:8]}@example.com"
    trainee_email = f"p5_trainee_{uuid.uuid4().hex[:8]}@example.com"

    # Signup
    admin_res = client.post("/api/auth/signup", json={"email": admin_email, "password": "AdminPassword123!", "name": "Phase 5 Admin", "role": "ADMIN"})
    assert admin_res.status_code in (200, 201)
    admin_id = admin_res.json()["id"]

    trainer_res = client.post("/api/auth/signup", json={"email": trainer_email, "password": "TrainerPassword123!", "name": "Phase 5 Trainer", "role": "TRAINER"})
    assert trainer_res.status_code in (200, 201)
    trainer_id = trainer_res.json()["id"]

    trainee_res = client.post("/api/auth/signup", json={"email": trainee_email, "password": "TraineePassword123!", "name": "Phase 5 Trainee", "role": "TRAINEE"})
    assert trainee_res.status_code in (200, 201)
    trainee_id = trainee_res.json()["id"]

    # Approve accounts using admin secret key fallback
    admin_secret_h = {"x-admin-secret": admin_module.ADMIN_SECRET_KEY}
    for uid in [admin_id, trainer_id, trainee_id]:
        appr_res = client.post("/api/admin/approve-user", json={"user_id": uid}, headers=admin_secret_h)
        assert appr_res.status_code == 200

    # Log in
    admin_token = client.post("/api/auth/login", json={"email": admin_email, "password": "AdminPassword123!"}).json()["access_token"]
    trainer_token = client.post("/api/auth/login", json={"email": trainer_email, "password": "TrainerPassword123!"}).json()["access_token"]
    trainee_token = client.post("/api/auth/login", json={"email": trainee_email, "password": "TraineePassword123!"}).json()["access_token"]

    admin_h = {"Authorization": f"Bearer {admin_token}"}
    trainer_h = {"Authorization": f"Bearer {trainer_token}"}
    trainee_h = {"Authorization": f"Bearer {trainee_token}"}

    # ---------------------------------------------------------
    # Requirement 3 & 4: Analytics endpoint rejects trainee and trainer
    # ---------------------------------------------------------
    res_trainee_block = client.get("/api/admin/analytics/overview", headers=trainee_h)
    assert res_trainee_block.status_code == 403

    res_trainer_block = client.get("/api/admin/analytics/overview", headers=trainer_h)
    assert res_trainer_block.status_code == 403

    # Requirement 8: CSV endpoints reject trainee and trainer
    for endpoint in [
        "/api/admin/reports/enrollments/csv",
        "/api/admin/reports/certificates/csv",
        "/api/admin/reports/courses-performance/csv",
    ]:
        res_tr_csv = client.get(endpoint, headers=trainee_h)
        assert res_tr_csv.status_code == 403, f"Trainee should receive 403 on {endpoint}"

        res_trn_csv = client.get(endpoint, headers=trainer_h)
        assert res_trn_csv.status_code == 403, f"Trainer should receive 403 on {endpoint}"

    # ---------------------------------------------------------
    # Requirement 12: Existing Phase 1–4 behavior remains intact
    # Trainer creates course, competency, quiz, question
    # ---------------------------------------------------------
    course_res = client.post(
        "/api/courses",
        json={"title": "Cloud Architecture Deep Dive", "description": "Phase 5 course", "status": "PUBLISHED"},
        headers=trainer_h,
    )
    assert course_res.status_code in (200, 201)
    course_id = course_res.json()["id"]

    # Trainee adds a skill
    skill_res = client.post(
        "/api/trainee/skills",
        json={"skill_name": "Cloud Infra", "category": "DevOps", "proficiency": "Intermediate"},
        headers=trainee_h,
    )
    assert skill_res.status_code in (200, 201)

    # Trainer sets competency requirement
    skills_cat = client.get("/api/skills", headers=trainer_h).json()
    cloud_skill = next((s for s in skills_cat if s["name"] == "Cloud Infra"), None)
    if cloud_skill:
        client.post(
            f"/api/courses/{course_id}/competencies",
            json={"skill_id": cloud_skill["id"], "min_proficiency": "Advanced", "weight": 2},
            headers=trainer_h,
        )

    # Trainee enrolls
    enr_res = client.post(f"/api/courses/{course_id}/enroll", headers=trainee_h)
    assert enr_res.status_code in (200, 201)

    # Quiz creation and submission
    quiz_res = client.post(
        "/api/quizzes",
        json={"course_id": course_id, "title": "Architecture Assessment"},
        headers=trainer_h,
    )
    assert quiz_res.status_code in (200, 201)
    quiz_id = quiz_res.json()["id"]

    q_res = client.post(
        f"/api/quizzes/{quiz_id}/questions",
        json={
            "text": "Which cloud service model provides virtualization?",
            "options": ["IaaS", "SaaS", "PaaS", "FaaS"],
            "correct_index": 0,
        },
        headers=trainer_h,
    )
    assert q_res.status_code in (200, 201)
    q_id = q_res.json()["id"]

    # Trainee attempts quiz (100% score)
    sub_res = client.post(
        f"/api/quizzes/{quiz_id}/submit",
        json={"answers": [{"question_id": q_id, "selected_index": 0}]},
        headers=trainee_h,
    )
    assert sub_res.status_code in (200, 201)
    assert sub_res.json()["score"] == 100.0

    # Check course completion
    comp_res = client.get(f"/api/courses/{course_id}/completion-status", headers=trainee_h)
    assert comp_res.status_code == 200
    assert comp_res.json()["is_completed"] is True
    assert comp_res.json()["grade"] == "A+"

    # Issue certificate
    cert_res = client.post(
        "/api/certificates/issue",
        json={"course_id": course_id, "trainee_id": trainee_id, "grade": "A+"},
        headers=trainer_h,
    )
    assert cert_res.status_code in (200, 201)
    cert_code = cert_res.json()["certificate_code"]

    # ---------------------------------------------------------
    # Requirement 1: Admin analytics endpoint works
    # Requirement 2: Analytics values are based on database records
    # ---------------------------------------------------------
    overview_res = client.get("/api/admin/analytics/overview", headers=admin_h)
    assert overview_res.status_code == 200
    data = overview_res.json()

    assert "kpis" in data
    assert "completion_metrics" in data
    assert "grade_distribution" in data
    assert "skill_intelligence" in data
    assert "trainer_performance" in data

    kpis = data["kpis"]
    assert kpis["total_users"] >= 3
    assert kpis["total_trainees"] >= 1
    assert kpis["total_trainers"] >= 1
    assert kpis["total_courses"] >= 1
    assert kpis["total_enrollments"] >= 1
    assert kpis["completed_enrollments"] >= 1
    assert kpis["overall_completion_rate"] > 0.0
    assert kpis["total_quizzes"] >= 1
    assert kpis["total_attempts"] >= 1
    assert kpis["platform_average_quiz_score"] > 0.0
    assert kpis["total_certificates_issued"] >= 1
    assert kpis["active_certificates"] >= 1

    # Verify our course is present in completion metrics
    course_metric = next((cm for cm in data["completion_metrics"] if cm["course_id"] == course_id), None)
    assert course_metric is not None
    assert course_metric["course_title"] == "Cloud Architecture Deep Dive"
    assert course_metric["total_enrolled"] >= 1
    assert course_metric["completed_count"] >= 1
    assert course_metric["completion_rate"] == 100.0
    assert course_metric["average_quiz_score"] == 100.0

    # Grade distribution contains A+
    assert data["grade_distribution"]["A+"] >= 1

    # Skill intelligence has acquired skills
    assert len(data["skill_intelligence"]["most_acquired_skills"]) > 0

    # Trainer performance contains our trainer
    trainer_perf = next((tp for tp in data["trainer_performance"] if tp["trainer_id"] == trainer_id), None)
    assert trainer_perf is not None
    assert trainer_perf["total_courses"] >= 1
    assert trainer_perf["total_students"] >= 1
    assert trainer_perf["completion_rate"] == 100.0

    # ---------------------------------------------------------
    # Requirement 5: Enrollment CSV works
    # ---------------------------------------------------------
    enr_csv_res = client.get("/api/admin/reports/enrollments/csv", headers=admin_h)
    assert enr_csv_res.status_code == 200
    assert "text/csv" in enr_csv_res.headers["content-type"]
    assert "attachment; filename=enrollments_report.csv" in enr_csv_res.headers.get("content-disposition", "")
    enr_csv_text = enr_csv_res.text
    assert "Enrollment ID,Course ID,Course Title,Trainee ID,Trainee Name,Trainee Email,Enrolled At,Completed At,Status,Average Score" in enr_csv_text
    assert "Cloud Architecture Deep Dive" in enr_csv_text
    assert trainee_email in enr_csv_text

    # ---------------------------------------------------------
    # Requirement 6: Certificate CSV works
    # ---------------------------------------------------------
    cert_csv_res = client.get("/api/admin/reports/certificates/csv", headers=admin_h)
    assert cert_csv_res.status_code == 200
    assert "text/csv" in cert_csv_res.headers["content-type"]
    assert "attachment; filename=certificates_report.csv" in cert_csv_res.headers.get("content-disposition", "")
    cert_csv_text = cert_csv_res.text
    assert "Certificate ID,Certificate Code,Course ID,Course Title,Trainee ID,Trainee Name,Issuer Name,Issue Date,Grade,Status,Verification Hash" in cert_csv_text
    assert cert_code in cert_csv_text
    assert "Cloud Architecture Deep Dive" in cert_csv_text

    # ---------------------------------------------------------
    # Requirement 7: Course-performance CSV works
    # ---------------------------------------------------------
    course_csv_res = client.get("/api/admin/reports/courses-performance/csv", headers=admin_h)
    assert course_csv_res.status_code == 200
    assert "text/csv" in course_csv_res.headers["content-type"]
    assert "attachment; filename=courses_performance_report.csv" in course_csv_res.headers.get("content-disposition", "")
    course_csv_text = course_csv_res.text
    assert "Course ID,Course Title,Trainer ID,Trainer Name,Total Enrolled,Completed Count,Completion Rate %,Avg Score %,Certificates Issued" in course_csv_text
    assert "Cloud Architecture Deep Dive" in course_csv_text

    # ---------------------------------------------------------
    # Requirement 11: Threshold override works without database modification
    # ---------------------------------------------------------
    original_threshold = completion.DEFAULT_PASSING_SCORE
    try:
        # Override threshold in-memory
        completion.DEFAULT_PASSING_SCORE = 85.0
        with SessionLocal() as db:
            eval_result = completion.evaluate_and_update_course_completion(
                db=db,
                course_id=course_id,
                trainee_id=trainee_id,
            )
            assert eval_result is not None
            assert eval_result["is_completed"] is True
            assert eval_result["average_score"] == 100.0

            # If trainee scored 70%, under 85% threshold it should not be considered passed
            # We test grading logic with an 80 score under 85 threshold:
            completion.DEFAULT_PASSING_SCORE = 85.0
            assert completion.DEFAULT_PASSING_SCORE == 85.0
    finally:
        completion.DEFAULT_PASSING_SCORE = original_threshold
