# Staff Activation via QR - Quick Reference

## Flow Summary

```
QR Scan → /staff/activate?hotelId=XXX
    ↓
Enter staffId (ST-00001)
    ↓
Validate: exists & PENDING
    ↓
Enter password (min 8 chars)
    ↓
Create User + Link to Staff
    ↓
Staff.status = ACTIVE
    ↓
/staff/chat
```

---

## API Endpoints

### 1. Validate Staff
```bash
POST /api/staff/activate/route?validate=true
Content-Type: application/json

{
  "hotelId": "hotel-123",
  "staffId": "ST-00001"
}

# Response (200)
{
  "success": true,
  "staff": {
    "id": "staff-abc",
    "staffId": "ST-00001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@hotel.com",
    "staffRole": "RECEPTION"
  }
}
```

### 2. Create Account
```bash
POST /api/staff/activate/complete
Content-Type: application/json

{
  "hotelId": "hotel-123",
  "staffId": "ST-00001",
  "password": "SecurePass123"
}

# Response (201)
{
  "success": true,
  "message": "Account activated successfully",
  "user": {
    "id": "user-123",
    "email": "john@hotel.com",
    "name": "John Doe",
    "role": "STAFF"
  }
}
```

---

## Service Functions

### Import
```typescript
import {
  validateStaffForActivation,
  activateStaff,
  getStaffForActivation
} from '@/lib/services/staffActivationService'
```

### Validate
```typescript
const staff = await validateStaffForActivation('hotel-123', 'ST-00001')
// Checks: exists, status=PENDING, hotelId matches
// Throws error if invalid
```

### Activate
```typescript
const user = await activateStaff('hotel-123', 'ST-00001', 'password')
// Creates User, links to Staff, sets status=ACTIVE
// Atomic transaction - all or nothing
```

### Get for Form
```typescript
const staff = await getStaffForActivation('hotel-123', 'ST-00001')
// Returns: { ..., canActivate: boolean }
// Safe for read-only validation
```

---

## Page: /staff/activate

**URL Parameter:** `hotelId` (from QR)

**Form Steps:**
1. Enter staffId → Validate
2. Enter password → Confirm
3. Review info → Create account
4. Success → Redirect to /staff/chat

**Error Handling:**
- Back buttons to correct entries
- Clear error messages
- No account created until final step

---

## Status Changes

| Before | After | Condition |
|--------|-------|-----------|
| PENDING | ACTIVE | Successfully created user |
| ACTIVE | N/A | Cannot re-activate (409 error) |
| INACTIVE | N/A | Cannot activate (409 error) |

---

## Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| hotelId | Required, matches QR | 400 Bad Request |
| staffId | Required, exists, PENDING | 404 Not Found |
| staffId | Not already linked | 409 Conflict |
| password | Min 8 characters | 400 Bad Request |
| password | Matches confirm | Client-side only |

---

## User Account Created With

```typescript
{
  email: staff.email,
  name: `${staff.firstName} ${staff.lastName}`,
  password: hashedPassword,
  role: 'STAFF',
  hotelId: hotelId,
  emailVerified: now()  // No email flow
}
```

---

## Common Errors

| Status | Message | Solution |
|--------|---------|----------|
| 404 | Staff record not found | Check staffId spelling |
| 409 | Already activated | Staff account exists |
| 400 | Password too short | Use 8+ characters |
| 400 | Missing fields | Ensure all fields present |

---

## Security Features

✅ hotelId from URL (not trusting user)  
✅ staffId validated on backend  
✅ Status check (must be PENDING)  
✅ Password hashing (bcryptjs)  
✅ Atomic transaction (no partial states)  
✅ No email verification needed  
✅ Re-activation blocked (409)  
✅ Proper error messages  

---

## Files

| File | Purpose |
|------|---------|
| [lib/services/staffActivationService.ts](lib/services/staffActivationService.ts) | Service functions |
| [app/api/staff/activate/route.ts](app/api/staff/activate/route.ts) | Validation endpoint |
| [app/api/staff/activate/complete/route.ts](app/api/staff/activate/complete/route.ts) | Activation endpoint |
| [app/staff/activate/page.tsx](app/staff/activate/page.tsx) | Activation form |

---

## Example: Complete Flow

```typescript
// 1. Frontend: User enters staffId
const validateRes = await fetch('/api/staff/activate/route?validate=true', {
  method: 'POST',
  body: JSON.stringify({ hotelId, staffId })
})
const { staff } = await validateRes.json()

// 2. Frontend: User enters password
const activateRes = await fetch('/api/staff/activate/complete', {
  method: 'POST',
  body: JSON.stringify({ hotelId, staffId, password })
})
const { user } = await activateRes.json()

// 3. Frontend: Redirect to dashboard
router.push('/staff/chat')

// 4. Backend: Staff record now shows
//    status: ACTIVE
//    userId: user.id (linked)
```

---

## Testing

```bash
# Manual test
1. QR scan → /staff/activate?hotelId=test-hotel
2. Enter: ST-00001
3. Click Validate → Should show staff name
4. Enter password: TestPassword123
5. Confirm: TestPassword123
6. Click Activate → Should see success
7. Redirect to /staff/chat

# Check database
SELECT * FROM Staff WHERE staffId = 'ST-00001'
→ status should be ACTIVE
→ userId should be set
```

---

**Status:** ✅ Complete  
**Build:** ✅ Passing  
**Ready:** Testing → Production
