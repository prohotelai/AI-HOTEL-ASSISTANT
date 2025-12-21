/**
 * Post-Signup Redirect Fix - Testing Guide
 * 
 * This document outlines the testing procedure for the fixed onboarding flow.
 */

# Fixed Flow Overview

## 1. Sign Up (New User)
- Navigate to `/register`
- Fill in: Name, Email, Password (hotel name NO LONGER required)
- Submit → User created with:
  - role: "OWNER"
  - hotelId: null
  - onboardingCompleted: false

## 2. Redirect to Owner Login
- After registration → redirected to `/owner-login?registered=true`
- Success message displayed
- User can now sign in with credentials

## 3. Post-Login Redirect
- After successful login, middleware checks:
  - Is user OWNER? YES
  - Does user have hotelId? NO
  - Is onboardingCompleted? NO
  - → **REDIRECT TO /onboarding**

## 4. Onboarding Wizard
- User sees welcome screen
- Clicks "Get Started"
- Enters hotel name
- Hotel is created and linked to user
- onboardingCompleted set to true
- → **REDIRECT TO /dashboard**

## 5. Subsequent Logins
- User logs in at `/owner-login`
- Middleware checks:
  - Is user OWNER? YES
  - Does user have hotelId? YES
  - Is onboardingCompleted? YES
  - → **ALLOW ACCESS TO /dashboard**

---

# Key Changes Made

## Database Schema
- Added `onboardingCompleted` field to User model (default: false)

## Registration Flow
- Removed hotel creation from registration
- User created with role="OWNER", hotelId=null
- Redirect to `/owner-login` instead of `/login`

## Login Pages
- `/login` - For guest/staff QR-based access
- `/owner-login` - For hotel owners (credentials-based)

## Middleware
- Enforces onboarding for OWNER without hotelId
- Redirects incomplete owners to `/onboarding`
- Prevents access to dashboard before onboarding completion

## Onboarding Page
- New `/onboarding` page created
- Creates hotel on behalf of user
- Links hotel to user
- Sets onboardingCompleted = true
- Redirects to dashboard

## API Endpoints
- `/api/onboarding/create-hotel` - Creates hotel and links to user
- `/api/onboarding/complete` - Marks onboarding as complete

---

# Manual Testing Steps

## Test Case 1: New User Registration
1. Navigate to http://localhost:3000/register
2. Fill in name, email, password
3. Click "Create account"
4. **Expected:** Redirected to `/owner-login?registered=true`
5. **Verify:** Success message shown

## Test Case 2: First Login & Onboarding
1. Enter registered email and password
2. Click "Sign in"
3. **Expected:** Redirected to `/onboarding`
4. **Verify:** Welcome screen displayed
5. Click "Get Started"
6. **Verify:** Hotel setup form shown
7. Enter hotel name (e.g., "Test Hotel")
8. Click "Create Hotel"
9. **Expected:** Success screen, then redirect to `/dashboard`
10. **Verify:** Dashboard loads successfully

## Test Case 3: Subsequent Login
1. Log out
2. Navigate to `/owner-login`
3. Enter credentials
4. Click "Sign in"
5. **Expected:** Directly redirected to `/dashboard` (no onboarding)
6. **Verify:** Dashboard loads without interruption

## Test Case 4: Direct Access Protection
1. Log out
2. Try to access `/dashboard` directly
3. **Expected:** Redirected to `/owner-login`
4. After login (with incomplete onboarding):
5. **Expected:** Redirected to `/onboarding` first

## Test Case 5: Login Page Separation
1. Navigate to `/login` (guest/staff login)
2. **Verify:** Shows "Guest/Staff Login" with QR scanner
3. **Verify:** Link to "Hotel Owner? Login here →" present
4. Navigate to `/owner-login`
5. **Verify:** Shows "Hotel Owner Login" with email/password
6. **Verify:** Link to "Guest or Staff? Login here →" present

---

# Database Migration

Run the migration to update existing users:

```bash
npx ts-node scripts/migrate-onboarding-field.ts
```

This will:
- Set `onboardingCompleted = true` for users with hotels
- Convert role 'admin' → 'OWNER' for hotel owners
- Leave new users as is (they'll complete onboarding)

---

# Rollback Plan (if needed)

If issues occur:

1. Revert Prisma schema:
   - Remove `onboardingCompleted` field
   - Run `npx prisma db push`

2. Revert registration to create hotel immediately

3. Revert auth.ts pages config to `/login`

4. Remove `/owner-login` and `/onboarding` pages

---

# Success Criteria

✅ New users register without specifying hotel name
✅ After registration, users are redirected to owner login
✅ After first login, owners without hotel are redirected to onboarding
✅ Onboarding creates hotel and completes setup
✅ Subsequent logins go directly to dashboard
✅ Guest/staff login remains separate at `/login`
✅ Middleware enforces onboarding completion
✅ No regressions in existing PMS functionality
