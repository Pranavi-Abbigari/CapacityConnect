import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_admin_dashboard():
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    trainer_email = f"trainer_{uuid.uuid4().hex[:8]}@example.com"
    trainee_email = f"trainee_{uuid.uuid4().hex[:8]}@example.com"

    print("=== 1. Signup Admin, Trainer, Trainee ===")
    admin_res = client.post("/api/auth/signup", json={"email": admin_email, "password": "AdminPass123!", "name": "System Admin", "role": "ADMIN"})
    trainer_res = client.post("/api/auth/signup", json={"email": trainer_email, "password": "TrainerPass123!", "name": "Jane Trainer", "role": "TRAINER"})
    trainee_res = client.post("/api/auth/signup", json={"email": trainee_email, "password": "TraineePass123!", "name": "Bob Student", "role": "TRAINEE"})

    admin_id = admin_res.json()["id"]
    trainer_id = trainer_res.json()["id"]
    trainee_id = trainee_res.json()["id"]

    # 2. Approve accounts
    admin_secret_header = {"x-admin-secret": "admin_secret_key"}
    client.post("/api/admin/approve-user", json={"user_id": admin_id}, headers=admin_secret_header)
    client.post("/api/admin/approve-user", json={"user_id": trainer_id}, headers=admin_secret_header)
    client.post("/api/admin/approve-user", json={"user_id": trainee_id}, headers=admin_secret_header)

    # 3. Login
    admin_token = client.post("/api/auth/login", json={"email": admin_email, "password": "AdminPass123!"}).json()["access_token"]
    trainer_token = client.post("/api/auth/login", json={"email": trainer_email, "password": "TrainerPass123!"}).json()["access_token"]
    trainee_token = client.post("/api/auth/login", json={"email": trainee_email, "password": "TraineePass123!"}).json()["access_token"]

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
    trainee_headers = {"Authorization": f"Bearer {trainee_token}"}

    # 4. Trainer creates course & quiz
    course_res = client.post("/api/courses", json={"title": "Docker & Kubernetes 101", "description": "DevOps course", "status": "PUBLISHED"}, headers=trainer_headers)
    course_id = course_res.json()["id"]

    quiz_res = client.post("/api/quizzes", json={"course_id": course_id, "title": "Docker Quiz"}, headers=trainer_headers)
    quiz_id = quiz_res.json()["id"]

    q_res = client.post(f"/api/quizzes/{quiz_id}/questions", json={"text": "What command builds an image?", "options": ["docker build", "docker run", "docker pull", "docker exec"], "correct_index": 0}, headers=trainer_headers)
    q_id = q_res.json()["id"]

    # 5. Trainee enrolls & submits quiz attempt
    client.post(f"/api/courses/{course_id}/enroll", headers=trainee_headers)
    client.post(f"/api/quizzes/{quiz_id}/submit", json={"answers": [{"question_id": q_id, "selected_index": 0}]}, headers=trainee_headers)

    # 6. Admin accesses dashboard
    print("\n=== 6. Admin Calls GET /api/admin/dashboard ===")
    dash_res = client.get("/api/admin/dashboard", headers=admin_headers)
    print(f"Dashboard Status: {dash_res.status_code}")
    print(f"Dashboard Data: {dash_res.json()}")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["total_users"] >= 3
    assert dash_data["total_trainees"] >= 1
    assert dash_data["total_trainers"] >= 1
    assert dash_data["total_courses"] >= 1
    assert dash_data["total_enrollments"] >= 1
    assert dash_data["total_attempts"] >= 1

    # 7. Non-admin calls dashboard -> 403 Forbidden
    print("\n=== 7. Non-Admin Calls GET /api/admin/dashboard (Should fail with 403) ===")
    forbidden_res = client.get("/api/admin/dashboard", headers=trainee_headers)
    print(f"Trainee Access Status: {forbidden_res.status_code}")
    print(f"Trainee Access Detail: {forbidden_res.json()}")
    assert forbidden_res.status_code == 403

    print("\nALL ADMIN DASHBOARD TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_admin_dashboard()
