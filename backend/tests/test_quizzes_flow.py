import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_quizzes_flow():
    # 1. Setup Trainer and Trainee
    trainer_email = f"quiz_trainer_{uuid.uuid4().hex[:8]}@example.com"
    trainee_email = f"quiz_trainee_{uuid.uuid4().hex[:8]}@example.com"

    print("=== 1. Signup Trainer & Trainee ===")
    t_res = client.post("/api/auth/signup", json={
        "email": trainer_email, "password": "Pass123!", "name": "Prof. Quizmaster", "role": "TRAINER"
    })

    tr_res = client.post("/api/auth/signup", json={
        "email": trainee_email, "password": "Pass123!", "name": "Alice Student", "role": "TRAINEE"
    })

    trainer_id = t_res.json()["id"]
    trainee_id = tr_res.json()["id"]

    # 2. Approve accounts
    admin_header = {"x-admin-secret": "admin_secret_key"}
    client.post("/api/admin/approve-user", json={"user_id": trainer_id}, headers=admin_header)
    client.post("/api/admin/approve-user", json={"user_id": trainee_id}, headers=admin_header)

    # 3. Login users
    trainer_token = client.post("/api/auth/login", json={"email": trainer_email, "password": "Pass123!"}).json()["access_token"]
    trainee_token = client.post("/api/auth/login", json={"email": trainee_email, "password": "Pass123!"}).json()["access_token"]

    trainer_headers = {"Authorization": f"Bearer {trainer_token}"}
    trainee_headers = {"Authorization": f"Bearer {trainee_token}"}

    # 4. Trainer creates a course
    course_res = client.post("/api/courses", json={
        "title": "Python & FastAPI Backend Masterclass",
        "description": "Comprehensive course on web backend development.",
        "status": "PUBLISHED"
    }, headers=trainer_headers)
    course_id = course_res.json()["id"]

    # 5. Trainer creates a Quiz
    print("\n=== 5. Trainer Creates Quiz ===")
    quiz_res = client.post("/api/quizzes", json={
        "course_id": course_id,
        "title": "FastAPI & Python Fundamentals Quiz"
    }, headers=trainer_headers)
    print(f"Quiz Creation Status: {quiz_res.status_code}")
    print(f"Quiz Response: {quiz_res.json()}")
    assert quiz_res.status_code == 201
    quiz_id = quiz_res.json()["id"]

    # 6. Trainer adds 4 questions
    print("\n=== 6. Trainer Adds 4 Questions ===")
    questions_data = [
        {
            "text": "What keyword is used to define a function in Python?",
            "options": ["def", "func", "function", "lambda"],
            "correct_index": 0,
            "explanation": "'def' defines functions in Python."
        },
        {
            "text": "Which HTTP status code represents '201 Created'?",
            "options": ["200", "201", "400", "404"],
            "correct_index": 1,
            "explanation": "201 indicates resource creation."
        },
        {
            "text": "What ORM library is used in this project?",
            "options": ["Django ORM", "Peewee", "SQLAlchemy", "Tortoise"],
            "correct_index": 2,
            "explanation": "SQLAlchemy handles ORM mapping."
        },
        {
            "text": "What validation library is used by FastAPI?",
            "options": ["Marshmallow", "Cerberus", "Schematics", "Pydantic"],
            "correct_index": 3,
            "explanation": "Pydantic handles schemas and validation."
        }
    ]

    q_ids = []
    for q_data in questions_data:
        q_res = client.post(f"/api/quizzes/{quiz_id}/questions", json=q_data, headers=trainer_headers)
        assert q_res.status_code == 201
        q_ids.append(q_res.json()["id"])
    print(f"Added 4 questions with IDs: {q_ids}")

    # 7. Trainee views Quiz details
    print("\n=== 7. Trainee Gets Quiz Details ===")
    get_quiz_res = client.get(f"/api/quizzes/{quiz_id}", headers=trainee_headers)
    print(f"Get Quiz Status: {get_quiz_res.status_code}")
    assert get_quiz_res.status_code == 200
    assert len(get_quiz_res.json()["questions"]) == 4

    # 8. Trainee submits answers (3 correct, 1 wrong -> 75%)
    print("\n=== 8. Trainee Submits Answers ===")
    submit_payload = {
        "answers": [
            {"question_id": q_ids[0], "selected_index": 0},  # Correct (def)
            {"question_id": q_ids[1], "selected_index": 1},  # Correct (201)
            {"question_id": q_ids[2], "selected_index": 2},  # Correct (SQLAlchemy)
            {"question_id": q_ids[3], "selected_index": 0}   # Wrong (selected Marshmallow instead of Pydantic)
        ]
    }
    submit_res = client.post(f"/api/quizzes/{quiz_id}/submit", json=submit_payload, headers=trainee_headers)
    print(f"Submit Status: {submit_res.status_code}")
    print(f"Submit Response: {submit_res.json()}")
    assert submit_res.status_code == 201
    assert submit_res.json()["score"] == 75.0
    assert len(submit_res.json()["details"]) == 4

    # 9. Trainee checks past attempts
    print("\n=== 9. Trainee Checks Past Attempts ===")
    my_attempts_res = client.get("/api/trainee/my-attempts", headers=trainee_headers)
    print(f"My Attempts Status: {my_attempts_res.status_code}")
    print(f"My Attempts Response: {my_attempts_res.json()}")
    assert my_attempts_res.status_code == 200
    assert len(my_attempts_res.json()) == 1
    assert my_attempts_res.json()[0]["score"] == 75.0

    # 10. Trainer checks quiz results summary
    print("\n=== 10. Trainer Checks Quiz Results Summary ===")
    results_res = client.get(f"/api/trainer/quizzes/{quiz_id}/results", headers=trainer_headers)
    print(f"Results Status: {results_res.status_code}")
    print(f"Results Summary: {results_res.json()}")
    assert results_res.status_code == 200
    res_data = results_res.json()
    assert res_data["total_attempts"] == 1
    assert res_data["average_score"] == 75.0
    assert len(res_data["attempts"]) == 1

    print("\nALL QUIZ & ATTEMPT TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_quizzes_flow()
