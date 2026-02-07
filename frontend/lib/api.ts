// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://evolvia-backend.onrender.com';

// Evolvia API Endpoints
export const API = {
  users: {
    me: `${API_URL}/api/v1/users/me`,
    profile: `${API_URL}/api/v1/users/profile`,
  },
  lessons: {
    list: `${API_URL}/api/v1/lessons/`,
    detail: (id: string) => `${API_URL}/api/v1/lessons/${id}`,
  },
  quizzes: {
    detail: (lessonId: string) => `${API_URL}/api/v1/quizzes/${lessonId}`,
    questions: (quizId: string) => `${API_URL}/api/v1/quizzes/${quizId}/questions`,
  },
  ai: {
    chat: `${API_URL}/api/v1/ai_teacher/chat`,
    feedback: `${API_URL}/api/v1/ai_teacher/feedback`,
  },
  pitch: {
    analyze: `${API_URL}/api/v1/pitch/analyze`,
    history: `${API_URL}/api/v1/pitch/history`,
  },
  languageImprovement: {
    analyze: `${API_URL}/api/v1/language-improvement/analyze`,
  },
};
