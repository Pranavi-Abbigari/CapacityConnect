import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_profiles_and_skills_flow():
    # 1. Setup Trainee A, Trainee B, Trainer A, Admin
    trainee_a_email = f"trainee_a_{uuid.uuid4().hex[:8]}@example.com"
    trainee_b_email = f"trainee_b_{uuid.uuid4().hex[:8]}@example.com"
    trainer_a_email = f"trainer_a_{uuid.uuid4().hex[:8]}@example.com"
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"

    print("=== 1. Signup Users ===")
    res_ta = client.post("/api/auth/signup", json={"email": trainee_a_email, "password": "Password123!", "name": "Alice Trainee", "role": "TRAINEE"})
    res_tb = client.post("/api/auth/signup", json={"email": trainee_b_email, "password": "Password123!", "name": "Bob Trainee", "role": "TRAINEE"})
    res_tr = client.post("/api/auth/signup", json={"email": trainer_a_email, "password": "Password123!", "name": "Prof. Charles", "role": "TRAINER"})
    res_ad = client.post("/api/auth/signup", json={"email": admin_email, "password": "Password123!", "name": "Master Admin", "role": "ADMIN"})

    assert res_ta.status_code == 201
    assert res_tb.status_code == 201
    assert res_tr.status_code == 201
    assert res_ad.status_code == 201

    ta_id = res_ta.json()["id"]
    tb_id = res_tb.json()["id"]
    tr_id = res_tr.json()["id"]
    ad_id = res_ad.json()["id"]

    # 2. Approve Users
    admin_header = {"x-admin-secret": "admin_secret_key"}
    for uid in [ta_id, tb_id, tr_id, ad_id]:
        assert client.post("/api/admin/approve-user", json={"user_id": uid}, headers=admin_header).status_code == 200

    # 3. Logins
    ta_token = client.post("/api/auth/login", json={"email": trainee_a_email, "password": "Password123!"}).json()["access_token"]
    tb_token = client.post("/api/auth/login", json={"email": trainee_b_email, "password": "Password123!"}).json()["access_token"]
    tr_token = client.post("/api/auth/login", json={"email": trainer_a_email, "password": "Password123!"}).json()["access_token"]
    ad_token = client.post("/api/auth/login", json={"email": admin_email, "password": "Password123!"}).json()["access_token"]

    ta_headers = {"Authorization": f"Bearer {ta_token}"}
    tb_headers = {"Authorization": f"Bearer {tb_token}"}
    tr_headers = {"Authorization": f"Bearer {tr_token}"}
    ad_headers = {"Authorization": f"Bearer {ad_token}"}

    # 4. Check Skills Catalog
    print("\n=== 2. Check Skills Catalog ===")
    cat_res = client.get("/api/skills")
    assert cat_res.status_code == 200
    skills = cat_res.json()
    assert len(skills) >= 14
    skill_names = [s["name"] for s in skills]
    assert "Python" in skill_names
    assert "FastAPI" in skill_names
    python_skill = next(s for s in skills if s["name"] == "Python")

    # 5. Trainee A Profile GET and PUT
    print("\n=== 3. Trainee Profile Operations ===")
    p_res = client.get("/api/trainee/profile", headers=ta_headers)
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["user_id"] == ta_id
    assert p_data["name"] == "Alice Trainee"
    assert p_data["skills"] == []

    update_payload = {
        "qualification": "B.Tech in Computer Science",
        "work_experience": "6 months fullstack intern",
        "interests": "Cloud Computing, Distributed Systems",
        "profile_summary": "Aspiring backend architect and cloud engineer."
    }
    put_res = client.put("/api/trainee/profile", json=update_payload, headers=ta_headers)
    assert put_res.status_code == 200
    updated_p = put_res.json()
    assert updated_p["qualification"] == update_payload["qualification"]
    assert updated_p["interests"] == update_payload["interests"]

    # 6. Trainee A Adds Skills
    print("\n=== 4. Trainee Skills Operations ===")
    # Add by skill_name
    s1_res = client.post("/api/trainee/skills", json={
        "skill_name": "FastAPI",
        "proficiency": "Intermediate",
        "evidence": "Built RESTful microservices"
    }, headers=ta_headers)
    assert s1_res.status_code == 201
    s1_data = s1_res.json()
    assert s1_data["proficiency"] == "Intermediate"
    assert s1_data["skill"]["name"] == "FastAPI"
    user_skill_id = s1_data["id"]

    # Add by skill_id
    s2_res = client.post("/api/trainee/skills", json={
        "skill_id": python_skill["id"],
        "proficiency": "Advanced",
        "evidence": "3 years experience with Python"
    }, headers=ta_headers)
    assert s2_res.status_code == 201

    # Verify Trainee A has 2 skills
    list_skills_res = client.get("/api/trainee/skills", headers=ta_headers)
    assert list_skills_res.status_code == 200
    assert len(list_skills_res.json()) == 2

    # Update proficiency
    put_skill_res = client.put(f"/api/trainee/skills/{user_skill_id}", json={
        "proficiency": "Expert",
        "evidence": "Built production async systems"
    }, headers=ta_headers)
    assert put_skill_res.status_code == 200
    assert put_skill_res.json()["proficiency"] == "Expert"

    # Delete skill
    del_skill_res = client.delete(f"/api/trainee/skills/{user_skill_id}", headers=ta_headers)
    assert del_skill_res.status_code == 200
    assert del_skill_res.json()["message"] == "Skill removed successfully"

    # Confirm 1 skill remains
    remaining_res = client.get("/api/trainee/skills", headers=ta_headers)
    assert len(remaining_res.json()) == 1
    remaining_skill_id = remaining_res.json()[0]["id"]

    # 7. Trainer A Profile & Skills
    print("\n=== 5. Trainer Profile & Skills Operations ===")
    tr_p_res = client.get("/api/trainer/profile", headers=tr_headers)
    assert tr_p_res.status_code == 200
    assert tr_p_res.json()["user_id"] == tr_id

    tr_update = {
        "qualification": "Ph.D. in Computer Science",
        "specialization": "Distributed Systems & Machine Learning",
        "work_experience": "10 years industry leadership and academic instruction",
        "expertise_summary": "Senior corporate trainer specialized in high-performance cloud architectures."
    }
    put_tr_res = client.put("/api/trainer/profile", json=tr_update, headers=tr_headers)
    assert put_tr_res.status_code == 200
    assert put_tr_res.json()["specialization"] == tr_update["specialization"]

    # Trainer adds skill
    tr_skill_res = client.post("/api/trainer/skills", json={
        "skill_name": "Cloud Computing",
        "proficiency": "Expert",
        "evidence": "Certified Cloud Architect"
    }, headers=tr_headers)
    assert tr_skill_res.status_code == 201
    assert tr_skill_res.json()["proficiency"] == "Expert"

    # 8. Role Authorization Checks
    print("\n=== 6. Role Authorization Checks ===")
    # Trainee trying to access trainer profile -> 403
    assert client.get("/api/trainer/profile", headers=ta_headers).status_code == 403
    assert client.post("/api/trainer/skills", json={"skill_name": "Docker", "proficiency": "Beginner"}, headers=ta_headers).status_code == 403

    # Trainer trying to access trainee profile -> 403
    assert client.get("/api/trainee/profile", headers=tr_headers).status_code == 403
    assert client.post("/api/trainee/skills", json={"skill_name": "Docker", "proficiency": "Beginner"}, headers=tr_headers).status_code == 403

    # Trainee trying to access admin user profile inspection -> 403
    assert client.get(f"/api/admin/users/{ta_id}/profile", headers=ta_headers).status_code == 403

    # 9. Cross-User Modification Protection
    print("\n=== 7. Cross-User Modification Protection ===")
    # Trainee B attempting to update or delete Trainee A's skill -> 404
    b_put_res = client.put(f"/api/trainee/skills/{remaining_skill_id}", json={"proficiency": "Beginner"}, headers=tb_headers)
    assert b_put_res.status_code == 404

    b_del_res = client.delete(f"/api/trainee/skills/{remaining_skill_id}", headers=tb_headers)
    assert b_del_res.status_code == 404

    # 10. Admin Inspection
    print("\n=== 8. Admin Profile & Skills Inspection ===")
    admin_view_ta = client.get(f"/api/admin/users/{ta_id}/profile", headers=ad_headers)
    assert admin_view_ta.status_code == 200
    admin_ta_data = admin_view_ta.json()
    assert admin_ta_data["trainee_profile"]["qualification"] == update_payload["qualification"]
    assert len(admin_ta_data["skills"]) == 1

    admin_view_tr = client.get(f"/api/admin/users/{tr_id}/profile", headers=ad_headers)
    assert admin_view_tr.status_code == 200
    admin_tr_data = admin_view_tr.json()
    assert admin_tr_data["trainer_profile"]["specialization"] == tr_update["specialization"]
    assert len(admin_tr_data["skills"]) == 1

    print("\nALL PHASE 2 PROFILE & SKILLS TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_profiles_and_skills_flow()
