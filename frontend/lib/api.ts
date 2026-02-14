// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Evolvia API Endpoints
export const API = {
  // Authentication
  auth: {
    signup: `${API_URL}/api/v1/auth/signup`,
    login: `${API_URL}/api/v1/auth/login`,
  },

  // Users
  users: {
    me: `${API_URL}/api/v1/users/me`,
    profile: `${API_URL}/api/v1/users/profile`,
    avatar: `${API_URL}/api/v1/users/avatar`,
  },

  // Lessons
  lessons: {
    list: `${API_URL}/api/v1/lessons/`,
    detail: (id: string) => `${API_URL}/api/v1/lessons/${id}`,
  },

  // Quizzes
  quizzes: {
    detail: (lessonId: string) => `${API_URL}/api/v1/quizzes/${lessonId}`,
    questions: (quizId: string) => `${API_URL}/api/v1/quizzes/${quizId}/questions`,
  },

  // AI Teacher
  ai: {
    chat: `${API_URL}/api/v1/ai_teacher/chat`,
    feedback: `${API_URL}/api/v1/ai_teacher/feedback`,
  },

  // Pitch
  pitch: {
    analyze: `${API_URL}/api/v1/pitch/analyze`,
    history: `${API_URL}/api/v1/pitch/history`,
    deckAnalyze: `${API_URL}/api/v1/pitch/deck/analyze`,
    deckExtract: `${API_URL}/api/v1/pitch/deck/extract`,
  },

  // Collaboration
  collaboration: {
    start: `${API_URL}/api/v1/collaboration/start`,
    turn: `${API_URL}/api/v1/collaboration/turn`,
  },

  // Personality
  personality: {
    radar: `${API_URL}/api/v1/personality/radar`,
    insights: `${API_URL}/api/v1/personality/insights`,
    analyzeWithOllama: `${API_URL}/api/v1/personality/analyze-with-ollama`,
  },

  // Puzzle
  puzzle: {
    questions: `${API_URL}/api/v1/puzzle/questions`,
    analyze: `${API_URL}/api/v1/puzzle/analyze`,
    reassess: `${API_URL}/api/v1/puzzle/reassess`,
  },

  // Language Improvement
  languageImprovement: {
    analyze: `${API_URL}/api/v1/language-improvement/analyze`,
  },

  // Videos
  videos: {
    upload: `${API_URL}/api/v1/videos/upload`,
    list: `${API_URL}/api/v1/videos/list`,
    url: (fileName: string) => `${API_URL}/api/v1/videos/url/${fileName}`,
    delete: (fileName: string) => `${API_URL}/api/v1/videos/delete/${fileName}`,
    download: (fileName: string) => `${API_URL}/api/v1/videos/download/${fileName}`,
  },
};

