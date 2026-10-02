import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_courses_flow():
    # 1. Signup Trainer and Trainee
    trainer_email = f"trainer_{uuid.uuid4().hex[:8]}@example.com"
    trainee_email = f"trainee_{uuid.uuid4().hex[:8]}@example.com"

    print("=== 1. Signup Trainer & Trainee ===")
    t_res = client.post("/api/auth/signup", json={
        "email": trainer_email, "password": "Pass123!", "name": "Prof. Oak", "role": "TRAINER"
    })
    assert t_res.status_code == 201
    trainer_id = t_res.json()["id"]

    tr_res = client.post("/api/auth/signup", json={
        "email": trainee_email, "password": "Pass123!", "name": "Ash Ketchum", "role": "TRAINEE"
    })
    assert tr_res.status_code == 201
    trainee_id = tr_res.json()["id"]

    # 2. Approve both users
    print("=== 2. Approve Users ===")
    admin_header = {"x-admin-secret": "admin_secret_key"}
    assert client.post("/api/admin/approve-user", json={"user_id": trainer_id}, headers=admin_header).status_code == 200
    assert client.post("/api/admin/approve-user", json={"user_id": trainee_id}, headers=admin_header).status_code == 200

    # 3. Login both users
    print("=== 3. Login Users ===")
    trainer_login = client.post("/api/auth/login", json={"email": trainer_email, "password": "Pass123!"}).json()
    trainer_token = trainer_login["access_token"]

    trainee_login = client.post("/api/auth/login", json={"email": trainee_email, "password": "Pass123!"}).json()
    trainee_token = trainee_login["access_token"]

    trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
    trainee_headers = {"Authorization": f"Bearer {trainee_token}"}

    # 4. Trainer creates a course
    print("=== 4. Trainer Creates Course ===")
    course_payload = {
        "title": "Advanced Python & FastAPI Masterclass",
        "description": "Learn to build production-grade web APIs with Python and FastAPI.",
        "status": "PUBLISHED"
    }
    course_res = client.post("/api/courses", json=course_payload, headers=trainer_headers)
    print(f"Course Creation Status: {course_res.status_code}")
    print(f"Course Creation Response: {course_res.json()}")
    assert course_res.status_code == 201
    course_id = course_res.json()["id"]

    # 5. List all published courses
    print("\n=== 5. List Published Courses ===")
    list_res = client.get("/api/courses")
    print(f"List Courses Status: {list_res.status_code}")
    print(f"List Courses Response: {list_res.json()}")
    assert list_res.status_code == 200
    assert any(c["id"] == course_id for c in list_res.json())

    # 6. Trainee enrolls in course
    print("\n=== 6. Trainee Enrolls in Course ===")
    enroll_res = client.post(f"/api/courses/{course_id}/enroll", headers=trainee_headers)
    print(f"Enroll Status: {enroll_res.status_code}")
    print(f"Enroll Response: {enroll_res.json()}")
    assert enroll_res.status_code == 201
    assert enroll_res.json()["course_id"] == course_id
    assert enroll_res.json()["trainee_id"] == trainee_id

    # 7. Trainee views enrolled courses
    print("\n=== 7. Trainee Views Enrolled Courses ===")
    my_courses_res = client.get("/api/trainee/my-courses", headers=trainee_headers)
    print(f"My Courses Status: {my_courses_res.status_code}")
    print(f"My Courses Response: {my_courses_res.json()}")
    assert my_courses_res.status_code == 200
    assert len(my_courses_res.json()) == 1
    assert my_courses_res.json()[0]["course"]["id"] == course_id

    # 8. Test Role Protections
    print("\n=== 8. Testing Role Protections ===")
    # Trainee trying to create course -> 403 Forbidden
    forbidden_create = client.post("/api/courses", json=course_payload, headers=trainee_headers)
    assert forbidden_create.status_code == 403

    print("\nALL COURSE & ENROLLMENT TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_courses_flow()
