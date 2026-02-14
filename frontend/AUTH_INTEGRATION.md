# Authentication & User ID Integration Summary

## Overview
Added a complete authentication system to the React frontend that allows users to login and persist their user ID for API calls.

## Changes Made

### 1. **Authentication Context** (`app/context/AuthContext.tsx`)
- Created a React Context for global auth state management
- Stores `userId` and `token` in localStorage
- Provides `useAuth()` hook for components to access auth data
- Methods: `login()`, `logout()`, automatic token refresh from storage

### 2. **Login Page** (`app/login/page.tsx`)
- New dedicated login page with email/password form
- Automatic redirect to dashboard if already authenticated
- Error handling and loading states
- Includes demo credentials for testing

### 3. **API Client Helpers** (`lib/apiClient.ts`)
- Wrapper functions that automatically include auth token in headers
- User ID passed as query parameter or body parameter to relevant endpoints
- Key functions:
  - `getPersonalityRadar()` - Fetch radar data using user ID
  - `analyzeWithOllama()` - Submit journal entry with user ID
  - `getUserProgress()` - Get level/experience updates
  - `chatWithAI()` - AI teacher chat with user context
  - Additional helpers for lessons, quizzes, collaboration, pitch analysis

### 4. **Updated Layout** (`app/layout.tsx`)
- Wrapped entire app with `AuthProvider`
- All child components can now access auth context

### 5. **Protected Route Component** (`app/components/ProtectedRoute.tsx`)
- Wrapper component to protect routes
- Automatically redirects unauthenticated users to login
- Shows loading spinner while auth state loads

### 6. **Settings Page Update** (`app/settings/page.tsx`)
- Added logout functionality to the "Sign Out" button
- Clears user ID and token from state and localStorage
- Redirects to login page after logout

### 7. **Personality Page Update** (`app/personality/page.tsx`)
- Uses `useAuth()` hook to get user ID and token
- Fetches personality radar data with user ID
- Submits journal entries with user ID for personalized analysis
- Uses new `apiClient` helper functions

## How It Works

### Login Flow
1. User navigates to `/login`
2. Enters email and password
3. Credentials sent to backend login endpoint
4. Receives access token
5. Token used to fetch user info and get user ID
6. Both token and user ID stored in localStorage and context
7. Redirected to dashboard

### API Requests
All API requests now include:
- **Authorization header** with Bearer token
- **User ID** as query parameter or in request body
- Automatic error handling for failed requests

### Example API Call
```typescript
// With auth context
const { userId, token } = useAuth();

// Fetch personality radar for the user
const data = await getPersonalityRadar(userId, token);

// Or chat with AI
const response = await chatWithAI("Tell me about collaboration", userId, token);
```

## Protected Routes
To protect a route, wrap its content with `ProtectedRoute`:
```tsx
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      {/* Your dashboard content */}
    </ProtectedRoute>
  );
}
```

## Login Credentials (Demo)
- **Email**: test@example.com
- **Password**: password123

## Testing the Flow
1. Start the backend: `python -m uvicorn app.main:app --reload`
2. Start the frontend: `npm run dev`
3. Navigate to `http://localhost:3000/login`
4. Enter demo credentials
5. You'll be logged in and redirected to dashboard
6. User ID is now available for all API calls
7. Visit Settings → Sign Out to logout

## Security Notes
- Tokens stored in localStorage (consider using httpOnly cookies for production)
- Tokens included in Authorization header for all API requests
- User ID passed in requests for server-side validation
- Protected routes automatically redirect unauthenticated users
