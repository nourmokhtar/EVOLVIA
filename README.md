# Evolvia - AI-Powered Learning Evolution Platform

Evolvia is a premium, AI-driven platform designed to accelerate both hard and soft skill development. It features a modular architecture, a virtual AI teacher, and high-fidelity soft skill simulations.

## 🚀 Key Features

- **Personalized Dashboard**: Real-time progress tracking with a data-rich Personality Radar Map.
- **Interactive Learning Interface**: Multi-board learning environment with a simulated Virtual AI Teacher.
- **Soft Skills Lab**:
  - **Pitch Simulator**: Analyzes clarity, confidence, and empathy in real-time.
  - **Collaboration Simulation**: Scenario-based role-play for conflict resolution.
- **Adaptive Growth**: AI-suggested learning paths based on personality profiling.
- **Premium UI**: Modern glassmorphism design with full Dark/Light mode support.

## 📂 Project Structure

```bash
evolvia/
├── backend/            # FastAPI (Python) - Modular Domain Logic
│   ├── app/
│   │   ├── api/        # Domain Routers (Lessons, Pitch, Collaboration, etc.)
│   │   ├── models/     # SQLModel Database Models
│   │   ├── services/   # Business Logic (AI, Learning, Personality)
│   │   └── main.py     # App entry point
│   └── requirements.txt
└── frontend/           # Next.js 16 (Turbopack) - Tailwind v4
    ├── app/            # App Router & Styles
    ├── components/     # UI Components (Sidebar, Topbar, Toggles)
    └── package.json
```

## 🛠️ Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🎨 Technology Stack

- **Frontend**: Next.js 16, Tailwind CSS 4, Lucide React, Recharts, next-themes.
- **Backend**: FastAPI, SQLModel (SQLAlchemy), Pydantic, Python-JOSE (JWT).
- **AI**: Integration-ready for Google Gemini and other LLMs via `AIService`.

## 🤝 Contribution for Teammates

- **Modular Design**: Ensure new features are placed in their respective domain files (e.g., `app/api/new_domain.py`).
- **Services**: Complex logic should reside in `app/services/` to keep routers clean.
- **Theming**: Use the CSS variables defined in `globals.css` to maintain visual consistency.
