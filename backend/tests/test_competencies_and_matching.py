import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_competencies_and_matching_flow():
    # 1. Setup Trainer 1, Trainer 2, Trainee 1, Trainee 2, Admin
    t1_email = f"trainer1_{uuid.uuid4().hex[:8]}@example.com"
    t2_email = f"trainer2_{uuid.uuid4().hex[:8]}@example.com"
    tr1_email = f"trainee1_{uuid.uuid4().hex[:8]}@example.com"
    tr2_email = f"trainee2_{uuid.uuid4().hex[:8]}@example.com"
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"

    print("=== 1. Signup Users ===")
    r_t1 = client.post("/api/auth/signup", json={"email": t1_email, "password": "Password123!", "name": "Trainer Alpha", "role": "TRAINER"})
    r_t2 = client.post("/api/auth/signup", json={"email": t2_email, "password": "Password123!", "name": "Trainer Beta", "role": "TRAINER"})
    r_tr1 = client.post("/api/auth/signup", json={"email": tr1_email, "password": "Password123!", "name": "Trainee One", "role": "TRAINEE"})
    r_tr2 = client.post("/api/auth/signup", json={"email": tr2_email, "password": "Password123!", "name": "Trainee Two", "role": "TRAINEE"})
    r_ad = client.post("/api/auth/signup", json={"email": admin_email, "password": "Password123!", "name": "Chief Admin", "role": "ADMIN"})

    assert r_t1.status_code == 201
    assert r_t2.status_code == 201
    assert r_tr1.status_code == 201
    assert r_tr2.status_code == 201
    assert r_ad.status_code == 201

    t1_id = r_t1.json()["id"]
    t2_id = r_t2.json()["id"]
    tr1_id = r_tr1.json()["id"]
    tr2_id = r_tr2.json()["id"]
    ad_id = r_ad.json()["id"]

    # 2. Approve Users
    admin_header = {"x-admin-secret": "admin_secret_key"}
    for uid in [t1_id, t2_id, tr1_id, tr2_id, ad_id]:
        assert client.post("/api/admin/approve-user", json={"user_id": uid}, headers=admin_header).status_code == 200

    # 3. Logins
    t1_token = client.post("/api/auth/login", json={"email": t1_email, "password": "Password123!"}).json()["access_token"]
    t2_token = client.post("/api/auth/login", json={"email": t2_email, "password": "Password123!"}).json()["access_token"]
    tr1_token = client.post("/api/auth/login", json={"email": tr1_email, "password": "Password123!"}).json()["access_token"]
    tr2_token = client.post("/api/auth/login", json={"email": tr2_email, "password": "Password123!"}).json()["access_token"]
    ad_token = client.post("/api/auth/login", json={"email": admin_email, "password": "Password123!"}).json()["access_token"]

    t1_h = {"Authorization": f"Bearer {t1_token}"}
    t2_h = {"Authorization": f"Bearer {t2_token}"}
    tr1_h = {"Authorization": f"Bearer {tr1_token}"}
    tr2_h = {"Authorization": f"Bearer {tr2_token}"}
    ad_h = {"Authorization": f"Bearer {ad_token}"}

    # 4. Trainer 1 creates Course A
    print("\n=== 2. Trainer 1 creates Course A ===")
    c_res = client.post("/api/courses", json={
        "title": "Cloud Architecture Masterclass",
        "description": "Comprehensive course on distributed architectures and microservices.",
        "status": "PUBLISHED"
    }, headers=t1_h)
    assert c_res.status_code == 201
    course_a_id = c_res.json()["id"]

    # Trainer 2 creates a bridge Course B covering Database Management
    c_bridge = client.post("/api/courses", json={
        "title": "Relational Database Management Foundations",
        "description": "SQL design, indexing, and transactional integrity.",
        "status": "PUBLISHED"
    }, headers=t2_h)
    assert c_bridge.status_code == 201
    course_b_id = c_bridge.json()["id"]

    # 5. Trainer 1 defines Course A Competency Requirements
    print("\n=== 3. Course Competency Requirements Management ===")
    # Add Requirement 1: Cloud Computing (Advanced, weight=2)
    req1 = client.post(f"/api/courses/{course_a_id}/competencies", json={
        "skill_name": "Cloud Computing",
        "min_proficiency": "Advanced",
        "weight": 2
    }, headers=t1_h)
    assert req1.status_code == 201
    comp1_id = req1.json()["id"]
    assert req1.json()["min_proficiency"] == "Advanced"
    assert req1.json()["weight"] == 2

    # Add Requirement 2: FastAPI (Intermediate, weight=1)
    req2 = client.post(f"/api/courses/{course_a_id}/competencies", json={
        "skill_name": "FastAPI",
        "min_proficiency": "Intermediate",
        "weight": 1
    }, headers=t1_h)
    assert req2.status_code == 201
    comp2_id = req2.json()["id"]

    # Add Requirement 3: Database Management (Intermediate, weight=1)
    req3 = client.post(f"/api/courses/{course_a_id}/competencies", json={
        "skill_name": "Database Management",
        "min_proficiency": "Intermediate",
        "weight": 1
    }, headers=t1_h)
    assert req3.status_code == 201
    comp3_id = req3.json()["id"]

    # Course B competency: Database Management
    client.post(f"/api/courses/{course_b_id}/competencies", json={
        "skill_name": "Database Management",
        "min_proficiency": "Beginner",
        "weight": 1
    }, headers=t2_h)

    # Test listing competencies
    list_comps = client.get(f"/api/courses/{course_a_id}/competencies")
    assert list_comps.status_code == 200
    assert len(list_comps.json()) == 3

    # Update Requirement 2 weight
    up_res = client.put(f"/api/courses/{course_a_id}/competencies/{comp2_id}", json={
        "min_proficiency": "Intermediate",
        "weight": 1
    }, headers=t1_h)
    assert up_res.status_code == 200

    # 6. Trainee 1 Skills Setup & Gap Analysis
    print("\n=== 4. Trainee Skill-Gap Analysis & Recommendations ===")
    # Trainee 1 has:
    # - Cloud Computing: "Advanced" (matches required Advanced, weight 2 -> earned 2.0)
    # - FastAPI: "Beginner" (insufficient: 1 / 2, weight 1 -> earned 0.5)
    # - Database Management: missing (missing: 0 / 2, weight 1 -> earned 0.0)
    # Total earned = 2.5 / 4.0 = 62.5%
    client.post("/api/trainee/skills", json={
        "skill_name": "Cloud Computing",
        "proficiency": "Advanced",
        "evidence": "Certified AWS Developer"
    }, headers=tr1_h)

    client.post("/api/trainee/skills", json={
        "skill_name": "FastAPI",
        "proficiency": "Beginner",
        "evidence": "Built hello-world API"
    }, headers=tr1_h)

    gap_res = client.get(f"/api/trainee/skill-gap/{course_a_id}", headers=tr1_h)
    assert gap_res.status_code == 200
    gap_data = gap_res.json()
    assert gap_data["match_percentage"] == 62.5
    assert gap_data["matched_count"] == 1
    assert gap_data["insufficient_count"] == 1
    assert gap_data["missing_count"] == 1

    assert gap_data["matched_skills"][0]["skill_name"] == "Cloud Computing"
    assert gap_data["insufficient_skills"][0]["skill_name"] == "FastAPI"
    assert gap_data["missing_skills"][0]["skill_name"] == "Database Management"

    # Verify recommendations point to Course B which teaches Database Management
    assert len(gap_data["recommendations"]) >= 1
    assert any(rec["course_id"] == course_b_id for rec in gap_data["recommendations"])

    # Trainee enrolls and checks overall skill gap
    client.post(f"/api/courses/{course_a_id}/enroll", headers=tr1_h)
    overall_gap = client.get("/api/trainee/skill-gap", headers=tr1_h)
    assert overall_gap.status_code == 200
    assert overall_gap.json()["total_enrolled_courses"] >= 1

    # 7. Trainer Matching Evaluation
    print("\n=== 5. Trainer Matching Algorithm Evaluation ===")
    # Trainer 2 expertise:
    # - Cloud Computing: "Expert" (exceeds Advanced)
    # - FastAPI: "Advanced" (exceeds Intermediate)
    # - Database Management: "Expert" (exceeds Intermediate)
    client.post("/api/trainer/skills", json={"skill_name": "Cloud Computing", "proficiency": "Expert"}, headers=t2_h)
    client.post("/api/trainer/skills", json={"skill_name": "FastAPI", "proficiency": "Advanced"}, headers=t2_h)
    client.post("/api/trainer/skills", json={"skill_name": "Database Management", "proficiency": "Expert"}, headers=t2_h)

    # Trainer 1 expertise:
    # - Only Cloud Computing (Intermediate < Advanced required)
    client.post("/api/trainer/skills", json={"skill_name": "Cloud Computing", "proficiency": "Intermediate"}, headers=t1_h)

    matches_res = client.get(f"/api/courses/{course_a_id}/trainer-matches", headers=t1_h)
    assert matches_res.status_code == 200
    match_data = matches_res.json()
    assert match_data["required_competencies_count"] == 3
    assert len(match_data["ranked_trainers"]) >= 2

    # Verify results are sorted by (match_percentage, matched_skills_count) descending
    for i in range(len(match_data["ranked_trainers"]) - 1):
        curr = match_data["ranked_trainers"][i]
        nxt = match_data["ranked_trainers"][i + 1]
        assert (curr["match_percentage"], curr["matched_skills_count"]) >= (nxt["match_percentage"], nxt["matched_skills_count"])

    # Trainer 2 appears in matching results with 100% match
    t2_matches = [t for t in match_data["ranked_trainers"] if t["trainer_id"] == t2_id]
    assert len(t2_matches) == 1
    t2_entry = t2_matches[0]
    assert t2_entry["match_percentage"] == 100.0
    assert t2_entry["matched_skills_count"] == 3
    assert len(t2_entry["missing_competencies"]) == 0
    assert len(t2_entry["insufficient_competencies"]) == 0

    # Trainer 1 appears with partial match (Intermediate < Advanced)
    t1_matches = [t for t in match_data["ranked_trainers"] if t["trainer_id"] == t1_id]
    assert len(t1_matches) == 1
    t1_entry = t1_matches[0]
    assert t1_entry["match_percentage"] < 100.0
    assert t2_entry["match_percentage"] > t1_entry["match_percentage"]

    # Top trainer tier has 100% match
    top_trainer = match_data["ranked_trainers"][0]
    assert top_trainer["match_percentage"] == 100.0
    assert top_trainer["matched_skills_count"] == 3

    # Admin inspection of trainer matching
    admin_match = client.get(f"/api/admin/trainer-matching/{course_a_id}", headers=ad_h)
    assert admin_match.status_code == 200
    admin_data = admin_match.json()
    admin_t2 = [t for t in admin_data["ranked_trainers"] if t["trainer_id"] == t2_id]
    assert len(admin_t2) == 1
    assert admin_t2[0]["match_percentage"] == 100.0

    # 8. RBAC and Isolation Checks
    print("\n=== 6. RBAC & Security Isolation Checks ===")
    # Trainee trying to add competency -> 403
    assert client.post(f"/api/courses/{course_a_id}/competencies", json={"skill_name": "SQL", "min_proficiency": "Beginner"}, headers=tr1_h).status_code == 403

    # Trainee trying to access trainer matches -> 403
    assert client.get(f"/api/courses/{course_a_id}/trainer-matches", headers=tr1_h).status_code == 403

    # Non-owner Trainer 2 trying to delete Trainer 1's competency requirement -> 403
    assert client.delete(f"/api/courses/{course_a_id}/competencies/{comp3_id}", headers=t2_h).status_code == 403

    # Delete competency by owner -> 200
    del_res = client.delete(f"/api/courses/{course_a_id}/competencies/{comp3_id}", headers=t1_h)
    assert del_res.status_code == 200

    print("\nALL PHASE 3 COMPETENCY & MATCHING TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_competencies_and_matching_flow()
