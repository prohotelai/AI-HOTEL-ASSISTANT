# 🎉 Module 9: Staff CRM — Activation Guide

## ✅ Implementation Complete

All core infrastructure for the Staff CRM module is ready:

### What's Built

#### Database (10 Models)
- ✅ `Department` - Organizational units
- ✅ `StaffProfile` - Employee profiles with full details
- ✅ `StaffInvitation` - Email invites with magic links
- ✅ `HRNote` - Confidential staff notes
- ✅ `PerformanceMetric` - KPI tracking
- ✅ `StaffActivity` - Audit timeline
- ✅ `StaffDocument` - File attachments
- ✅ `StaffMessage` - Internal messaging
- ✅ `CalendarEvent` - Shifts and meetings
- ✅ `PerformanceReview` - Formal evaluations

#### Services (2 Complete Layers)
- ✅ `staffService.ts` - Full CRUD + features (20+ functions)
- ✅ `invitationService.ts` - Magic link system (10+ functions)

#### API Endpoints (7 Routes)
- ✅ `GET/POST /api/staff`
- ✅ `GET/PATCH/DELETE /api/staff/:id`
- ✅ `GET/POST /api/staff/invitations`
- ✅ `POST /api/staff/invitations/:id/resend`
- ✅ `POST /api/staff/invitations/:id/cancel`
- ✅ `GET/POST /api/staff/invitations/accept`
- ✅ `GET/POST /api/departments`

#### Security & Permissions
- ✅ 9 RBAC permissions
- ✅ Magic link with crypto (64-char tokens)
- ✅ 24-hour expiration
- ✅ Multi-tenancy enforcement
- ✅ Activity logging

#### Email System
- ✅ Beautiful HTML template
- ✅ Plain text fallback
- ✅ Mobile-responsive
- ✅ Gradient design

#### Tests
- ✅ 25+ test cases for staffService
- ✅ 15+ test cases for invitation flow
- ✅ Comprehensive coverage

---

## 🚀 Activation Steps

### Step 1: Run Migration (Required)

```bash
cd /workspaces/AI-HOTEL-ASSISTANT

# Create database tables
npx prisma migrate dev --name add-staff-crm

# Generate Prisma Client
npx prisma generate
```

**This creates all 10 tables and updates TypeScript types.**

---

### Step 2: Test the System

#### Option A: Quick Test (Recommended)

```bash
# Start dev server
npm run dev

# In another terminal, test invitation endpoint
curl -X POST http://localhost:3000/api/staff/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "email": "test@hotel.com",
    "firstName": "Test",
    "lastName": "Employee",
    "position": "Receptionist",
    "role": "staff"
  }'

# You'll get back a magicLink - copy it and test in browser
```

#### Option B: Create Sample Data

```typescript
// In prisma/seed.ts or run in Prisma Studio

// 1. Create departments
await prisma.department.createMany({
  data: [
    { 
      hotelId: 'YOUR_HOTEL_ID',
      name: 'Reception',
      description: 'Front desk operations',
      color: '#3B82F6'
    },
    {
      hotelId: 'YOUR_HOTEL_ID',
      name: 'Housekeeping',
      description: 'Cleaning services',
      color: '#10B981'
    },
    {
      hotelId: 'YOUR_HOTEL_ID',
      name: 'Management',
      description: 'Administrative staff',
      color: '#8B5CF6'
    }
  ]
})

// 2. Send test invitation (use API endpoint above)

// 3. Complete invitation acceptance flow
```

---

### Step 3: Set Environment Variables (Optional)

For email sending:

```env
# .env.local

# SendGrid (recommended)
EMAIL_FROM=noreply@yourhotel.com
SENDGRID_API_KEY=SG.your-api-key

# OR AWS SES
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# OR Custom SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
```

---

## 📋 Verification Checklist

After running migration, verify:

### Database
- [ ] Run `npx prisma studio` and check for new tables:
  - `Department`
  - `StaffProfile`
  - `StaffInvitation`
  - `HRNote`
  - `PerformanceMetric`
  - `StaffActivity`
  - `StaffDocument`
  - `StaffMessage`
  - `CalendarEvent`
  - `PerformanceReview`

### API Endpoints
```bash
# Test staff list (requires authentication)
curl http://localhost:3000/api/staff \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Test departments
curl http://localhost:3000/api/departments \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### TypeScript
```bash
# Should have no errors
npm run build
```

---

## 🎯 Complete Feature Flow Test

### Test Scenario: Invite & Onboard New Staff

1. **Manager Sends Invitation**
   ```bash
   POST /api/staff/invitations
   {
     "email": "sarah@hotel.com",
     "firstName": "Sarah",
     "lastName": "Johnson",
     "departmentId": "dept_reception",
     "position": "Front Desk Agent",
     "role": "staff"
   }
   ```
   ✅ Response includes `magicLink`
   ✅ Email sent (check logs)
   ✅ Invitation saved with status `PENDING`

2. **Staff Validates Token**
   ```bash
   GET /api/staff/invitations/accept?token=abc123...
   ```
   ✅ Returns invitation details
   ✅ Shows firstName, lastName, position
   ✅ Confirms not expired

3. **Staff Completes Registration**
   ```bash
   POST /api/staff/invitations/accept
   {
     "token": "abc123...",
     "password": "SecurePassword123!",
     "phoneNumber": "+1234567890",
     "dateOfBirth": "1995-08-20T00:00:00Z"
   }
   ```
   ✅ User created with hashed password
   ✅ StaffProfile created
   ✅ Invitation marked as `ACCEPTED`
   ✅ Activity logged: `PROFILE_CREATED`

4. **Manager Views New Staff**
   ```bash
   GET /api/staff?departmentId=dept_reception
   ```
   ✅ Sarah appears in list
   ✅ Status: `ACTIVE`
   ✅ Department: `Reception`

5. **Manager Updates Profile**
   ```bash
   PATCH /api/staff/{sarah_id}
   {
     "hourlyRate": 18.50,
     "skills": ["customer-service", "check-in", "phone"]
   }
   ```
   ✅ Profile updated
   ✅ Activity logged: `PROFILE_UPDATED`

---

## 🧪 Run Tests

```bash
# Run all staff tests
npm test tests/staff/

# Run specific test file
npm test tests/staff/staffService.test.ts
npm test tests/staff/invitationFlow.test.ts

# With coverage
npm test -- --coverage tests/staff/
```

Expected results:
- ✅ 25+ tests for staffService
- ✅ 15+ tests for invitation flow
- ✅ All tests passing

---

## 📊 Check Database After Test

```sql
-- View created invitations
SELECT * FROM "StaffInvitation" 
ORDER BY "sentAt" DESC LIMIT 5;

-- View staff profiles
SELECT sp.*, u.email, d.name as department
FROM "StaffProfile" sp
JOIN "User" u ON sp."userId" = u.id
LEFT JOIN "Department" d ON sp."departmentId" = d.id
LIMIT 10;

-- View recent activities
SELECT * FROM "StaffActivity" 
ORDER BY "createdAt" DESC LIMIT 10;
```

---

## 🐛 Common Issues & Solutions

### Issue: Migration Fails

**Error:** `Foreign key constraint failed`

**Solution:**
```bash
# Reset database and re-run
npx prisma migrate reset
npx prisma migrate dev --name add-staff-crm
npx prisma generate
```

---

### Issue: TypeScript Errors

**Error:** `Property 'staffProfile' does not exist on type 'User'`

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### Issue: "Forbidden" on API Calls

**Cause:** Insufficient permissions or no session

**Solution:**
1. Check user role: Must be `owner` or `manager` for mutations
2. Verify session cookie is included
3. Check RBAC permissions in `lib/rbac.ts`

```typescript
// Debug in API route
const session = await getServerSession(authOptions)
console.log('Session:', session)
console.log('Role:', session.user.role)
```

---

### Issue: Magic Link Not Working

**Cause:** Token expired or invalid

**Check Database:**
```sql
SELECT * FROM "StaffInvitation" 
WHERE token = 'your-token-here';
```

**Resend Invitation:**
```bash
POST /api/staff/invitations/{id}/resend
```

---

## 📈 Performance Optimization

### Index Verification
```sql
-- Check indexes are created
SELECT * FROM pg_indexes 
WHERE tablename IN (
  'StaffProfile', 
  'StaffInvitation',
  'StaffActivity'
);
```

### Query Optimization
```typescript
// Use select to fetch only needed fields
const staff = await prisma.staffProfile.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    position: true,
    employmentStatus: true,
    department: {
      select: { name: true, color: true }
    }
  }
})

// Use pagination
const { profiles } = await listStaffProfiles({
  hotelId,
  limit: 20,
  offset: page * 20
})
```

---

## 🎨 Next Steps: UI Implementation

### Priority 1: Admin Pages
```
apps/dashboard/app/(admin)/staff/
├── page.tsx              # Staff list with filters ⏳
├── [id]/
│   └── page.tsx          # Staff profile detail ⏳
```

### Priority 2: Components
```
components/staff/
├── StaffProfileCard.tsx   # Profile summary ⏳
├── ActivityTimeline.tsx   # Activity feed ⏳
├── InviteStaffModal.tsx   # Invitation form ⏳
```

### Priority 3: Additional APIs
```
/api/staff/[id]/
├── notes         # POST/GET HR notes ⏳
├── kpis          # POST/GET performance metrics ⏳
├── activity      # GET activity feed ⏳
├── documents     # POST/GET/DELETE documents ⏳
```

---

## 📚 Documentation Files

- **Complete Guide:** `docs/module-09-staff-crm.md`
- **Quick Start:** `docs/module-09-quick-start.md`
- **This File:** `docs/module-09-activation.md`

---

## ✨ Module Status

**Core Backend: ✅ 100% Complete**

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Complete (10 models, 4 enums) |
| Service Layer | ✅ Complete (30+ functions) |
| API Endpoints | ✅ Complete (7 routes) |
| RBAC Permissions | ✅ Complete (9 permissions) |
| Email Template | ✅ Complete (HTML + text) |
| Tests | ✅ Complete (40+ tests) |
| Documentation | ✅ Complete (3 files) |
| **Admin UI** | ⏳ Next Phase |
| **Staff Portal** | ⏳ Next Phase |
| **Additional APIs** | ⏳ Next Phase |

---

**Ready to activate! Run the migration and start testing.** 🚀

```bash
npx prisma migrate dev --name add-staff-crm && npx prisma generate
```
