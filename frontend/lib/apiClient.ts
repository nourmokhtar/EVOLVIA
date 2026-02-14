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

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * Get current user profile
 */
export async function getMeUser(token: string) {
  return apiFetch(API.users.me, {
    token,
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
 * Upload user avatar
 */
export async function uploadAvatar(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(API.users.avatar, {
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

// ============================================
// LESSONS & QUIZZES
// ============================================

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

// ============================================
// PERSONALITY ENDPOINTS
// ============================================

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

// ============================================
// PUZZLE ENDPOINTS
// ============================================

/**
 * Get puzzle questions
 */
export async function getPuzzleQuestions() {
  return apiFetch(API.puzzle.questions);
}

/**
 * Analyze personality responses and generate puzzle
 */
export async function analyzePersonalityPuzzle(responses: Record<string, string>, token?: string) {
  return apiFetch(API.puzzle.analyze, {
    method: 'POST',
    body: JSON.stringify(responses),
    token,
  });
}

/**
 * Reassess a personality dimension
 */
export async function reassessDimension(data: {
  dimension: string;
  entries: string[];
  current_score: number;
}, token: string) {
  return apiFetch(API.puzzle.reassess, {
    token,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// AI TEACHER ENDPOINTS
// ============================================

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

// ============================================
// PITCH ENDPOINTS
// ============================================

/**
 * Analyze pitch with video/audio
 */
export async function analyzePitch(
  videoFrames: string[] | null,
  audioBase64: string | null,
  transcript: string,
  token: string
) {
  return apiFetch(API.pitch.analyze, {
    token,
    method: 'POST',
    body: JSON.stringify({
      video_frames: videoFrames,
      audio_base64: audioBase64,
      transcript: transcript,
    }),
  });
}

/**
 * Analyze pitch deck
 */
export async function analyzePitchDeck(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(API.pitch.deckAnalyze, {
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
 * Extract slides from pitch deck
 */
export async function extractDeckSlides(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(API.pitch.deckExtract, {
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

// ============================================
// COLLABORATION ENDPOINTS
// ============================================

/**
 * Start a collaboration session
 */
export async function startCollaborationSession(
  scenarioId: string,
  token: string
) {
  return apiFetch(API.collaboration.start, {
    token,
    method: 'POST',
    body: JSON.stringify({
      scenario_id: scenarioId,
    }),
  });
}

/**
 * Send a turn in collaboration simulation
 */
export async function submitCollaborationTurn(
  sessionId: string,
  userMessage: string,
  token: string
) {
  return apiFetch(API.collaboration.turn, {
    token,
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      user_message: userMessage,
    }),
  });
}

// ============================================
// LANGUAGE IMPROVEMENT ENDPOINTS
// ============================================

/**
 * Analyze language/speech for pronunciation and fluency
 */
export async function analyzeLanguageImprovement(
  audioFile: File,
  language: string,
  userLevel: string,
  goal: string,
  token: string
) {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('language', language);
  formData.append('user_level', userLevel);
  formData.append('goal', goal);

  const response = await fetch(API.languageImprovement.analyze, {
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

// ============================================
// VIDEO ENDPOINTS
// ============================================

/**
 * Upload a video
 */
export async function uploadVideo(
  file: File,
  lessonId?: string,
  token?: string
) {
  const formData = new FormData();
  formData.append('file', file);
  if (lessonId) {
    formData.append('lesson_id', lessonId);
  }

  const response = await fetch(API.videos.upload, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get list of user's videos
 */
export async function listVideos(token: string) {
  return apiFetch(API.videos.list, {
    token,
  });
}

/**
 * Get signed URL for a video
 */
export async function getVideoUrl(fileName: string, token: string) {
  return apiFetch(API.videos.url(fileName), {
    token,
  });
}

/**
 * Delete a video
 */
export async function deleteVideo(fileName: string, token: string) {
  return apiFetch(API.videos.delete(fileName), {
    token,
    method: 'DELETE',
  });
}

/**
 * Download a video
 */
export async function downloadVideo(fileName: string, token: string) {
  const response = await fetch(API.videos.download(fileName), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.blob();
}
