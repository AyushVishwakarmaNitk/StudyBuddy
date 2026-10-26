# StudyBuddy AI — System Architecture & Integration Guide

Welcome to the **StudyBuddy AI** technical documentation. This document (`working.md`) explains the end-to-end connection between the **React + TypeScript frontend** and the **Django REST Framework + PostgreSQL backend**, covering authentication, database schema, security practices, and instructions for running the system.

---

## 1. System Overview & Architecture

StudyBuddy AI is a collaborative peer-learning platform where students can create study goals, find compatible study partners, track upcoming sessions, and manage their academic profile.

```
┌─────────────────────────────────────────┐
│           React + TypeScript            │
│            (Vite, Port 5173)            │
│                                         │
│  - LandingPage.tsx                      │
│  - SignUpLoginPage.tsx (Auth)           │
│  - DashboardPage.tsx (Goals & Partners) │
│  - Modular Components & DRY UI          │
└────────────────────┬────────────────────┘
                     │ HTTP / JSON
                     │ Bearer JWT Tokens
                     │ CORS Whitelisted
▼
┌─────────────────────────────────────────┐
│         Django REST Framework           │
│            (Port 8000)                  │
│                                         │
│  - SimpleJWT Authentication             │
│  - Custom Register & Login Serializers  │
│  - Profile Auto-Creation Signal         │
│  - PBKDF2 Password Hashing              │
└────────────────────┬────────────────────┘
                     │ psycopg2-binary
                     │ Port 5432
▼
┌─────────────────────────────────────────┐
│           PostgreSQL Database           │
│            ("studybuddy")               │
│                                         │
│  - auth_user                            │
│  - users_studentprofile                 │
└─────────────────────────────────────────┘
```

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, CSS Modules, Lucide React / Custom SVG icons.
- **Backend:** Python 3.15, Django 6.0, Django REST Framework 3.16.
- **Authentication:** `djangorestframework-simplejwt` (JSON Web Tokens).
- **Database:** PostgreSQL (with `psycopg2-binary` driver).
- **CORS Handling:** `django-cors-headers`.

---

## 3. PostgreSQL Database Configuration

### A. Environment Configuration (`.env`)
The database credentials and server settings are managed via `.env` in the project root:

```env
# Frontend Environment
VITE_API_URL=http://localhost:8000/api

# Django Environment
SECRET_KEY=django-insecure-studybuddy-key-dev-2026-safe-guard-jwt
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# PostgreSQL Database Configuration
DB_ENGINE=postgresql
DB_NAME=studybuddy
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

# Fallback switch for development
USE_SQLITE_FALLBACK=True
```

### B. Intelligent PostgreSQL Connection in `backend/config/settings.py`
Django is configured with standard PostgreSQL settings:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASSWORD,
        'HOST': DB_HOST,
        'PORT': DB_PORT,
    }
}
```

> **Developer Quality of Life:** If PostgreSQL is temporarily stopped on your machine during development, a lightweight network check detects whether port `5432` is reachable. If unreachable and `USE_SQLITE_FALLBACK=True`, it falls back gracefully to local SQLite so development servers and tests don't crash. Once PostgreSQL is running, it connects straight to PostgreSQL.

### C. Setting Up PostgreSQL on Your Local Machine
1. Open pgAdmin or psql shell:
   ```sql
   CREATE DATABASE studybuddy;
   ```
2. Verify your PostgreSQL password in `.env` matches your local Postgres password.
3. Apply Django migrations to PostgreSQL:
   ```powershell
   backend\venv315\Scripts\python.exe backend\manage.py migrate
   ```

---

## 4. Backend Authentication & Models

### A. Database Models (`backend/users/models.py`)
- Standard Django `User` model handles identity, username, email, and password hashes.
- `StudentProfile` extends `User` with a One-to-One relationship:
  - `branch` (e.g., Computer Science & Engineering)
  - `year` (Academic year: 1 to 5)
  - `bio` (Student's learning introduction)
  - `avatar_url` (Profile picture URL or base64)
- A **Django post-save signal** (`@receiver(post_save, sender=User)`) automatically creates a `StudentProfile` whenever a new user is created.

### B. API Endpoints

| HTTP Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register new student, hashes password, returns user & JWT tokens | No |
| `POST` | `/api/auth/login/` | Log in with username **or** email, returns user & JWT tokens | No |
| `POST` | `/api/auth/token/refresh/` | Refresh expired access token using refresh token | No |
| `GET` | `/api/auth/me/` | Fetch current student's data and profile | Yes (Bearer JWT) |
| `PUT` | `/api/auth/profile/update/` | Update bio, branch, year, or display picture | Yes (Bearer JWT) |

### C. Sample Registration Request & Response

**Request (`POST /api/auth/register/`):**
```json
{
  "username": "rohan_verma",
  "email": "rohan@example.com",
  "password": "StrongPassword123",
  "password2": "StrongPassword123"
}
```

**Response (`201 Created`):**
```json
{
  "message": "User registered successfully",
  "tokens": {
    "refresh": "eyJhbGciOiJIUzI1NiIs...",
    "access": "eyJhbGciOiJIUzI1NiIs..."
  },
  "user": {
    "id": 1,
    "username": "rohan_verma",
    "email": "rohan@example.com",
    "first_name": "",
    "last_name": "",
    "profile": {
      "id": 1,
      "branch": "Computer Science & Engineering",
      "year": 1,
      "bio": "",
      "avatar_url": ""
    }
  }
}
```

---

## 5. Frontend Integration Layer

### A. Removing Hardcoded Credentials
- Removed all hardcoded credentials (`student` / `study123`) from `SignUpLoginPage.tsx`.
- Form inputs dynamically validate real usernames/emails and passwords.
- Real error messages from backend validation (e.g., "A user with that username already exists" or "Invalid credentials") are displayed directly in the UI.

### B. API Client (`frontend/src/api/client.ts`)
The API client provides automated request handling and token lifecycle management:
1. **Automatic Bearer Token Injection:** Every request automatically attaches `Authorization: Bearer <access_token>` from `localStorage`.
2. **Transparent Token Refresh:** If an API call receives a `401 Unauthorized` because the access token expired, `client.ts` automatically calls `/api/auth/token/refresh/` with the stored refresh token, updates `localStorage`, and retries the original request seamlessly.
3. **Automatic Clean Logout:** If both tokens expire, stored tokens are cleared and the user is redirected to log in.

### C. Persistent Auth State (`frontend/src/App.tsx`)
- On application boot, `App.tsx` checks `localStorage` for existing tokens.
- If tokens exist, it calls `authApi.getCurrentUser()` to hydrate the logged-in student's account state and redirects directly to the `dashboard`.
- If no token exists, the user lands safely on `LandingPage`.
- Clicking **Log Out** in the profile dropdown invokes `authApi.logout()`, clears tokens, and returns to the landing page.

### D. Synchronization with Dashboard (`frontend/src/pages/DashboardPage.tsx`)
- When logged in, the student's real username, email, and display picture automatically populate:
  - Top navigation avatar & username.
  - Profile dropdown card.
  - Profile editing modal.

---

## 6. Security Considerations & Best Practices

1. **Password Hashing:**
   - Django uses `PBKDF2` with a `SHA256` hash and high work factor.
   - Plaintext passwords are never stored in PostgreSQL or logged.
2. **Dual-Key JWT Tokens:**
   - Short-lived Access Token (1 day).
   - Long-lived Refresh Token (7 days).
   - HMAC-SHA256 signature verification protects against tampering.
3. **Cross-Origin Resource Sharing (CORS):**
   - Configured with `django-cors-headers` to strictly allow trusted origins (`http://localhost:5173`, `http://127.0.0.1:5173`).
4. **Input Sanitization & Validation:**
   - Password confirmation match check on both client and server.
   - Minimum length and complexity checks.
   - Case-insensitive email and username validation preventing collision exploits.

---

## 7. How to Run the Project

### A. Start the Backend Server
In a terminal:
```powershell
# Navigate to project root
cd "e:\Computing Lab Project\StudyBuddy"

# Activate the virtual environment
.\backend\venv315\Scripts\Activate.ps1

# (Optional) Run tests to verify everything passes
python backend\manage.py test users

# Run the Django REST API server
python backend\manage.py runserver 8000
```
Backend will be live at: `http://localhost:8000`

### B. Start the Frontend Dev Server
In a second terminal:
```powershell
# Navigate to frontend folder
cd "e:\Computing Lab Project\StudyBuddy\frontend"

# Start Vite dev server
npm run dev
```
Frontend will be live at: `http://localhost:5173`

---

## 8. Verification & Test Results
- **Django Unit Tests:** 6/6 tests passed (`test_register_user`, `test_register_password_mismatch`, `test_login_with_username`, `test_login_with_email`, `test_login_invalid_password`, `test_current_user_me_endpoint`).
- **TypeScript & Vite Build:** `tsc -b && vite build` completed with 0 errors (`dist` generated).

