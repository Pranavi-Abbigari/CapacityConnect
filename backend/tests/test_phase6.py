import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.quiz import Quiz

client = TestClient(app)


def test_phase6_feedback_and_notifications_flow():
    admin_header = {"x-admin-secret": "admin_secret_key"}

    # 1. Setup users: Admin, Trainer A, Trainer B, Trainee 1, Trainee 2
    uid = uuid.uuid4().hex[:8]
    adm_email = f"admin_{uid}@example.com"
    tr_a_email = f"trainer_a_{uid}@example.com"
    tr_b_email = f"trainer_b_{uid}@example.com"
    te_1_email = f"trainee_1_{uid}@example.com"
    te_2_email = f"trainee_2_{uid}@example.com"

    adm_id = client.post("/api/auth/signup", json={"email": adm_email, "password": "AdminPass123!", "name": "System Admin", "role": "ADMIN"}).json()["id"]
    tr_a_id = client.post("/api/auth/signup", json={"email": tr_a_email, "password": "Password123!", "name": "Trainer Alice", "role": "TRAINER"}).json()["id"]
    tr_b_id = client.post("/api/auth/signup", json={"email": tr_b_email, "password": "Password123!", "name": "Trainer Bob", "role": "TRAINER"}).json()["id"]
    te_1_id = client.post("/api/auth/signup", json={"email": te_1_email, "password": "Password123!", "name": "Trainee Charlie", "role": "TRAINEE"}).json()["id"]
    te_2_id = client.post("/api/auth/signup", json={"email": te_2_email, "password": "Password123!", "name": "Trainee Dave", "role": "TRAINEE"}).json()["id"]

    for u in [adm_id, tr_a_id, tr_b_id, te_1_id, te_2_id]:
        assert client.post("/api/admin/approve-user", json={"user_id": u}, headers=admin_header).status_code == 200

    # Login tokens
    adm_token = client.post("/api/auth/login", json={"email": adm_email, "password": "AdminPass123!"}).json()["access_token"]
    tr_a_token = client.post("/api/auth/login", json={"email": tr_a_email, "password": "Password123!"}).json()["access_token"]
    tr_b_token = client.post("/api/auth/login", json={"email": tr_b_email, "password": "Password123!"}).json()["access_token"]
    te_1_token = client.post("/api/auth/login", json={"email": te_1_email, "password": "Password123!"}).json()["access_token"]
    te_2_token = client.post("/api/auth/login", json={"email": te_2_email, "password": "Password123!"}).json()["access_token"]

    admin_auth_headers = {"Authorization": f"Bearer {adm_token}"}
    tr_a_headers = {"Authorization": f"Bearer {tr_a_token}"}
    tr_b_headers = {"Authorization": f"Bearer {tr_b_token}"}
    te_1_headers = {"Authorization": f"Bearer {te_1_token}"}
    te_2_headers = {"Authorization": f"Bearer {te_2_token}"}


    # 2. Trainer A creates Course A, Trainer B creates Course B
    c_a_res = client.post("/api/courses", json={"title": "Data Engineering", "description": "Big Data pipeline course", "status": "PUBLISHED"}, headers=tr_a_headers)
    assert c_a_res.status_code == 201
    course_a_id = c_a_res.json()["id"]

    c_b_res = client.post("/api/courses", json={"title": "Frontend React", "description": "Web apps course", "status": "PUBLISHED"}, headers=tr_b_headers)
    assert c_b_res.status_code == 201
    course_b_id = c_b_res.json()["id"]

    # Trainee 1 enrolls in Course A only; Trainee 2 enrolls in Course B only
    assert client.post(f"/api/courses/{course_a_id}/enroll", headers=te_1_headers).status_code == 201
    assert client.post(f"/api/courses/{course_b_id}/enroll", headers=te_2_headers).status_code == 201

    # ==========================================
    # TEST 1 & 2: Course Feedback & Validation
    # ==========================================
    # Rating validation (must be 1-5)
    bad_rating_0 = client.post("/api/feedback/courses", json={"course_id": course_a_id, "rating": 0, "comment": "Too low"}, headers=te_1_headers)
    assert bad_rating_0.status_code in [400, 422]

    bad_rating_6 = client.post("/api/feedback/courses", json={"course_id": course_a_id, "rating": 6, "comment": "Too high"}, headers=te_1_headers)
    assert bad_rating_6.status_code in [400, 422]

    # Trainee 2 cannot review Course A (not enrolled)
    unauth_fb = client.post("/api/feedback/courses", json={"course_id": course_a_id, "rating": 4, "comment": "Good"}, headers=te_2_headers)
    assert unauth_fb.status_code in [400, 403]

    # Trainee 1 submits valid feedback for Course A
    fb1_res = client.post("/api/feedback/courses", json={"course_id": course_a_id, "rating": 5, "comment": "Super comprehensive curriculum!"}, headers=te_1_headers)
    assert fb1_res.status_code == 201
    assert fb1_res.json()["rating"] == 5
    assert fb1_res.json()["trainee_name"] == "Trainee Charlie"

    # ==========================================
    # TEST 3: Duplicate Course Feedback Prevention
    # ==========================================
    dup_fb = client.post("/api/feedback/courses", json={"course_id": course_a_id, "rating": 4, "comment": "Second attempt"}, headers=te_1_headers)
    assert dup_fb.status_code == 400
    assert "already submitted" in dup_fb.json()["detail"].lower()

    # ==========================================
    # TEST 4: Course Feedback Aggregation
    # ==========================================
    # Trainee 2 now enrolls in Course A as well and gives rating 3
    assert client.post(f"/api/courses/{course_a_id}/enroll", headers=te_2_headers).status_code == 201
    assert client.post("/api/feedback/courses", json={"course_id": course_a_id, "rating": 3, "comment": "Decent course"}, headers=te_2_headers).status_code == 201

    course_fb_summary = client.get(f"/api/feedback/courses/{course_a_id}", headers=te_1_headers)
    assert course_fb_summary.status_code == 200
    summary_data = course_fb_summary.json()
    assert summary_data["total_reviews"] == 2
    assert summary_data["average_rating"] == 4.0  # (5 + 3) / 2 = 4.0
    assert len(summary_data["reviews"]) == 2

    # ==========================================
    # TEST 5 & 6: Trainer Feedback Submission & Auth
    # ==========================================
    # Trainee 1 submits trainer feedback for Trainer Alice (owns Course A)
    tr_fb_res = client.post("/api/feedback/trainers", json={
        "trainer_id": tr_a_id,
        "course_id": course_a_id,
        "rating": 5,
        "comment": "Alice explains complex topics with great clarity!"
    }, headers=te_1_headers)
    assert tr_fb_res.status_code == 201
    assert tr_fb_res.json()["rating"] == 5

    # Duplicate trainer feedback prevention
    dup_tr_fb = client.post("/api/feedback/trainers", json={
        "trainer_id": tr_a_id,
        "course_id": course_a_id,
        "rating": 4,
        "comment": "Another review"
    }, headers=te_1_headers)
    assert dup_tr_fb.status_code == 400

    # Trainee cannot review Trainer Bob for Course A because Bob does not teach Course A
    wrong_tr_fb = client.post("/api/feedback/trainers", json={
        "trainer_id": tr_b_id,
        "course_id": course_a_id,
        "rating": 4,
        "comment": "Wrong trainer"
    }, headers=te_1_headers)
    assert wrong_tr_fb.status_code in [400, 404]

    # Trainer feedback aggregation
    tr_summary = client.get(f"/api/feedback/trainers/{tr_a_id}", headers=tr_a_headers)
    assert tr_summary.status_code == 200
    assert tr_summary.json()["total_reviews"] == 1
    assert tr_summary.json()["average_rating"] == 5.0

    # My submissions check
    my_subs = client.get("/api/feedback/my-submissions", headers=te_1_headers)
    assert my_subs.status_code == 200
    assert len(my_subs.json()["course_feedbacks"]) >= 1
    assert len(my_subs.json()["trainer_feedbacks"]) >= 1

    # ==========================================
    # TEST 7 & 8: Announcements (Admin & Trainer)
    # ==========================================
    # Admin creates global announcement
    admin_ann = client.post("/api/announcements", json={
        "title": "Campus System Upgrade",
        "content": "Scheduled maintenance on Sunday at 2 AM UTC."
    }, headers=admin_auth_headers)
    assert admin_ann.status_code == 201
    admin_ann_id = admin_ann.json()["id"]

    # Trainer A creates course announcement for Course A
    tr_ann = client.post("/api/announcements", json={
        "course_id": course_a_id,
        "title": "Assignment 1 Released",
        "content": "Please review the new materials under module 1."
    }, headers=tr_a_headers)
    assert tr_ann.status_code == 201
    tr_ann_id = tr_ann.json()["id"]

    # ==========================================
    # TEST 9 & 10: Announcement Permissions & RBAC
    # ==========================================
    # Trainer A cannot announce for Course B (owned by Trainer B)
    bad_tr_ann = client.post("/api/announcements", json={
        "course_id": course_b_id,
        "title": "Unauthorized Announcement",
        "content": "Should be rejected"
    }, headers=tr_a_headers)
    assert bad_tr_ann.status_code in [400, 403]

    # Trainee cannot create announcements
    trainee_ann = client.post("/api/announcements", json={
        "title": "Trainee Post",
        "content": "I want to post an announcement"
    }, headers=te_1_headers)
    assert trainee_ann.status_code == 403

    # ==========================================
    # TEST 11: Announcement Visibility
    # ==========================================
    # Trainer B posts for Course B
    client.post("/api/announcements", json={
        "course_id": course_b_id,
        "title": "Course B Welcome",
        "content": "Welcome to Course B!"
    }, headers=tr_b_headers)

    # Trainee 1 is enrolled in Course A (not Course B):
    # Trainee 1 should see: global announcement + Course A announcement, NOT Course B announcement
    te1_anns = client.get("/api/announcements", headers=te_1_headers).json()
    te1_titles = [a["title"] for a in te1_anns]
    assert "Campus System Upgrade" in te1_titles
    assert "Assignment 1 Released" in te1_titles
    assert "Course B Welcome" not in te1_titles

    # ==========================================
    # TEST 12 & 13: Achievement Notifications (Perfect Score & Deduplication)
    # ==========================================
    # Trainer A creates a Quiz for Course A
    quiz_res = client.post("/api/quizzes", json={"course_id": course_a_id, "title": "Data Modeling Quiz"}, headers=tr_a_headers)
    assert quiz_res.status_code == 201
    q_id = quiz_res.json()["id"]

    ques_res = client.post(f"/api/quizzes/{q_id}/questions", json={
        "text": "What is normalization?",
        "options": ["Organizing database relations", "Styling CSS", "Deleting tables", "Compiling code"],
        "correct_index": 0
    }, headers=tr_a_headers)
    assert ques_res.status_code == 201
    question_id = ques_res.json()["id"]

    # Trainee 1 submits quiz with 100% score (Option 0)
    sub1 = client.post(f"/api/quizzes/{q_id}/submit", json={
        "answers": [{"question_id": question_id, "selected_index": 0}]
    }, headers=te_1_headers)
    assert sub1.status_code == 201
    assert sub1.json()["score"] == 100.0

    # Trainee 1 should receive Perfect Quiz Score achievement notification
    notifs_te1 = client.get("/api/notifications", headers=te_1_headers).json()
    perfect_notifs = [n for n in notifs_te1 if "Perfect Quiz Score" in n["title"]]
    assert len(perfect_notifs) == 1
    assert perfect_notifs[0]["type"] == "ACHIEVEMENT"

    # Resubmitting 100% should NOT create duplicate achievement notification
    sub2 = client.post(f"/api/quizzes/{q_id}/submit", json={
        "answers": [{"question_id": question_id, "selected_index": 0}]
    }, headers=te_1_headers)
    assert sub2.status_code == 201
    notifs_te1_after = client.get("/api/notifications", headers=te_1_headers).json()
    perfect_notifs_after = [n for n in notifs_te1_after if "Perfect Quiz Score" in n["title"]]
    assert len(perfect_notifs_after) == 1  # Deduplicated!

    # ==========================================
    # TEST 14 & 15: Deadline Notifications & Deduplication
    # ==========================================
    # Trainee 2 is enrolled in Course A. Create a quiz with an approaching deadline (e.g. 24h from now)
    approaching_deadline = datetime.now(timezone.utc) + timedelta(hours=24)
    q2_res = client.post("/api/quizzes", json={
        "course_id": course_a_id,
        "title": "SQL Advanced Joins",
        "deadline": approaching_deadline.isoformat()
    }, headers=tr_a_headers)
    assert q2_res.status_code == 201
    q2_id = q2_res.json()["id"]

    # Trainee 2 checks deadlines (has not submitted SQL Advanced Joins)
    check_res = client.post("/api/notifications/check-deadlines", headers=te_2_headers)
    assert check_res.status_code == 200
    assert check_res.json()["reminders_created"] >= 1

    notifs_te2 = client.get("/api/notifications", headers=te_2_headers).json()
    deadline_notifs = [n for n in notifs_te2 if n["type"] == "DEADLINE" and "SQL Advanced Joins" in n["message"]]
    assert len(deadline_notifs) == 1

    # Calling check-deadlines again should NOT create duplicate notification
    check_again = client.post("/api/notifications/check-deadlines", headers=te_2_headers)
    assert check_again.status_code == 200
    assert check_again.json()["reminders_created"] == 0
    notifs_te2_after = client.get("/api/notifications", headers=te_2_headers).json()
    deadline_notifs_after = [n for n in notifs_te2_after if n["type"] == "DEADLINE" and "SQL Advanced Joins" in n["message"]]
    assert len(deadline_notifs_after) == 1

    # ==========================================
    # TEST 16: Existing Notifications Still Work
    # ==========================================
    # Unread count endpoint
    unread_res = client.get("/api/notifications/unread-count", headers=te_2_headers)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] >= 1

    # Mark as read
    first_notif = notifs_te2[0]
    read_res = client.patch(f"/api/notifications/{first_notif['id']}/read", headers=te_2_headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # Mark all read
    mark_all_res = client.post("/api/notifications/mark-all-read", headers=te_2_headers)
    assert mark_all_res.status_code == 200
    unread_res2 = client.get("/api/notifications/unread-count", headers=te_2_headers)
    assert unread_res2.json()["unread_count"] == 0
