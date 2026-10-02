# 🚀 LearnBridge

Digital Capacity Building & Learning Management Portal

---

## 🚀 Overview

LearnBridge is a web-based learning management and capacity-building portal designed to connect administrators, trainers, and trainees within a unified digital environment. The application streamlines institutional training workflows by centralizing user management, course cataloging, enrollment tracking, assessments, certificate issuance, verification, announcements, and stakeholder feedback.

---

## 🎯 Problem

Institutional training and capacity-building programs often rely on fragmented tools for registrations, course distribution, examinations, certificate issuance, and reporting. This lack of integration leads to administrative overhead, delayed progress tracking, manual record reconciliation, and challenges in verifying student credentials.

---

## 💡 Solution

LearnBridge provides a cohesive, role-based platform that unifies all training operations:

- **👨‍💼 Administrators** oversee platform governance, approve registrations, manage course catalogs, monitor certificates, broadcast announcements, and review institutional metrics.
- **👨‍🏫 Trainers** author course modules, define prerequisites, design quizzes with automated grading, publish targeted announcements, and monitor learner completion.
- **🎓 Trainees** discover courses, enroll in curriculum tracks, take interactive assessments, monitor academic standing, download verified certificates, and submit structured feedback.

---

## ✨ Key Features

### 🔐 Authentication & Role-Based Access
- 🔒 Secure registration and login with bcrypt password hashing
- 🛡️ Role-based access control (RBAC) with JSON Web Tokens (JWT)
- 🧭 Dedicated dashboards and navigation tailored to Admin, Trainer, and Trainee roles
- 🚪 Protected frontend client routes and backend endpoint authorization gates
- 🔑 Browser password-manager compatibility supporting standard autofill attributes

### 👨‍💼 Admin Dashboard
- 👥 User account directory with search by name/email, role filtering, and approval status
- ✅ Pending user approval workflow for institutional access control
- 📖 Centralized course catalog governance with status filtering
- 🏅 Certificate management directory with search and revocation capabilities
- 📢 Global campus announcement publishing and system feedback oversight
- 📊 Real-time institutional metrics and KPI summaries

### 👨‍🏫 Trainer Course & Assessment Management
- 📚 Course creation and modular curriculum publishing
- 🎯 Prerequisite and competency mapping
- 📝 Quiz and assessment builder supporting multi-choice questions with answer explanations
- 📈 Trainee submission tracking and automated grading results
- 📢 Course-specific announcement publishing
- ⭐ Trainee ratings and review inspection

### 🎓 Trainee Learning Dashboard
- 🔍 Available course discovery catalog with live search and filtering
- ⚡ One-click course enrollment and progress tracking
- ✍️ Interactive MCQ quiz taker with immediate score evaluation
- 📊 Academic performance visual summary tracking enrolled modules, completion rates, quizzes passed, and average scores
- 🏆 Digital certificate repository with search functionality
- 💬 Course and trainer feedback submission
- 📢 Campus and course announcement feed with category filtering

### 📚 Course Management
- 📑 Modular curriculum publishing with descriptions and competencies
- 🔄 Self-paced enrollment and completion status tracking
- 🔎 Real-time client-side search and filtering across titles and descriptions
- 🏷️ Course-level competency tagging for structured skill pathways

### 📝 Quizzes & Assessments
- 📋 Subject-wise quizzes linked directly to course modules
- 🔘 Multiple-choice questions with configurable correct answers and explanations
- 💯 Automatic evaluation with immediate percentage scoring and pass/fail thresholds
- ⏱️ Attempt detail tracking recording selected answers and timestamps

### 🎯 Skills & Competencies
- 🗂️ Centralized competency catalog across technical and professional skills
- 📊 Multi-tier proficiency tracking (Beginner, Intermediate, Advanced, Expert)
- 👤 User profile skill declarations for trainees and domain expertise for trainers
- 🔗 Course prerequisite mapping against learner competencies

### 🏅 Certificates & QR Verification
- 🎓 Automatic certificate issuance upon meeting course passing criteria
- 🔐 Unique cryptographic certificate codes
- 📱 Integrated QR code generation linking directly to the public registry
- 🌐 Dedicated public certificate verification portal (`/verify-certificate`)
- 📜 Verifiable digital diploma modal with printable PDF view

### ⭐ Feedback & Reviews
- 🌟 Trainee-to-course rating and qualitative review submissions
- 👨‍🏫 Trainee-to-trainer instructional evaluations
- 📋 Aggregated feedback displays accessible to faculty leads and administrators

### 📢 Notifications & Announcements
- 🔔 Centralized notification bell for timely platform alerts
- 📌 Multi-category announcement feed supporting global campus notices and course-specific updates
- 🏷️ Instant filtering across All, Campus, and Course announcement categories

### 📊 Dashboard Insights
- 📈 Live completion ratios and enrollment totals
- 🏅 Trainee performance analytics summarizing attempts, pass rates, and standing tiers
- 📉 Visual progress indicators calculated dynamically from database records

---

## 👥 User Roles

| Role | Primary Responsibilities |
|---|---|
| **👨‍💼 Admin** | Manages user registrations, approvals, course governance, certificates, global announcements, and institutional metrics. |
| **👨‍🏫 Trainer** | Authors courses, configures competency requirements, builds quizzes, monitors submissions, and publishes course updates. |
| **🎓 Trainee** | Discovers courses, enrolls, completes assessments, reviews scores, receives verified certificates, and submits feedback. |

### 👨‍💼 Admin
Administrators maintain overall platform health, review pending registrations, ensure curriculum compliance, govern certificates, broadcast announcements, and monitor institutional analytics.

### 👨‍🏫 Trainer
Trainers design educational materials, structure question banks, define passing thresholds, evaluate assessment results, and interact with learner cohorts through targeted updates.

### 🎓 Trainee
Trainees discover courses matching their career goals, take interactive assessments, review evaluation results, receive verifiable digital credentials, and provide course feedback.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Build Tool:** Vite
- **Routing:** React Router v7

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.13
- **ORM:** SQLAlchemy 2.0
- **Validation:** Pydantic v2
- **ASGI Server:** Uvicorn
- **Authentication:** PyJWT (HS256) & bcrypt

### Database
- **Engine:** SQLite (used as the relational application database for local development and project demonstration)

---

## 🏗️ System Architecture

```text
       ┌────────────────────────┐
       │   User (Web Browser)   │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │     React Frontend     │
       │  Tailwind + TypeScript │
       └───────────┬────────────┘
                   │
             REST API Calls
                   │
                   ▼
       ┌────────────────────────┐
       │    FastAPI Backend     │
       │   Routers + Security   │
       └───────────┬────────────┘
                   │
             SQLAlchemy ORM
                   │
                   ▼
       ┌────────────────────────┐
       │    SQLite Database     │
       │   Local File Storage   │
       └────────────────────────┘
```

---

## 📁 Project Structure

```text
CapacityConnect/
├── backend/
│   ├── main.py              # Application entrypoint, middleware, and router mounting
│   ├── database.py          # SQLAlchemy engine, session maker, and base declarative class
│   ├── security.py          # Password hashing, JWT token handling, and RBAC dependencies
│   ├── requirements.txt     # Python backend dependencies
│   ├── pytest.ini           # Pytest configuration
│   ├── models/              # Relational database models
│   ├── routers/             # Endpoint route handlers (auth, admin, courses, quizzes, etc.)
│   ├── schemas/             # Pydantic request and response schemas
│   └── tests/               # Backend automated test suites
├── frontend/
│   ├── index.html           # Single-page application HTML entrypoint
│   ├── package.json         # Frontend dependencies and npm scripts
│   ├── vite.config.ts       # Vite bundler configuration
│   ├── .env.example         # Environment template for frontend API base URL
│   ├── public/              # Static assets (logo, icons, favicon)
│   └── src/
│       ├── api/             # Centralized API client handlers
│       ├── components/      # Reusable UI components and modal dialogs
│       ├── context/         # AuthContext and state providers
│       ├── pages/           # Page views (Dashboards, Login, Signup, Verify)
│       └── types/           # TypeScript data interfaces
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```

The backend API will run at `http://127.0.0.1:8000`.

### Frontend Setup

1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```

The application will run at `http://localhost:5173`.

---

## 🔧 Environment Configuration

LearnBridge uses an environment file for client API endpoint configuration. A template file [`frontend/.env.example`](frontend/.env.example) is included in the repository:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

To configure custom endpoints:
1. Create a `.env` file inside the `frontend/` directory (excluded from Git for security).
2. Set `VITE_API_BASE_URL` to your backend server URL.

---

## 📚 API Documentation

Interactive Swagger API documentation is automatically generated by FastAPI and accessible when the backend is running:

- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc UI:** `http://127.0.0.1:8000/redoc`

---

## 🧪 Testing

### Backend Tests
The backend test suite covers authentication, RBAC, approval flows, course lifecycle, quizzes, competencies, certificates, analytics, and feedback.

Run tests using pytest:
```bash
cd backend
pytest -q
```

### Frontend Build Verification
The frontend TypeScript types and production bundle build can be verified with:
```bash
cd frontend
npm run build
```

---

## 🔐 Security

LearnBridge implements defense-in-depth security best practices:
- **Password Protection:** Passwords hashed using standard bcrypt salts prior to database storage.
- **Stateless Authentication:** Secure JWT access tokens signed with HMAC-SHA256 and transmitted via standard Authorization Bearer headers.
- **Role-Based Authorization:** Server-side route dependencies (`RoleChecker`) strictly enforce role privileges for sensitive operations.
- **Input Validation:** Strict Pydantic models validate and sanitize all incoming request payloads.
- **Route Guards:** Client-side protected route wrappers prevent unauthenticated access to dashboard views.

---

## 📱 Responsive Design

The user interface is built using Tailwind CSS utility classes and includes responsive optimizations:
- Responsive horizontal tab navigation with smooth touch-target spacing for mobile viewports
- Horizontal table container overflow handling for data-dense administration views
- Touch-friendly full-width clickable options for mobile assessment takers
- Responsive certificate modal dialogs with internal scrolling

---

## 📜 Certificate Verification

Each issued certificate receives a unique tamper-evident verification code and cryptographic hash. LearnBridge provides two verification mechanisms:
1. **Direct Code Lookup:** Users can enter any certificate identifier into the public `/verify-certificate` registry page.
2. **QR Code Scanning:** Every digital certificate renders a dynamic QR code that directs smartphones and scanners directly to the official verification page.

---

## 🔮 Future Scope

Potential future enhancements for LearnBridge include:
- AI-driven personalized learning path and course recommendations
- Automated organizational skill-gap analytics and predictive hiring matching
- Cloud deployment and managed database migration (PostgreSQL)
- Dedicated native mobile applications (iOS/Android)
- Email and SMS event notifications
- Third-party LMS integrations (SCORM/LTI compliance)

---

## 🏆 SIH Context

- **Event:** Smart India Hackathon 2026
- **Problem Statement:** SIH26075 – CAPACITY CONNECT
- **Project Name:** LearnBridge
- **Domain:** Digital Capacity Building & Learning Management

---

## 📌 Project Status

The planned feature scope of LearnBridge is fully implemented, verified, and running in local development mode.

---

## 📄 License

Developed as an educational and hackathon submission. Distributed for academic and demonstration purposes.
