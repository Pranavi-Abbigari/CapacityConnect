import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_phase4_course_completion_and_certificates_flow():
    admin_header = {"x-admin-secret": "admin_secret_key"}

    # 1. Signup Trainer 1, Trainer 2, Trainee 1, Trainee 2
    t1_email = f"t1_{uuid.uuid4().hex[:8]}@example.com"
    t2_email = f"t2_{uuid.uuid4().hex[:8]}@example.com"
    tr1_email = f"tr1_{uuid.uuid4().hex[:8]}@example.com"
    tr2_email = f"tr2_{uuid.uuid4().hex[:8]}@example.com"

    t1_id = client.post("/api/auth/signup", json={"email": t1_email, "password": "Password123!", "name": "Trainer One", "role": "TRAINER"}).json()["id"]
    t2_id = client.post("/api/auth/signup", json={"email": t2_email, "password": "Password123!", "name": "Trainer Two", "role": "TRAINER"}).json()["id"]
    tr1_id = client.post("/api/auth/signup", json={"email": tr1_email, "password": "Password123!", "name": "Trainee One", "role": "TRAINEE"}).json()["id"]
    tr2_id = client.post("/api/auth/signup", json={"email": tr2_email, "password": "Password123!", "name": "Trainee Two", "role": "TRAINEE"}).json()["id"]

    for uid in [t1_id, t2_id, tr1_id, tr2_id]:
        assert client.post("/api/admin/approve-user", json={"user_id": uid}, headers=admin_header).status_code == 200

    # Login all users
    t1_token = client.post("/api/auth/login", json={"email": t1_email, "password": "Password123!"}).json()["access_token"]
    t2_token = client.post("/api/auth/login", json={"email": t2_email, "password": "Password123!"}).json()["access_token"]
    tr1_token = client.post("/api/auth/login", json={"email": tr1_email, "password": "Password123!"}).json()["access_token"]
    tr2_token = client.post("/api/auth/login", json={"email": tr2_email, "password": "Password123!"}).json()["access_token"]

    t1_headers = {"Authorization": f"Bearer {t1_token}"}
    t2_headers = {"Authorization": f"Bearer {t2_token}"}
    tr1_headers = {"Authorization": f"Bearer {tr1_token}"}
    tr2_headers = {"Authorization": f"Bearer {tr2_token}"}

    # 2. Trainer 1 creates Course 1
    course_res = client.post("/api/courses", json={"title": "Cloud Architecture & DevOps", "description": "Phase 4 Test Course", "status": "PUBLISHED"}, headers=t1_headers)
    assert course_res.status_code == 201
    course1_id = course_res.json()["id"]

    # 3. Trainer 1 creates Quiz 1 with questions
    quiz_res = client.post("/api/quizzes", json={"course_id": course1_id, "title": "DevOps Fundamentals Quiz"}, headers=t1_headers)
    assert quiz_res.status_code == 201
    quiz_id = quiz_res.json()["id"]

    q1_res = client.post(f"/api/quizzes/{quiz_id}/questions", json={
        "text": "What does CI/CD stand for?",
        "options": ["Continuous Integration / Continuous Deployment", "Code Inspection / Code Delivery", "Cloud Infrastructure / Cloud Data", "Central Index / Central Directory"],
        "correct_index": 0,
        "explanation": "CI/CD stands for Continuous Integration and Continuous Deployment."
    }, headers=t1_headers)
    assert q1_res.status_code == 201
    q1_id = q1_res.json()["id"]

    # 4. Trainee 1 and Trainee 2 enroll in Course 1
    assert client.post(f"/api/courses/{course1_id}/enroll", headers=tr1_headers).status_code == 201
    assert client.post(f"/api/courses/{course1_id}/enroll", headers=tr2_headers).status_code == 201

    # 5. Check Completion Before Quiz Attempt
    comp_before = client.get(f"/api/courses/{course1_id}/completion-status", headers=tr1_headers)
    assert comp_before.status_code == 200
    assert comp_before.json()["is_completed"] is False
    assert comp_before.json()["completed_at"] is None

    # Trainee 1 attempts and passes the quiz
    sub_res = client.post(f"/api/quizzes/{quiz_id}/submit", json={
        "answers": [{"question_id": q1_id, "selected_index": 0}]
    }, headers=tr1_headers)
    assert sub_res.status_code == 201
    assert sub_res.json()["score"] == 100.0

    # 6. Verify Course Completion after passing quiz
    comp_after = client.get(f"/api/courses/{course1_id}/completion-status", headers=tr1_headers)
    assert comp_after.status_code == 200
    assert comp_after.json()["is_completed"] is True
    assert comp_after.json()["completed_at"] is not None
    assert comp_after.json()["grade"] == "A+"

    # Trainee 1 should have received a "Course Completed" notification
    notifs_tr1 = client.get("/api/notifications", headers=tr1_headers)
    assert notifs_tr1.status_code == 200
    assert any("Course Completed" in n["title"] for n in notifs_tr1.json())

    # 7. Trainer Trainees-Completion API check
    trainers_completion = client.get(f"/api/trainer/courses/{course1_id}/trainees-completion", headers=t1_headers)
    assert trainers_completion.status_code == 200
    trainees_list = trainers_completion.json()
    t1_stat = next(t for t in trainees_list if t["trainee_id"] == tr1_id)
    t2_stat = next(t for t in trainees_list if t["trainee_id"] == tr2_id)
    assert t1_stat["is_completed"] is True
    assert t2_stat["is_completed"] is False

    # 8. Certificate RBAC:
    # A) Trainee cannot issue certificate
    bad_trainee_issue = client.post("/api/certificates/issue", json={"course_id": course1_id, "trainee_id": tr1_id}, headers=tr1_headers)
    assert bad_trainee_issue.status_code == 403

    # B) Trainer 2 (not course owner) cannot issue certificate for Course 1
    bad_trainer_issue = client.post("/api/certificates/issue", json={"course_id": course1_id, "trainee_id": tr1_id}, headers=t2_headers)
    assert bad_trainer_issue.status_code == 403

    # C) Trainer 1 cannot issue certificate for Trainee 2 who hasn't completed
    uncompleted_issue = client.post("/api/certificates/issue", json={"course_id": course1_id, "trainee_id": tr2_id}, headers=t1_headers)
    assert uncompleted_issue.status_code == 400

    # D) Trainer 1 successfully issues certificate for Trainee 1
    cert_res = client.post("/api/certificates/issue", json={"course_id": course1_id, "trainee_id": tr1_id, "grade": "A+"}, headers=t1_headers)
    assert cert_res.status_code == 201
    cert_data = cert_res.json()
    cert_id = cert_data["id"]
    cert_code = cert_data["certificate_code"]
    assert cert_code.startswith("CERT-CC-")
    assert cert_data["status"] == "ACTIVE"
    assert cert_data["grade"] == "A+"
    assert len(cert_data["verification_hash"]) == 64

    # 9. Duplicate Certificate Prevention:
    # Attempting to issue certificate again for same trainee & course must fail
    dup_res = client.post("/api/certificates/issue", json={"course_id": course1_id, "trainee_id": tr1_id}, headers=t1_headers)
    assert dup_res.status_code == 400
    assert "already been issued" in dup_res.json()["detail"]

    # 10. Trainee Certificate Isolation:
    # Trainee 1 sees their certificate
    tr1_certs = client.get("/api/trainee/certificates", headers=tr1_headers)
    assert tr1_certs.status_code == 200
    assert any(c["certificate_code"] == cert_code for c in tr1_certs.json())

    # Trainee 2 cannot see Trainee 1's certificate
    tr2_certs = client.get("/api/trainee/certificates", headers=tr2_headers)
    assert tr2_certs.status_code == 200
    assert not any(c["certificate_code"] == cert_code for c in tr2_certs.json())

    # 11. Public Certificate Verification:
    # Public endpoint requires NO authorization header
    public_res = client.get(f"/api/certificates/verify/{cert_code}")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["certificate_code"] == cert_code
    assert pub_data["status"] == "ACTIVE"
    assert pub_data["is_valid"] is True
    assert pub_data["course_title"] == "Cloud Architecture & DevOps"
    assert pub_data["trainee_name"] == "Trainee One"
    assert "email" not in pub_data
    assert "password" not in pub_data
    assert "trainee_id" not in pub_data

    # Invalid code returns 404
    assert client.get("/api/certificates/verify/NON-EXISTENT-CODE").status_code == 404

    # 12. Admin Certificate Viewing and Revocation:
    admin_email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    admin_id = client.post("/api/auth/signup", json={"email": admin_email, "password": "AdminPass123!", "name": "Super Admin", "role": "ADMIN"}).json()["id"]
    client.post("/api/admin/approve-user", json={"user_id": admin_id}, headers=admin_header)
    admin_login = client.post("/api/auth/login", json={"email": admin_email, "password": "AdminPass123!"}).json()
    admin_token = admin_login["access_token"]
    admin_auth = {"Authorization": f"Bearer {admin_token}"}

    all_certs = client.get("/api/admin/certificates", headers=admin_auth)
    assert all_certs.status_code == 200
    assert any(c["certificate_code"] == cert_code for c in all_certs.json())

    # Admin revokes the certificate
    revoke_res = client.post(f"/api/admin/certificates/{cert_id}/revoke", headers=admin_auth)
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "REVOKED"

    # Public verification of revoked certificate returns is_valid=False and status=REVOKED
    pub_revoked = client.get(f"/api/certificates/verify/{cert_code}")
    assert pub_revoked.status_code == 200
    assert pub_revoked.json()["status"] == "REVOKED"
    assert pub_revoked.json()["is_valid"] is False

    # 13. Notifications Flow and Isolation:
    notifs_after_revoke = client.get("/api/notifications", headers=tr1_headers)
    assert notifs_after_revoke.status_code == 200
    notif_list = notifs_after_revoke.json()
    assert len(notif_list) >= 2  # Course completed + Certificate issued + Certificate revoked
    rev_notif = next(n for n in notif_list if "Revoked" in n["title"])
    assert rev_notif["is_read"] is False

    # Trainee 2 cannot mark Trainee 1's notification as read
    assert client.patch(f"/api/notifications/{rev_notif['id']}/read", headers=tr2_headers).status_code == 404

    # Trainee 1 marks single notification as read
    mark_res = client.patch(f"/api/notifications/{rev_notif['id']}/read", headers=tr1_headers)
    assert mark_res.status_code == 200
    assert mark_res.json()["is_read"] is True

    # Trainee 1 marks all notifications as read
    mark_all = client.post("/api/notifications/mark-all-read", headers=tr1_headers)
    assert mark_all.status_code == 200

    unread_res = client.get("/api/notifications/unread-count", headers=tr1_headers)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] == 0
