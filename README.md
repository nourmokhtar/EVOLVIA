# Evolvia - AI-Powered Learning Evolution Platform (Integrated)

Evolvia is a premium, AI-driven platform designed to accelerate both hard and soft skill development. It features a modular architecture, a virtual AI teacher, high-fidelity soft skill simulations, **Ollama-powered personality analysis**, **Supabase video storage**, and **puzzle-based assessments**.

## 🚀 Key Features

- **Personalized Dashboard**: Real-time progress tracking with a data-rich Personality Radar Map.
- **Interactive Learning Interface**: Multi-board learning environment with a simulated Virtual AI Teacher.
- **Soft Skills Lab**:
  - **Pitch Simulator**: Analyzes clarity, confidence, and empathy in real-time.
  - **Collaboration Simulation**: Scenario-based role-play for conflict resolution.
- **Ollama Personality Analysis**: Local LLM-based personality trait analysis and updates.
- **Video Storage**: Supabase-powered video upload, storage, and streaming.
- **Puzzle Assessments**: Interactive personality puzzles with visual feedback.
- **Adaptive Growth**: AI-suggested learning paths based on personality profiling.
- **Premium UI**: Modern glassmorphism design with full Dark/Light mode support.

## 📂 Project Structure

```bash
evolvia/
├── backend/            # FastAPI (Python) - Modular Domain Logic
│   ├── app/
│   │   ├── api/        # Domain Routers (Lessons, Pitch, Collaboration, Videos, Puzzle, etc.)
│   │   ├── db/         # Database (SQLite + Supabase client)
│   │   ├── models/     # SQLModel Database Models
│   │   ├── services/   # Business Logic (AI, Learning, Personality, Puzzle)
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
- **Ollama** (for personality analysis) - [Install Ollama](https://ollama.ai)
- **Supabase Account** (for video storage) - [Supabase Setup Guide](./SUPABASE_SETUP.md)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # On Windows
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env
# Edit .env with your Supabase credentials and other settings

# Run the server
python -m uvicorn app.main:app --reload --port 8000
```
The API will be available at `http://localhost:8000`.

### 2. Ollama Setup (for Personality Analysis)
```bash
# Install Ollama from https://ollama.ai
# Pull the model
ollama pull llama3.2

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

### 3. Supabase Setup (for Video Storage)
See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions on:
- Creating a Supabase project
- Setting up the "vid" storage bucket
- Configuring environment variables

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🎨 Technology Stack

- **Frontend**: Next.js 16, Tailwind CSS 4, Lucide React, Recharts, next-themes.
- **Backend**: FastAPI, SQLModel (SQLAlchemy), Pydantic, Python-JOSE (JWT).
- **Database**: SQLite (local) + Supabase (cloud storage).
- **AI**: 
  - Ollama (local LLM for personality analysis)
  - Google Gemini (general AI tasks)
  - OpenAI GPT-4 (collaboration evaluation)
  - LangChain + LangGraph (workflow orchestration)
  - Opik (observability)

## 🔧 New Integrated Features

### Video Storage & Management
- Upload videos to Supabase storage bucket
- Generate signed URLs for secure video access
- List, download, and delete videos
- API endpoints: `/api/v1/videos/*`

### Ollama Personality Analysis
- Analyze user journal entries with local LLM
- Update personality traits based on AI analysis
- Track personality evolution over time
- API endpoint: `/api/v1/personality/analyze-with-ollama`

### Puzzle Assessments
- Interactive personality assessment puzzles
- Visual puzzle generation based on responses
- Dimension-based scoring and insights
- API endpoints: `/api/v1/puzzle/*`

## 🤝 Contribution for Teammates

- **Modular Design**: Ensure new features are placed in their respective domain files (e.g., `app/api/new_domain.py`).
- **Services**: Complex logic should reside in `app/services/` to keep routers clean.
- **Theming**: Use the CSS variables defined in `globals.css` to maintain visual consistency.
- **Database**: Use SQLite for core data, Supabase for file storage and optional cloud database.

## 📚 Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [API Documentation](http://localhost:8000/docs) (when server is running)
- [Quick Start Guide](./QUICK_START.md)

## 🔐 Environment Variables

Key environment variables to configure in `.env`:

```bash
# Supabase (Video Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_BUCKET_NAME=vid

# Ollama (Personality Analysis)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
USE_OLLAMA_FOR_PERSONALITY=true

# Database
DATABASE_URL=sqlite:///./virtual_closet.db

# JWT Secret
SECRET_KEY=your-secret-key-here
```

See `.env.example` for all available configuration options.
