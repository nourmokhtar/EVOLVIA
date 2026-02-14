# Password Security & Handling

## Overview

The application uses bcrypt for password hashing, which has a **72-byte maximum length limit**. We've implemented automatic truncation and validation to handle this constraint gracefully.

## How It Works

### Password Validation
When a user creates an account or logs in, their password is validated and truncated:

1. **Minimum Length**: 8 characters required
2. **Maximum Length**: 72 bytes (automatically truncated if longer)
3. **Character Encoding**: UTF-8 encoded bytes are counted

### Password Hashing
The `get_password_hash()` function:
1. Truncates the password to 72 bytes
2. Hashes it using bcrypt
3. Returns the hash for storage in the database

### Password Verification
The `verify_password()` function:
1. Truncates the provided password to 72 bytes
2. Compares with the stored hash
3. Returns True if passwords match

## Why Bcrypt?

Bcrypt is used because it:
- ✅ Is slow and deliberate (designed to resist brute-force attacks)
- ✅ Automatically generates and stores salt
- ✅ Is industry standard for password hashing
- ✅ Is built into the passlib library

The 72-byte limit is a known constraint of bcrypt. This means:
- Most real-world passwords are well under 72 bytes
- Average English password (15 chars) = 15 bytes
- Unicode passwords are counted by bytes (some chars = multiple bytes)

## Examples

### Password Length Scenarios

```
Password: "mypassword123"
Bytes: 13 (11 chars)
Status: ✅ Valid (< 72 bytes)

Password: "café123αβγδεζηθικλμνξοπρστυφχψω"
Bytes: ~50 (mix of ASCII and Unicode)
Status: ✅ Valid (< 72 bytes)

Password: "aaaaaaaaaa...aaaaaaaaaa" (100 characters)
Bytes: 100
Status: ⚠️ Truncated to 72 bytes automatically
Stored: "aaaaaaaaa...aaaaaa" (72 bytes)
```

### Code Example

```python
from app.core.security import get_password_hash, verify_password

# Hashing
password = "my_secret_password"
hashed = get_password_hash(password)  # Truncates to 72 bytes if needed
# Returns: $2b$12$... (bcrypt hash)

# Verification
is_valid = verify_password(password, hashed)  # Returns: True
is_valid = verify_password("wrong_password", hashed)  # Returns: False
```

## API Usage

### Signup Example

```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "mySecurePassword123",
    "full_name": "John Doe"
  }'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

### Login Example

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/form-data" \
  -d "username=user@example.com&password=mySecurePassword123"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

## Password Best Practices

For your users, recommend:

1. **Length**: 12+ characters for better security
2. **Complexity**: Mix of uppercase, lowercase, numbers, symbols
3. **Uniqueness**: Don't reuse passwords across services
4. **Special Characters**: Yes, they're safe to use (including emoji!)

Examples of good passwords:
- ✅ `MyP@ssw0rd!Secure`
- ✅ `Coffee$2024#Morning`
- ✅ `BlueSky#November99`
- ✅ Even long passphrases work: `correct-horse-battery-staple`

## Error Handling

### Password Too Short

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "password"],
      "msg": "Password must be at least 8 characters long"
    }
  ]
}
```

### Password Too Long

If password is longer than 72 bytes:
- ✅ Automatically truncated to 72 bytes
- ✅ User is not notified (transparent)
- ✅ Same login will work (uses same truncated version)

### Invalid Email

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "invalid email format"
    }
  ]
}
```

## Security Considerations

### What We Do
- ✅ Hash passwords with bcrypt (slow, salted)
- ✅ Never store plain passwords
- ✅ Use HTTPS in production
- ✅ Implement rate limiting on login (recommended)
- ✅ Use strong SECRET_KEY for JWT tokens
- ✅ Set JWT expiration times appropriately

### What You Should Do
- 🔒 Use HTTPS in production (not HTTP)
- 🔒 Store SECRET_KEY in environment variables (never in code)
- 🔒 Add rate limiting to `/auth/login` endpoint
- 🔒 Implement password reset functionality
- 🔒 Consider 2FA for high-security accounts
- 🔒 Regularly update dependencies

## Configuration

### Password Requirements
Edit `app/schemas/user.py` to change requirements:

```python
@field_validator('password')
@classmethod
def validate_password(cls, v: str) -> str:
    # Current: minimum 8 characters
    if len(v) < 8:
        raise ValueError('Password must be at least 8 characters long')
    return v
```

### Bcrypt Cost Factor
Edit `app/core/security.py` to change bcrypt rounds:

```python
# Default: 12 rounds (good balance of security/speed)
# Higher = more secure but slower
# Lower = faster but less secure
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

## Troubleshooting

### "Password cannot be longer than 72 bytes"

This should no longer happen because:
- ✅ Passwords are automatically truncated in `get_password_hash()`
- ✅ Passwords are automatically truncated in `verify_password()`

If you still see this error:
1. Ensure you're using the latest `security.py`
2. Restart the application
3. Try logging in again

### "Password must be at least 8 characters"

User's password is too short. Request a longer password (minimum 8 characters).

### "invalid email format"

The email address provided is not in valid email format.
Try: `user@example.com`

## Further Reading

- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Bcrypt Documentation](https://en.wikipedia.org/wiki/Bcrypt)
- [Passlib Documentation](https://passlib.readthedocs.io/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
