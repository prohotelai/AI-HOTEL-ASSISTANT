# Admin Signup Refactor - Quick Start & Testing

## What Changed

The signup flow now creates **both a User (admin) and Hotel entity in a single transaction**. Each admin signup:

1. ✅ Creates User with role `OWNER`
2. ✅ Creates Hotel with auto-generated `hotelId` (format: `H-XXXXX`)
3. ✅ Links them atomically (transaction) so no orphaned records
4. ✅ Requires admin to complete onboarding wizard
5. ✅ No other signup types allowed (staff/guest use QR codes)

## Files Changed

### New Files
- ✅ [lib/services/adminSignupService.ts](lib/services/adminSignupService.ts) - Service layer with transaction logic

### Modified Files
- ✅ [app/api/register/route.ts](app/api/register/route.ts) - API endpoint for signup (now creates hotel)
- ✅ [app/admin/register/page.tsx](app/admin/register/page.tsx) - UI page (added hotel name field)
- ✅ [middleware.ts](middleware.ts) - Added `/api/register` to public routes

### No Changes Needed
- ✅ Authentication system (NextAuth, JWT)
- ✅ Onboarding wizard (uses existing hotel from signup)
- ✅ PMS integration
- ✅ Staff/Guest flows (separate, unchanged)

## Testing Signup

### 1. Manual Browser Test

**Step 1: Open Signup Page**
```
http://localhost:3000/admin/register
```

**Step 2: Fill Form**
- Full name: "John Doe"
- Email: "admin+test@example.com"
- Password: "TestPassword123" (min 8 chars)
- Hotel name: "Test Hotel"

**Step 3: Click "Create account"**

**Expected Result**:
- Form submits successfully (no error)
- Redirects to `/admin/login?registered=true`
- Success message: "Account created successfully"

**Database Check**:
```sql
-- Check user was created
SELECT id, email, role, "hotelId", "onboardingCompleted" 
FROM "User" 
WHERE email = 'admin+test@example.com';

-- Check hotel was created
SELECT id, name, slug, "subscriptionPlan"
FROM "Hotel"
WHERE name = 'Test Hotel';

-- Verify link
-- User.hotelId should match Hotel.id
```

### 2. Test Login Flow

**Step 1: Sign In**
```
Navigate to /admin/login
Enter email: admin+test@example.com
Enter password: TestPassword123
Click "Sign in"
```

**Expected Result**:
- Authenticates successfully
- Redirects to `/admin/onboarding` (because onboardingCompleted = false)

### 3. Test Onboarding Wizard

**Step 1: Complete Onboarding Steps**
- Step 1: Confirm/update hotel details
- Step 2: Configure PMS (skip if not needed)
- Step 3: Invite staff (skip or add)
- Step 4: Test AI (send test message)
- Step 5: Review and complete

**Step 2: Click "Complete Onboarding"**

**Expected Result**:
- User.onboardingCompleted set to true
- Redirects to `/dashboard`

### 4. Test Dashboard Access

**Step 1: Verify Dashboard Works**
```
Navigate to /dashboard
```

**Expected Result**:
- Full dashboard access (no redirect)
- Can access all admin features

## API Testing

### Test Signup Endpoint

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@hotel.com",
    "password": "SecurePassword123",
    "hotelName": "Grand Hotel Resort"
  }'
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Hotel account created successfully",
  "userId": "clxyz123abc",
  "hotelId": "H-AK9M2",
  "email": "jane@hotel.com",
  "onboardingRequired": true
}
```

**Error - Email Already Exists** (400):
```json
{
  "error": "An account with this email already exists"
}
```

**Error - Password Too Short** (400):
```json
{
  "error": "Password must be at least 8 characters"
}
```

**Error - Missing Field** (400):
```json
{
  "error": "Email, password, and hotel name are required"
}
```

## Edge Cases to Test

### 1. Duplicate Email
```bash
# Test 1: Create first account
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin 1", "email": "dup@test.com", "password": "Test123456", "hotelName": "Hotel 1"}'

# Test 2: Try to create with same email
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin 2", "email": "dup@test.com", "password": "Test123456", "hotelName": "Hotel 2"}'

# Expected: 400 error - "already exists"
```

### 2. Password Too Short
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "email": "short@test.com", "password": "Test1", "hotelName": "Hotel"}'

# Expected: 400 error - "must be at least 8 characters"
```

### 3. Invalid Email
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "email": "invalid-email", "password": "Test123456", "hotelName": "Hotel"}'

# Expected: 400 error - "Invalid email format"
```

### 4. Missing Hotel Name
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "email": "test@hotel.com", "password": "Test123456", "hotelName": ""}'

# Expected: 400 error - "required"
```

## Troubleshooting

### Issue: Signup Page Shows Blank
**Cause**: JavaScript not loaded  
**Fix**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: Form Submission Hangs
**Cause**: API endpoint not accessible  
**Fix**: Check middleware allows `/api/register` without auth

### Issue: Password Hashing Fails
**Cause**: Bcrypt module not installed  
**Fix**: Run `npm install` again

### Issue: Hotel Not Created
**Cause**: Transaction failed (e.g., DB connection)  
**Fix**: Check database logs, verify Prisma connection

### Issue: Onboarding Doesn't Show Hotel Details
**Cause**: Hotel created but not linked to user  
**Fix**: Check User.hotelId in database, should match Hotel.id

## Verification Checklist

After making changes, verify:

- [ ] TypeScript compiles: `npm run build` ✓
- [ ] Service file created: `lib/services/adminSignupService.ts` ✓
- [ ] API endpoint updated: `app/api/register/route.ts` ✓
- [ ] UI updated with hotel field: `app/admin/register/page.tsx` ✓
- [ ] Middleware has `/api/register`: `middleware.ts` ✓
- [ ] Build shows no errors ✓
- [ ] Can navigate to `/admin/register` ✓
- [ ] Can submit signup form ✓
- [ ] User + Hotel created in database ✓
- [ ] Login redirects to onboarding ✓
- [ ] Onboarding completes successfully ✓
- [ ] Dashboard accessible after onboarding ✓

## Database State Verification

```sql
-- Check a newly created admin's state
SELECT 
  u.id as user_id,
  u.email,
  u.role,
  u."hotelId",
  u."onboardingCompleted",
  h.id as hotel_id,
  h.name as hotel_name,
  h.slug,
  h."subscriptionPlan"
FROM "User" u
LEFT JOIN "Hotel" h ON u."hotelId" = h.id
WHERE u.email = 'admin+test@example.com';

-- Expected output:
-- One row with:
-- - role = OWNER
-- - hotelId = H-XXXXX
-- - onboardingCompleted = false
-- - hotel_id matches hotelId
-- - subscriptionPlan = STARTER
```

## Monitoring After Deployment

### Success Metrics
- Number of new signups per day
- Signup to onboarding completion rate
- Avg time from signup to dashboard access

### Error Monitoring
- Failed hotel creation (should be ~0%)
- Duplicate email errors
- Password validation failures
- Transaction rollbacks

### Logs to Check
```bash
# Check for signup success
docker logs [container] | grep "Hotel admin signup successful"

# Check for errors
docker logs [container] | grep -i "signup_error\|admin_signup_error"

# Check transaction rollbacks
docker logs [container] | grep -i "rollback\|transaction"
```

## Performance Testing

### Signup Endpoint Load Test
```bash
# Test with 100 concurrent requests (adjust email)
ab -n 100 -c 10 -p data.json -T application/json \
  http://localhost:3000/api/register

# Expected: ~99 should succeed (1 duplicate email)
# Response time: 100-200ms per request
```

### Database Query Performance
```sql
-- Check indexes are used
EXPLAIN ANALYZE
SELECT * FROM "User" WHERE email = 'admin@hotel.com';

-- Expected: Index Scan on idx_user_email
```

---

**Status**: ✅ Ready for Testing  
**Estimated Testing Time**: 15-30 minutes  
**Risk Level**: Low (backward compatible, atomic transactions)
