# Evolvia - AI-Powered Learning Evolution Platform (Updated)

This updated README mirrors the original project's structure while documenting the recent frontend authentication and backend database integrations added during development.

## 🚀 Key Updates (since prior README)

- Authentication:
  - Frontend now requires users to sign in for feature access (Connect/Disconnect toggles in the Topbar).
  - `AuthContext` exposes a `refreshUser()` helper to re-fetch the user profile after actions (e.g. journaling) so UI state such as `streak` updates immediately.
  - Protected pages (example: Personality) will show a Connect prompt when the user is not authenticated and redirect to `/login` where appropriate.
- Personality & Journaling:
  - Submitting a journal entry triggers an AI analysis and refreshes both the personality radar and the user profile (so streaks update when a journal entry is successfully processed).
  - Personality Radar now fetches personalized data from the backend for each authenticated user.
- Database & Backend:
  - Backend stores user profiles, personality radar values, and streak metadata in the database. Ensure DB migrations and seed data are applied before running.
  - API endpoints used by the frontend include:
    - `/api/v1/auth/login` (POST) — obtain JWT access token
    - `/api/v1/users/profile` (GET) — fetch user profile (requires Bearer token)
    - `/api/v1/personality/radar` (GET) — fetch personality radar data for a user
    - `/api/v1/personality/analyze` (POST) — analyze a journal entry (example)

## 📂 Project Structure

```bash
evolvia/
├── backend/            # FastAPI (Python) - Modular Domain Logic
│   ├── app/
│   │   ├── api/        # Domain Routers (Lessons, Pitch, Collaboration, Personality, etc.)
│   │   ├── models/     # SQLModel Database Models (users, personality, progress, journals)
│   │   ├── services/   # Business Logic (AI, Learning, Personality)
│   │   └── main.py     # App entry point
│   └── requirements.txt
└── frontend/           # Next.js 16 (Turbopack) - Tailwind v4
    ├── app/            # App Router & Styles (pages like /personality require auth)
    ├── components/     # UI Components (Topbar now toggles Connect/Disconnect)
    └── lib/            # API client wrappers (login, profile, radar fetches)
```

## 🛠️ Getting Started (with DB & Auth notes)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**
- A running database (Postgres / SQLite as configured in `backend` environment)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# Apply migrations or create the DB (follow backend/README or DATABASE_SETUP.md)
python -m uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`. Ensure environment variables for DB connection and JWT secrets are set.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

### Authentication Flow Notes
- Login uses `/api/v1/auth/login` and stores a Bearer token in `localStorage` as `authToken`.
- `AuthProvider` loads the token from `localStorage` on mount and fetches `/api/v1/users/profile` for the current user.
- After actions that should update user metadata (e.g. journaling), the frontend calls `refreshUser()` to re-sync streaks and profile fields.

## 🎨 Technology Stack

- **Frontend**: Next.js 16, Tailwind CSS 4, Lucide React, Recharts.
- **Backend**: FastAPI, SQLModel (SQLAlchemy), Pydantic, Python-JOSE (JWT).
- **AI**: Ollama / external LLM integrations via `AIService`.

## 🔐 Security & Auth Recommendations
- Keep `NEXT_PUBLIC_API_URL` pointing to your dev/staging/production API as appropriate.
- Use secure, short-lived JWT access tokens; store refresh tokens securely if implemented.
- Validate and sanitize journal input on the backend before sending it to any external LLM.

## 🤝 Contribution Notes
- Place new API routes in `backend/app/api/` and keep domain logic inside `services/`.
- Frontend auth-related UI lives in `frontend/app/context/AuthContext.tsx` and components that consume it (e.g., Topbar, ProtectedRoute, personality page).

## Files Updated in This Patch
- `frontend/app/context/AuthContext.tsx` — added `refreshUser()` and exposed it to components.
- `frontend/components/Topbar.tsx` — toggles Connect/Disconnect based on auth state and navigates to `/login` when disconnected.
- `frontend/app/personality/page.tsx` — enforces auth for personality features; calls `refreshUser()` after successful journal analysis so `streak` updates immediately.

---

If you want this written to a different filename or merged into the original README, tell me the preferred name or whether to replace the existing README.md.
