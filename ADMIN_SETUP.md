# Admin Setup Guide

## First-Time Setup

When you first access `/admin`, you'll see the **Admin Setup** screen if no admin account exists.

### Setup Process

1. **Navigate to** `/admin`
2. **Fill in the setup form:**
   - First Name
   - Last Name
   - Username
   - Email
   - Password (must meet requirements)
   - Confirm Password

### Password Requirements

Your password must include:
- ✓ At least 8 characters
- ✓ One uppercase letter
- ✓ One number

### After Setup

Once you create your admin account:
- You'll be automatically logged in
- Your credentials are stored securely in `data/admin.json`
- Use your email and password to log in on subsequent visits
- Check "Remember me" to stay logged in across sessions

## Security Notes

- The `data/admin.json` file is gitignored for security
- Passwords are hashed using SHA-256
- Admin tokens are generated using cryptographically secure random bytes
- Never commit `data/admin.json` to version control

## Resetting Admin Access

If you need to reset the admin account:
1. Delete `data/admin.json`
2. Refresh `/admin`
3. Complete the setup process again

## Login Features

- **Email + Password authentication**
- **Remember me** - Persists login using localStorage
- **Forgot password** - Contact administrator message
- **Session management** - Auto-login if token is valid
