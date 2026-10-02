import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_approval_workflow():
    unique_email = f"trainee_{uuid.uuid4().hex[:8]}@example.com"
    
    print("=== Step 1: Signup User ===")
    signup_payload = {
        "email": unique_email,
        "password": "MySecretPassword123!",
        "name": "Jane Doe",
        "role": "TRAINEE"
    }
    signup_res = client.post("/api/auth/signup", json=signup_payload)
    print(f"Signup Status: {signup_res.status_code}")
    print(f"Signup Response: {signup_res.json()}")
    assert signup_res.status_code == 201
    user_data = signup_res.json()
    assert user_data["status"] == "PENDING"
    user_id = user_data["id"]

    print("\n=== Step 2: Attempt Login (Pending User) ===")
    login_payload = {
        "email": unique_email,
        "password": "MySecretPassword123!"
    }
    pending_login_res = client.post("/api/auth/login", json=login_payload)
    print(f"Pending Login Status: {pending_login_res.status_code}")
    print(f"Pending Login Response: {pending_login_res.json()}")
    assert pending_login_res.status_code == 403
    assert pending_login_res.json()["detail"] == "Account not approved yet"

    print("\n=== Step 3: Admin Approves User ===")
    # Unauthenticated attempt should fail with 401
    unauth_approve = client.post("/api/admin/approve-user", json={"user_id": user_id})
    assert unauth_approve.status_code == 401

    # Authorized approval via admin secret / admin credentials succeeds
    approve_res = client.post(
        "/api/admin/approve-user",
        json={"user_id": user_id},
        headers={"x-admin-secret": "admin_secret_key"}
    )
    print(f"Approval Status: {approve_res.status_code}")
    print(f"Approval Response: {approve_res.json()}")
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    print("\n=== Step 4: Login Again (Approved User) ===")
    approved_login_res = client.post("/api/auth/login", json=login_payload)
    print(f"Approved Login Status: {approved_login_res.status_code}")
    print(f"Approved Login Response: {approved_login_res.json()}")
    assert approved_login_res.status_code == 200
    token_data = approved_login_res.json()
    assert "access_token" in token_data
    assert token_data["user"]["status"] == "APPROVED"

    print("\nALL APPROVAL WORKFLOW TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_approval_workflow()
