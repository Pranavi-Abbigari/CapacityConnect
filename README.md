# LearnBridge

**SIH Problem Statement:** SIH26075 – CAPACITY CONNECT  
**Project Name:** LearnBridge  
**Description:** A centralized digital capacity-building and learning-management portal designed for institutional training programs, role-based dashboards, course enrollment, and automated MCQ assessments.

---

## Technology Stack

* **Frontend:** React 19, TypeScript, Vite, React Router v7, Tailwind CSS v4
* **Backend:** FastAPI (Python 3.13), SQLAlchemy 2.0 ORM, Pydantic v2, PyJWT (HS256 Bearer Tokens), bcrypt
* **Database:** SQLite (`capacity_connect_v6.db` stored at the project root)

---

## Project Structure

```
CapacityConnect/
├── backend/
│   ├── main.py                     # FastAPI application entrypoint & routing
│   ├── database.py                 # SQLAlchemy engine bound to root database
│   ├── security.py                 # Password hashing, JWT token logic, RBAC dependencies
│   ├── requirements.txt            # Python dependencies
│   ├── conftest.py                 # Test configuration
│   ├── pytest.ini                  # Pytest runner settings
│   ├── models/                     # SQLAlchemy models (User, Course, Quiz, Question, Attempt, Profile, Skill)
│   ├── schemas/                    # Pydantic schemas (auth, admin, course, quiz, profile)
│   ├── routers/                    # API route handlers (auth, admin, courses, quizzes, profiles)
│   └── tests/                      # Automated test suites
│       ├── test_auth.py
│       ├── test_approval_workflow.py
│       ├── test_admin_dashboard.py
│       ├── test_courses_flow.py
│       ├── test_quizzes_flow.py
│       └── test_profiles_and_skills.py
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html                  # Branded portal entry
│   ├── .env                        # VITE_API_BASE_URL=http://127.0.0.1:8000
│   ├── .env.example
│   └── src/
│       ├── types/                  # TypeScript interface definitions
│       ├── api/                    # Centralized API client (auth, admin, courses, quizzes, profiles)
│       ├── context/                # AuthContext & persistent session state
│       ├── components/             # TraineeProfileSection, TrainerProfileSection, AdminUserProfileModal...
│       └── pages/                  # Login, Signup, AdminDashboard, TrainerDashboard, TraineeDashboard
│
├── capacity_connect_v6.db          # Active SQLite production database
└── README.md
```

---

## Getting Started

### 1. Backend Setup & Run

Navigate to the `backend` directory, install requirements, and launch Uvicorn:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be accessible at: `http://127.0.0.1:8000`  
Interactive Swagger docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup & Run

In a separate terminal, navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The web application will launch (typically at `http://localhost:5173`).

---

## Running Automated Tests

Run all backend test suites from the `backend/` directory:

```bash
cd backend
pytest -q
```

---

## Implemented Features

### Phase 1: Authentication, RBAC & Core Portals
* **Authentication & RBAC:** Secure signup, institutional admin approval gate (`PENDING` -> `APPROVED`), bcrypt password hashing, JWT Bearer tokens, and change-password functionality.
* **Role-Based Portals:**
  * **Admin:** Live system metrics, pending user approvals queue, user directory, and course catalog view.
  * **Trainer:** Course authoring, quiz/assessment builder with 4-choice questions, and trainee submission analytics.
  * **Trainee:** Course catalog, 1-click enrollment, interactive MCQ assessment player with auto-grading, and attempt score history.
* **Database Persistence:** Real SQLite persistence with relational integrity and cascade rules (`capacity_connect_v6.db`).

### Phase 2: Profiles, Skills & Competency Foundation
* **Trainee Profiles:** Qualification, work experience, learning interests, and career profile summary.
* **Trainer Profiles:** Academic qualifications, domain specialization, industry experience, and expertise summary.
* **Reusable Skills Catalog:** Standardized catalog across technical and professional competencies (Python, FastAPI, SQL, Cloud, ML, etc.).
* **Competency Mapping:** Multi-level proficiency tracking (`Beginner`, `Intermediate`, `Advanced`, `Expert`) with verifiable credentials/evidence for both trainees and trainers.
* **Admin Competency Inspection:** In-depth audit modal allowing administrators to inspect any user's educational profile and declared competencies.
* **Security & Isolation:** Strict RBAC ensuring users can only manage their own profiles and skills while preventing cross-user modifications.

