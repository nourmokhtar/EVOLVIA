# Frontend-Backend API Connection Quick Reference

## Authentication Flow

```
1. User Sign Up
   POST /api/v1/auth/signup
   Body: { email, password, full_name }
   Response: { id, email, full_name, avatar_url }

2. User Login
   POST /api/v1/auth/login
   Body: { email, password }
   Response: { access_token, token_type: "bearer" }

3. Store Token
   localStorage.setItem("authToken", access_token)
   localStorage.setItem("userId", user_id)

4. Use Token in Requests
   Header: Authorization: Bearer <token>
```

## Core API Endpoints

### User Management
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/v1/users/me | ✅ | Get current user |
| GET | /api/v1/users/profile | ✅ | Get user profile |
| GET | /api/v1/users/{userId}/progress | ✅ | Get learning progress |
| POST | /api/v1/users/avatar | ✅ | Upload avatar |

### Learning Content
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/v1/lessons | ✅ | List all lessons |
| GET | /api/v1/lessons/{id} | ✅ | Get lesson details |
| GET | /api/v1/quizzes/{lessonId} | ✅ | Get quiz |
| GET | /api/v1/quizzes/{quizId}/questions | ✅ | Get questions |

### AI Features
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | /api/v1/ai_teacher/chat | ✅ | `{ message }` |
| POST | /api/v1/ai_teacher/feedback | ✅ | `{ performance_data }` |

### Personality Analysis
| Method | Endpoint | Auth | Parameters/Body |
|--------|----------|------|-----------------|
| GET | /api/v1/personality/radar | ✅ | Query: `user_id` |
| GET | /api/v1/personality/insights | ✅ | Query: `user_id` |
| POST | /api/v1/personality/analyze-with-ollama | ✅ | Body: `{ prompt }` |

### Collaboration & Practice
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | /api/v1/collaboration/action | ✅ | `{ scenario_id, action, context? }` |
| GET | /api/v1/collaboration/history | ✅ | - |
| POST | /api/v1/pitch/analyze | ✅ | FormData: `file` |
| GET | /api/v1/pitch/history | ✅ | - |

## Frontend Helper Functions

```typescript
import { apiFetch, getPersonalityRadar, chatWithAI, analyzeWithOllama } from '@/lib/apiClient';

// All functions automatically handle:
// - JSON serialization
// - Bearer token injection
// - Error handling

// Example usage:
const token = localStorage.getItem("authToken");
const userId = localStorage.getItem("userId");

// Get personality data
const radar = await getPersonalityRadar(userId, token);

// Chat with AI
const response = await chatWithAI("Hello AI!", token);

// Analyze text
const analysis = await analyzeWithOllama("My thoughts...", token);
```

## Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Use the response data |
| 400 | Bad request | Check request format |
| 401 | Unauthorized | Login again, refresh token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not found | Resource doesn't exist |
| 500 | Server error | Check backend logs |

## Error Handling Pattern

```typescript
try {
  const data = await apiFetch(url, { token, method: 'GET' });
  // Process data
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      // Redirect to login
    } else if (error.message.includes('403')) {
      // Show permission denied
    } else {
      // Show generic error
    }
  }
}
```

## Development Tips

1. **Always include token** in API calls (except login/signup)
2. **Check localStorage** for `authToken` before making requests
3. **Validate user_id** matches current user for personal data endpoints
4. **Use FormData** only for file uploads (pitch/avatar)
5. **Send JSON** for all other requests
6. **Parse JSON responses** with `.json()` after fetch

## Testing a Connection

```typescript
// Quick test in browser console
const token = localStorage.getItem("authToken");
fetch('http://localhost:8000/api/v1/users/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```
