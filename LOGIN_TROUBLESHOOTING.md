# Login 401 Error - Troubleshooting Guide

## Common Causes

### 1. User Doesn't Exist in Database
**Symptom**: 401 Unauthorized on login
**Solution**: Sign up first before logging in

**Steps**:
```
1. POST http://localhost:8000/api/v1/auth/signup
   Body: {
     "email": "test@example.com",
     "password": "testpass123",
     "full_name": "Test User"
   }

2. Then login with same credentials
   POST http://localhost:8000/api/v1/auth/login
   Body: {
     "email": "test@example.com",
     "password": "testpass123"
   }
```

### 2. Check Existing Users
**Debug Endpoint**:
```
GET http://localhost:8000/api/v1/auth/debug/users
```

This will show all users in the database.

### 3. Wrong Password
**Symptom**: 401 Unauthorized
**Solution**: Verify you're using the exact password from signup

### 4. Frontend Error Details
Check browser console (F12) for error messages from the frontend:
- Look for "Login error response:" logs
- The error message will tell you what went wrong

## Testing Checklist

- [ ] Database is running (check if `virtual_closet.db` exists in backend folder)
- [ ] Backend server is running on `http://localhost:8000`
- [ ] User exists in database (use debug endpoint)
- [ ] Email and password match exactly
- [ ] JSON format is correct in request body
- [ ] Content-Type header is `application/json`

## Quick Test with curl

```bash
# Sign up
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","full_name":"Test User"}'

# Check users
curl http://localhost:8000/api/v1/auth/debug/users

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## If Still Getting 401

1. **Check backend logs** - The server console will show:
   - "Login attempt for email: test@example.com"
   - "User not found for email: test@example.com" OR
   - "Invalid password for email: test@example.com"

2. **Verify database exists** - In backend folder, look for `virtual_closet.db`
   - If missing, run: `python init_db.py`

3. **Check network** - Make sure frontend can reach backend:
   - Open http://localhost:8000 in browser
   - You should see: `{"message":"Welcome to Evolvia API"}`

4. **Clear browser cache** - Sometimes old requests are cached:
   - F12 → Application → Clear Storage
   - Refresh and try again
