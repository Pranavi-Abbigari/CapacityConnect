import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_auth_flow():
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    print(f"--- 1. Testing Signup ({unique_email}) ---")
    signup_data = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "name": "Alex Smith",
        "role": "TRAINEE"
    }
    response = client.post("/api/auth/signup", json=signup_data)
    print(f"Signup Status: {response.status_code}")
    print(f"Signup Response: {response.json()}")
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    user_res = response.json()
    assert user_res["email"] == signup_data["email"]
    assert user_res["name"] == signup_data["name"]
    assert user_res["role"] == signup_data["role"]
    assert "password" not in user_res

    print("\n--- 2. Testing Duplicate Signup ---")
    dup_response = client.post("/api/auth/signup", json=signup_data)
    print(f"Duplicate Signup Status: {dup_response.status_code}")
    print(f"Duplicate Signup Response: {dup_response.json()}")
    assert dup_response.status_code == 400

    print("\n--- 3. Testing Login (Success) ---")
    login_data = {
        "email": unique_email,
        "password": "SecurePassword123!"
    }
    login_response = client.post("/api/auth/login", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    print(f"Login Response: {login_response.json()}")
    assert login_response.status_code == 200
    token_res = login_response.json()
    assert "access_token" in token_res
    assert token_res["token_type"] == "bearer"
    assert token_res["user"]["email"] == signup_data["email"]

    print("\n--- 4. Testing Login (Invalid Password) ---")
    bad_login = {
        "email": unique_email,
        "password": "WrongPassword!"
    }
    bad_res = client.post("/api/auth/login", json=bad_login)
    print(f"Invalid Login Status: {bad_res.status_code}")
    print(f"Invalid Login Response: {bad_res.json()}")
    assert bad_res.status_code == 401

    print("\nALL AUTH TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_auth_flow()
