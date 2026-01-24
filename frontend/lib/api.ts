// API Configuration
export const API_URL =  'http://localhost:8000';
// process.env.NEXT_PUBLIC_API_URL ||
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
  },
  
  // Collaboration
  collaboration: {
    action: `${API_URL}/api/v1/collaboration/action`,
    history: `${API_URL}/api/v1/collaboration/history`,
  },
  
  // Personality
  personality: {
    radar: `${API_URL}/api/v1/personality/radar`,
    insights: `${API_URL}/api/v1/personality/insights`,
    analyzeWithOllama: `${API_URL}/api/v1/personality/analyze-with-ollama`,
  },
};
