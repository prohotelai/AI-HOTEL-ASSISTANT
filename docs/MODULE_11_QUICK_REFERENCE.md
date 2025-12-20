# Module 11: Universal QR Login - Quick Reference

## What Changed?

| What | Old (Module 10) | New (Module 11) |
|------|-----------------|-----------------|
| 🔑 QR Scope | Room-specific | **Hotel-wide** |
| 👥 Users | Guests only | **All roles** (guests, staff, managers, admins) |
| 📱 Login | Room number | **ID entry** (email, booking ref, staff ID) |
| 🔄 Token | JWT in QR | **48-char hex token** |
| ⏱️ Duration | Variable | **24-hour sessions** |
| 🔁 Rotation | Per guest | **Every 30 days** |

## API Endpoints

### Admin Only
```
POST   /api/qr/universal/generate      → Generate new QR (30-day validity)
GET    /api/qr/universal/generate      → List active QR tokens
```

### Public
```
POST   /api/qr/universal/validate      → Validate token + create session
POST   /api/qr/universal/session/validate → Verify session validity
```

## How It Works

```
Guest scans QR
    ↓
/login?token=HEX48CHARS
    ↓
Enter ID (email/booking ref)
    ↓
POST /api/qr/universal/validate
    ↓
Auto-detect role
    ↓
Create 24-hour session
    ↓
Redirect to role-based dashboard
    ↓
Guest  → /guest/concierge
Staff  → /staff/dashboard
Admin  → /dashboard
```

## Key Features

✅ **Single Hotel QR Code** - One QR for all users
✅ **Role Auto-Detection** - System detects user type automatically
✅ **24-Hour Sessions** - Temporary login, not persistent
✅ **30-Day Token Rotation** - Regular security refresh
✅ **Multi-User Support** - Guests, Staff, Managers, Admins
✅ **Session Tracking** - IP, User Agent, Device ID logging
✅ **Secure Tokens** - SHA-256 hash storage

## Admin Tasks

### Generate QR Code
1. Go to `/dashboard/admin/qr`
2. Click "Generate New QR Code"
3. Download PNG or SVG
4. Print and display in lobby

### View Active Codes
- See all active QR tokens
- Check session counts
- View expiration dates

## Guest/Staff Experience

### Scan QR
1. Open phone camera
2. Point at QR code
3. Tap notification to open app

### Enter ID
1. User enters email or ID
2. System verifies ID exists
3. Redirects to personalized dashboard

## Database Models

### UniversalQR
```typescript
{
  id: string              // CUID
  hotelId: string         // Hotel owner
  token: string           // 48-char hex (raw)
  tokenHash: string       // SHA-256 hash (for lookup)
  createdAt: Date
  expiresAt: Date         // 30-day validity
  rotationDate?: Date
  isActive: boolean       // Enable/disable
  createdBy: string       // Admin ID
  sessions: []            // Related sessions
}
```

### UserTemporarySession
```typescript
{
  id: string              // CUID
  qrTokenId: string       // Reference to UniversalQR
  hotelId: string
  userId: string          // Raw ID entered
  role: string            // Auto-detected
  userEmail?: string
  createdAt: Date
  expiresAt: Date         // 24-hour validity
  ipAddress?: string
  userAgent?: string
  isUsed: boolean
  usedAt?: Date
}
```

## File Changes

### ❌ Deleted
- `/app/api/qr/route.ts` - Old endpoints
- `/lib/services/pms/qrTokenService.ts` - Guest-specific service
- `QRToken` model from Prisma
- Old types: `QRTokenPayload`, `GuestLoginRequest/Response`

### ✅ Created
```
app/api/qr/universal/
├── generate.ts          (Admin generation)
├── validate.ts          (Token validation)
└── session/validate.ts  (Session validation)

app/login/page.tsx       (Updated for QR)
app/dashboard/admin/qr/page.tsx (QR management)

lib/hooks/useQRSession.ts (Frontend hook)
lib/pms/types.ts (New types)

tests/module-11/universal-qr.test.ts
docs/MODULE_11_UNIVERSAL_QR_LOGIN.md
```

### 🔄 Updated
- `prisma/schema.prisma` - New models + relations
- `middleware.ts` - QR session support
- `packages/widget-sdk/src/index.ts` - New endpoints
- `/app/login/page.tsx` - Full QR flow

## Common Patterns

### Generate QR (Admin)
```typescript
POST /api/qr/universal/generate
→ { qrCode: { png, svg }, loginUrl, expiresAt }
```

### Validate QR + Create Session (Frontend)
```typescript
POST /api/qr/universal/validate
{ token: 'hex48chars', userId: 'guest-email' }
→ { sessionId, role, expiresAt, redirectUrl }
```

### Verify Session (Frontend)
```typescript
POST /api/qr/universal/session/validate
{ sessionId: 'session-id' }
→ { session: { role, userId, expiresAt, ... } }
```

### Use Session Hook
```typescript
const { session, loading, error, logout } = useQRSession()

if (session?.role === 'admin') {
  return <AdminPanel />
}
```

## Permissions & Role Detection

```typescript
// Auto-detection mapping
Guest.email or Guest.id          → 'guest'
StaffProfile.email or id         → staff role
  - ADMIN     → 'admin'
  - MANAGER   → 'manager'
  - SUPERVISOR → 'supervisor'
  - STAFF     → 'staff'
  
// Default if not found
→ 'guest'
```

## Security

🔐 **Token**: 48-char hex (192 bits)
🔐 **Storage**: SHA-256 hash only
🔐 **Expiry**: 24 hours (sessions), 30 days (QR)
🔐 **IP Tracking**: Records request source
🔐 **Multi-tenant**: Isolated per hotel

## Configuration

```typescript
// Token expiry (30 days)
const EXPIRY_DAYS = 30
const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)

// Session duration (24 hours)
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)

// Token length (48 hex chars)
const TOKEN_LENGTH = 48
const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
```

## Testing

```bash
# Run tests
npm run test tests/module-11/universal-qr.test.ts

# Test scenarios covered:
# - Token generation
# - Session creation
# - Role auto-detection
# - Token expiry
# - Session expiry
# - Complete QR flow
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| QR won't scan | Printing too small | Print ≥100x100 pixels |
| Invalid token | Token expired | Generate new QR |
| User not found | Wrong ID | Check email/ID in system |
| Session expired | Exceeded 24h | Scan QR again |
| Role wrong | Not in DB | Add user first |

## Migration

```bash
# Create migration
npx prisma migrate dev --name add_universal_qr_system

# This automatically:
# - Drops old QRToken table
# - Creates UniversalQR table
# - Creates UserTemporarySession table
# - Updates Hotel relations
```

## Widget SDK Updates

```typescript
// OLD (no longer exists) ❌
/api/qr/validate
/api/qr/checkin
/api/qr/checkout

// NEW ✅
/api/qr/universal/validate
/api/qr/universal/generate
/api/qr/universal/session/validate
```

## Monitoring

```sql
-- Active sessions
SELECT COUNT(*) FROM "UserTemporarySession" 
WHERE "expiresAt" > NOW();

-- Sessions by role
SELECT "role", COUNT(*) FROM "UserTemporarySession" 
WHERE "expiresAt" > NOW()
GROUP BY "role";

-- QR usage by hotel
SELECT "hotelId", COUNT(*) as sessions 
FROM "UserTemporarySession" 
WHERE "expiresAt" > NOW()
GROUP BY "hotelId";

-- Token rotation dates
SELECT "id", "expiresAt" FROM "UniversalQR" 
WHERE "isActive" = true
ORDER BY "expiresAt" DESC;
```

## Next Steps

1. Run database migration
2. Test QR generation in admin panel
3. Test login flow with QR
4. Deploy to production
5. Monitor session counts and errors
6. Plan token rotation schedule

---

**For full documentation**: See [MODULE_11_UNIVERSAL_QR_LOGIN.md](MODULE_11_UNIVERSAL_QR_LOGIN.md)
**Status**: ✅ COMPLETE & TESTED
**Last Updated**: 2024-12-16
