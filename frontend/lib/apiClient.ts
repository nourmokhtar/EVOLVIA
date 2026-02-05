import { API, API_URL } from './api';

export interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Generic fetch wrapper that automatically includes auth token
 */
export async function apiFetch(
  url: string,
  options: FetchOptions = {}
) {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get personality radar data for a user
 */
export async function getPersonalityRadar(userId: string, token: string) {
  return apiFetch(`${API.personality.radar}?user_id=${userId}`, {
    token,
  });
}

/**
 * Get personality insights for a user
 */
export async function getPersonalityInsights(userId: string, token: string) {
  return apiFetch(`${API.personality.insights}?user_id=${userId}`, {
    token,
  });
}

/**
 * Analyze text with Ollama for personality insights
 */
export async function analyzeWithOllama(text: string, token: string) {
  return apiFetch(API.personality.analyzeWithOllama, {
    token,
    method: 'POST',
    body: JSON.stringify({
      prompt: text,
    }),
  });
}

/**
 * Get user profile information
 */
export async function getUserProfile(token: string) {
  return apiFetch(API.users.profile, {
    token,
  });
}

/**
 * Get user level/progress updates
 */
export async function getUserProgress(userId: string, token: string) {
  return apiFetch(`${API_URL}/api/v1/users/${userId}/progress`, {
    token,
  });
}

/**
 * Get lessons list
 */
export async function getLessons(token: string) {
  return apiFetch(API.lessons.list, {
    token,
  });
}

/**
 * Get lesson details
 */
export async function getLesson(lessonId: string, token: string) {
  return apiFetch(API.lessons.detail(lessonId), {
    token,
  });
}

/**
 * Get quiz for a lesson
 */
export async function getQuiz(lessonId: string, token: string) {
  return apiFetch(API.quizzes.detail(lessonId), {
    token,
  });
}

/**
 * Get quiz questions
 */
export async function getQuizQuestions(quizId: string, token: string) {
  return apiFetch(API.quizzes.questions(quizId), {
    token,
  });
}

/**
 * Chat with AI teacher
 */
export async function chatWithAI(message: string, token: string) {
  return apiFetch(API.ai.chat, {
    token,
    method: 'POST',
    body: JSON.stringify({
      message,
    }),
  });
}

/**
 * Get AI feedback
 */
export async function getAIFeedback(performanceData: any, token: string) {
  return apiFetch(API.ai.feedback, {
    token,
    method: 'POST',
    body: JSON.stringify(performanceData),
  });
}

/**
 * Submit collaboration action
 */
export async function submitCollaborationAction(
  scenarioId: string,
  action: string,
  token: string,
  context?: string
) {
  return apiFetch(API.collaboration.action, {
    token,
    method: 'POST',
    body: JSON.stringify({
      scenario_id: scenarioId,
      action,
      context,
    }),
  });
}

/**
 * Get collaboration history
 */
export async function getCollaborationHistory(token: string) {
  return apiFetch(API.collaboration.history, {
    token,
  });
}

/**
 * Analyze pitch
 */
export async function analyzePitch(
  audioData: Blob,
  token: string
) {
  const formData = new FormData();
  formData.append('file', audioData);

  const response = await fetch(API.pitch.analyze, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get pitch history
 */
export async function getPitchHistory(token: string) {
  return apiFetch(API.pitch.history, {
    token,
  });
}
