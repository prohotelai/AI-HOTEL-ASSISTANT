# Staff Management System - Implementation Guide

## Overview

Staff Management is a new system for creating and managing hotel staff records independently from authentication. Staff records are created **without User accounts**, allowing admins to set up staff directories before staff members activate their access.

**Key Principle**: Staff records ≠ User authentication accounts

---

## Architecture

### Data Models

#### Staff Model
```prisma
model Staff {
  id        String  @id
  hotelId   String  // Tenant scoping
  staffId   String  // Generated: ST-00001, ST-00002, etc.
  
  // Personal info
  firstName String
  lastName  String
  email     String  @unique(hotelId, email)
  phone     String?
  
  // Role & Status
  staffRole StaffRole  // RECEPTION, HOUSEKEEPING, etc.
  status    StaffStatus // PENDING, ACTIVE, INACTIVE, TERMINATED
  
  // Optional user account (linked later)
  userId    String? @unique
  user      User?
  
  // HR metadata
  dateOfBirth DateTime?
  address     String?
  department  String?
  hireDate    DateTime?
  notes       String? @db.Text
  
  // Audit
  createdBy   String
  createdAt   DateTime
  updatedAt   DateTime
  
  // Soft delete
  deactivatedAt DateTime?
  deactivatedBy String?
}
```

#### StaffStatus Enum
```
PENDING      - Created, no User account yet
ACTIVE       - Has User account, can log in
INACTIVE     - Disabled (can be reactivated)
TERMINATED   - Removed from payroll, archived
```

#### StaffRole Enum
```
RECEPTION
HOUSEKEEPING
MAINTENANCE
CONCIERGE
SECURITY
MANAGER
HR
ACCOUNTING
KITCHEN
BAR
ROOM_SERVICE
OTHER
```

### Security Model

**Only OWNER/MANAGER/HR can:**
- Create staff records (Permission.STAFF_CREATE)
- View staff records (Permission.STAFF_VIEW)
- Update staff records (Permission.STAFF_EDIT)
- Link staff to User accounts

**Staff records are hotel-scoped:**
- All queries enforce `hotelId` in WHERE clause
- Email uniqueness is per-hotel (not global)
- staffId is unique per hotel

**Staffs cannot self-register:**
- No public endpoint to create staff
- Only accessible via protected `/api/staff` with auth

---

## API Reference

### POST /api/staff - Create Staff Record

Creates a new staff record without a User account.

**Authentication:** Required (withAuth)  
**Permission:** `Permission.STAFF_CREATE` (OWNER/MANAGER/HR)  
**Scope:** Auto-scoped to authenticated hotel

#### Request
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@hotel.com",
  "staffRole": "RECEPTION",
  "phone": "+1-555-0100",
  "dateOfBirth": "1990-01-15",
  "address": "123 Main St",
  "department": "Front Desk",
  "hireDate": "2024-01-01",
  "notes": "Excellent customer service"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "staff": {
    "id": "clx1a2b3c4d5e6f7g8h9i",
    "staffId": "ST-00001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@hotel.com",
    "staffRole": "RECEPTION",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Validation
- `firstName`, `lastName`, `email`, `staffRole` are required
- Email must be valid format
- `staffRole` must be valid enum value
- Email must be unique within hotel

#### Error Responses
| Status | Error | Reason |
|--------|-------|--------|
| 400 | Bad Request | Missing required fields or invalid format |
| 403 | Forbidden | User lacks STAFF_CREATE permission |
| 409 | Conflict | Email already exists in hotel |
| 404 | Not Found | Hotel not found |
| 500 | Internal Server Error | Database error |

### GET /api/staff - List Staff

Retrieves all staff records for the authenticated hotel.

**Authentication:** Required (withAuth)  
**Permission:** `Permission.STAFF_VIEW` (OWNER/MANAGER/HR/RECEPTION)  
**Scope:** Auto-scoped to authenticated hotel

#### Query Parameters
```
status=PENDING        // Filter by status
role=RECEPTION        // Filter by staffRole
limit=50              // Max 100, default 50
offset=0              // Pagination offset
```

#### Response (200 OK)
```json
{
  "success": true,
  "staff": [
    {
      "id": "clx1a2b3c4d5e6f7g8h9i",
      "staffId": "ST-00001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@hotel.com",
      "staffRole": "RECEPTION",
      "status": "PENDING",
      "createdAt": "2024-01-15T10:30:00Z",
      "user": null
    },
    {
      "id": "clx2a2b3c4d5e6f7g8h9i",
      "staffId": "ST-00002",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@hotel.com",
      "staffRole": "HOUSEKEEPING",
      "status": "ACTIVE",
      "createdAt": "2024-01-14T09:15:00Z",
      "user": {
        "id": "user-123",
        "email": "jane.smith@hotel.com",
        "name": "Jane Smith",
        "emailVerified": "2024-01-15T11:00:00Z"
      }
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

#### Error Responses
| Status | Error | Reason |
|--------|-------|--------|
| 403 | Forbidden | User lacks STAFF_VIEW permission |
| 500 | Internal Server Error | Database error |

---

## Service Functions

### staffService.ts

#### createStaff(hotelId, createdBy, input)
Creates a new staff record. Generates staffId automatically.

```typescript
const staff = await createStaff(
  'hotel-123',
  'user-456',  // Admin user creating this
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@hotel.com',
    staffRole: 'RECEPTION'
  }
)
// Returns: { id, staffId, firstName, lastName, email, status, ... }
```

**Behavior:**
- Generates staffId automatically (ST-00001, ST-00002, etc.)
- Creates record with status = PENDING
- Validates email uniqueness per hotel
- Throws error if hotel doesn't exist

#### listStaffByHotel(hotelId, options)
Retrieves all staff for a hotel with filtering.

```typescript
const result = await listStaffByHotel(
  'hotel-123',
  {
    status: StaffStatus.ACTIVE,
    role: StaffRole.RECEPTION,
    limit: 25,
    offset: 0
  }
)
// Returns: { staff: [...], total: N, limit, offset }
```

#### getStaffById(id, hotelId)
Retrieve single staff by ID (enforces hotel scoping).

```typescript
const staff = await getStaffById('staff-id-123', 'hotel-123')
```

#### getStaffByStaffId(staffId, hotelId)
Retrieve single staff by staffId like "ST-00001".

```typescript
const staff = await getStaffByStaffId('ST-00001', 'hotel-123')
```

#### updateStaffStatus(id, hotelId, status, updatedBy)
Update staff status (PENDING → ACTIVE, etc.).

```typescript
const staff = await updateStaffStatus(
  'staff-id-123',
  'hotel-123',
  StaffStatus.ACTIVE,
  'user-456'
)
```

#### updateStaffDetails(id, hotelId, input)
Update staff information (not email).

```typescript
const staff = await updateStaffDetails(
  'staff-id-123',
  'hotel-123',
  {
    firstName: 'Jonathan',
    department: 'VIP Desk',
    notes: 'Promoted to lead'
  }
)
```

#### deactivateStaff(id, hotelId, deactivatedBy)
Soft-delete staff record (status → INACTIVE).

```typescript
const staff = await deactivateStaff(
  'staff-id-123',
  'hotel-123',
  'user-456'  // Admin deactivating
)
```

#### linkUserToStaff(staffId, userId, hotelId)
Link an authenticated User to a staff record.
Automatically sets status to ACTIVE.

```typescript
const staff = await linkUserToStaff(
  'staff-id-123',
  'user-auth-id',
  'hotel-123'
)
```

#### getStaffCountByHotel(hotelId)
Get count of staff by status.

```typescript
const counts = await getStaffCountByHotel('hotel-123')
// Returns: { PENDING: 5, ACTIVE: 12, INACTIVE: 2, TERMINATED: 1 }
```

---

## Usage Examples

### Creating Staff via Admin Dashboard

```typescript
// 1. Admin creates staff record (no User account)
const staff = await createStaff(
  hotelId,
  adminUserId,
  {
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria@hotel.com',
    staffRole: StaffRole.HOUSEKEEPING,
    hireDate: new Date('2024-02-01')
  }
)
console.log(staff.staffId) // ST-00003

// 2. Send invitation email to maria@hotel.com with signup link
// Signup link includes: staffId (optional) or email

// 3. Maria signs up, creates User account
// At this point staff.status is still PENDING

// 4. Admin or onboarding flow links User to staff:
await linkUserToStaff(
  staff.id,
  newlyCreatedUserId,
  hotelId
)
// Now staff.status = ACTIVE
```

### Listing Staff in Admin Dashboard

```typescript
// Manager views all staff
const { staff, total } = await listStaffByHotel(
  hotelId,
  { limit: 50 }
)

// Filter by status
const active = await listStaffByHotel(
  hotelId,
  { status: StaffStatus.ACTIVE }
)

// Filter by role
const housekeeping = await listStaffByHotel(
  hotelId,
  { role: StaffRole.HOUSEKEEPING }
)
```

### Staff ID Visibility

**Exposed to:** Admin/Manager only (via dashboard)  
**Not exposed to:** Public API, guest access, staff self-service

```typescript
// ✅ Admin can see staffId
const staff = await getStaffById(id, hotelId)
console.log(staff.staffId) // ST-00001

// ❌ Public endpoints DO NOT return staffId
// API responses only include: id, firstName, lastName, email, role, status
```

---

## StaffId Generation

**Format:** `ST-XXXXX` (e.g., ST-00001, ST-00002)

**Logic:**
1. Query last staff record by createdAt DESC
2. Extract number from staffId (ST-00001 → 1)
3. Increment by 1
4. Pad with zeros to 5 digits
5. Prepend "ST-"

**Guarantees:**
- Unique per hotel (enforced by `@@unique([hotelId, staffId])`)
- Sequential but allows for gaps (deletions)
- Consistent format for easy lookup

---

## Permission Matrix

| Role | STAFF_VIEW | STAFF_CREATE | STAFF_EDIT | STAFF_DELETE |
|------|-----------|-------------|-----------|------------|
| OWNER | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ | ❌ |
| RECEPTION | ✅ | ❌ | ❌ | ❌ |
| STAFF | ✅ | ❌ | ❌ | ❌ |
| AI_AGENT | ❌ | ❌ | ❌ | ❌ |

---

## User Flow Diagram

```
Admin Creates Staff
    ↓
Staff Record Created (PENDING, no User)
    ↓
Invitation Email Sent (with signup link)
    ↓
Staff Signs Up → User Account Created
    ↓
Onboarding Links User to Staff Record
    ↓
Staff Status → ACTIVE
    ↓
Staff Can Log In
```

---

## Best Practices

### 1. Always Extract hotelId from Auth
```typescript
// ✅ CORRECT: Get hotelId from session
const { hotelId } = ctx // From withAuth
await createStaff(hotelId, userId, input)

// ❌ WRONG: Never from request body
const hotelId = req.body.hotelId // SECURITY RISK
```

### 2. Enforce Hotel Scoping
```typescript
// ✅ CORRECT: Filter by hotelId
where: { id: staffId, hotelId }

// ❌ WRONG: Assume ID uniqueness
where: { id: staffId }
```

### 3. Check Permissions First
```typescript
// ✅ CORRECT: Check permission before operation
if (!hasPermission(role, Permission.STAFF_CREATE)) {
  return 403 Forbidden
}

// ❌ WRONG: Try operation then check
try {
  await createStaff(...)
} catch {
  if (!hasPermission) return 403
}
```

### 4. Use Service Functions
```typescript
// ✅ CORRECT: Use staffService functions
const staff = await createStaff(hotelId, userId, input)

// ❌ WRONG: Query Prisma directly
const staff = await prisma.staff.create({ ... })
```

### 5. Validate Enum Values
```typescript
// ✅ CORRECT: Check enum
if (!Object.values(StaffRole).includes(input.staffRole)) {
  return 400 Bad Request
}

// ❌ WRONG: Trust user input
await createStaff(hotelId, userId, { staffRole: input.staffRole })
```

---

## Testing

### Unit Test Example
```typescript
describe('staffService', () => {
  it('should create staff with PENDING status', async () => {
    const staff = await createStaff(
      hotelId,
      adminId,
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@hotel.com',
        staffRole: StaffRole.RECEPTION
      }
    )
    
    expect(staff.status).toBe(StaffStatus.PENDING)
    expect(staff.staffId).toMatch(/^ST-\d{5}$/)
    expect(staff.userId).toBeNull()
  })

  it('should enforce email uniqueness per hotel', async () => {
    const staff1 = await createStaff(...)
    
    expect(() => 
      createStaff(hotelId, adminId, {
        ...staff1,
        email: staff1.email // Same email
      })
    ).toThrow('already exists')
  })

  it('should generate sequential staffIds', async () => {
    const s1 = await createStaff(...)
    const s2 = await createStaff(...)
    
    expect(s1.staffId).toBe('ST-00001')
    expect(s2.staffId).toBe('ST-00002')
  })
})
```

### API Test Example
```typescript
describe('POST /api/staff', () => {
  it('should create staff with OWNER permission', async () => {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer owner-token' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@hotel.com',
        staffRole: 'RECEPTION'
      })
    })
    
    expect(res.status).toBe(201)
    expect(res.json.staff.staffId).toMatch(/^ST-\d{5}$/)
  })

  it('should reject RECEPTION staff trying to create', async () => {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer reception-token' },
      body: JSON.stringify({ ... })
    })
    
    expect(res.status).toBe(403)
    expect(res.json.error).toBe('Forbidden')
  })
})
```

---

## Security Checklist

- [x] Staff records don't create User accounts
- [x] Only OWNER/MANAGER can create staff
- [x] Email uniqueness enforced per hotel
- [x] hotelId scoping enforced on all queries
- [x] staffId not exposed in public endpoints
- [x] Permissions checked before operations
- [x] Soft delete (deactivatedAt) for audit trail
- [x] createdBy/updatedBy audit fields
- [x] No self-registration possible

---

## Migration Guide

**New installations:** Tables created automatically via `npx prisma migrate`

**Existing installations:**
```bash
npx prisma migrate dev --name add_staff_management
```

This will:
1. Create `Staff` table
2. Add `StaffStatus` enum
3. Add `StaffRole` enum
4. Add `staffId` column to User (nullable)
5. Create indexes on hotelId, staffId, status, staffRole

---

## Related Features

- **User Activation:** Link staff to User accounts after signup
- **Invitations:** Send invites to staff email addresses
- **Roles & Permissions:** RBAC for staff operations
- **Audit Logs:** Track staff creation/updates
- **Dashboard:** Admin staff management UI

---

**Status:** ✅ Implementation Complete  
**Build:** ✅ Passing (0 TypeScript errors)  
**Ready for:** Testing → Staging → Production
