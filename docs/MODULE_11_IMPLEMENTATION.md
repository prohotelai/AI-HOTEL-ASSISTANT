# Module 11: QR Guest Login System - Implementation Guide

## Overview

Module 11 implements QR-based guest login system for the AI Hotel Assistant platform. This system enables guests to authenticate using QR codes generated during check-in, providing seamless access to the Widget and hotel services.

**Status**: ✅ READY FOR IMPLEMENTATION
- 4 new API endpoints implemented
- QR token generation/revocation hooks added
- Guest Context adapter created
- Database schema updated with Stay and QRToken tables
- Comprehensive tests and Postman collection provided

## Architecture

### Key Components

#### 1. **Guest Context System** (`lib/pms/types.ts`, `lib/pms/adapters/guestContext.ts`)

Unified guest information for Widget SDK integration:

```typescript
type GuestContext = {
  guestId: string
  hotelId: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  language: string // Default: 'en'
  vipStatus: string // 'REGULAR', 'VIP', 'VVIP'
  loyaltyTier?: string | null
  loyaltyPoints: number
  preferences?: Record<string, unknown> | null
  permissions: {
    canAccessServices: boolean
    canRequestService: boolean
    canViewBill: boolean
    canOrderFood: boolean
    canRequestHousekeeping: boolean
  }
}
```

#### 2. **Stay Tracking** (`prisma/schema.prisma`)

New `Stay` model tracks guest check-in/check-out:

```prisma
model Stay {
  id              String   @id @default(cuid())
  guestId         String
  roomId          String
  hotelId         String
  bookingId       String?
  checkInTime     DateTime
  checkOutTime    DateTime
  actualCheckOutTime DateTime?
  status          String   @default("CHECKED_IN")
  numberOfNights  Int
  hasQRToken      Boolean  @default(false)
  qrTokens        QRToken[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### 3. **QR Token Management** (`lib/services/pms/qrTokenService.ts`)

Handles JWT generation, verification, and revocation:

- **generateQRToken()** - Creates JWT + stores hash in DB
- **verifyQRToken()** - Validates JWT signature + database status
- **revokeQRToken()** - Marks token as revoked
- **revokeStayQRTokens()** - Bulk revoke on checkout

#### 4. **Database Schema Updates**

**New Models:**
- `Stay` - Guest stay records
- `QRToken` - QR login tokens with JWT payload

**Updated Relations:**
- `Guest` → `stays`, `qrTokens`
- `Room` → `stays`
- `PMSBooking` → `stays`
- `Hotel` → `stays`, `qrTokens`

## API Endpoints

### 1. **GET /api/pms/guest/:guestId**

Retrieve guest profile with active stay information.

**Response:**
```json
{
  "success": true,
  "guestContext": {
    "guestId": "guest-1",
    "hotelId": "hotel-1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "language": "en",
    "vipStatus": "VIP",
    "loyaltyTier": "GOLD",
    "loyaltyPoints": 1500,
    "permissions": {
      "canAccessServices": true,
      "canRequestService": true,
      "canViewBill": true,
      "canOrderFood": true,
      "canRequestHousekeeping": true
    }
  },
  "hasActiveStay": true
}
```

### 2. **GET /api/pms/room/:roomId**

Retrieve room details with current occupancy and guest info.

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room-1",
    "number": "402",
    "floor": 4,
    "building": "Main",
    "status": "OCCUPIED",
    "isOccupied": true,
    "roomType": {
      "name": "Deluxe Suite",
      "bedType": "King",
      "maxOccupancy": 2,
      "amenities": ["WiFi", "TV", "Mini Bar"]
    },
    "currentGuest": {
      "guestId": "guest-1",
      "firstName": "John",
      "lastName": "Doe",
      "checkInTime": "2024-01-15T14:00:00Z",
      "checkOutTime": "2024-01-17T11:00:00Z"
    }
  }
}
```

### 3. **GET /api/pms/stay/:stayId**

Retrieve complete stay details with QR tokens.

**Response:**
```json
{
  "success": true,
  "stayContext": {
    "stayId": "stay-1",
    "guestId": "guest-1",
    "hotelId": "hotel-1",
    "roomId": "room-1",
    "roomNumber": "402",
    "checkInTime": "2024-01-15T14:00:00Z",
    "checkOutTime": "2024-01-17T11:00:00Z",
    "numberOfNights": 2,
    "isActive": true,
    "status": "CHECKED_IN"
  },
  "guest": { ... },
  "room": { ... },
  "booking": { ... },
  "qrTokens": {
    "activeCount": 1,
    "tokens": [...]
  }
}
```

### 4. **GET /api/pms/stay/active?guestId=...&roomId=...**

Query active stay by guest or room.

**Query Parameters:**
- `guestId` (optional) - Find stay by guest
- `roomId` (optional) - Find stay by room
- Must provide at least one

**Response:** Same as GET /api/pms/stay/:stayId

## Check-in/Checkout Enhancement

### Check-in Hook (POST /api/pms/checkin)

On successful check-in:

1. ✅ Create booking → CHECKED_IN
2. ✅ Create folio (room charges)
3. ✅ Issue room key
4. ✅ **Create Stay record** (NEW)
5. ✅ **Generate QR token** (NEW)

**Response includes:**
```json
{
  "booking": { ... },
  "folio": { ... },
  "keyLog": { ... },
  "qrToken": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "stayId": "stay-1",
    "expiresAt": "2024-01-16T14:00:00Z"
  },
  "stayId": "stay-1"
}
```

### Checkout Hook (POST /api/pms/checkout)

On successful checkout:

1. ✅ Update booking → CHECKED_OUT
2. ✅ Close folio
3. ✅ Generate invoice
4. ✅ Return keys
5. ✅ Create housekeeping task
6. ✅ **Revoke all QR tokens** (NEW)
7. ✅ **Close Stay record** (NEW)

**Response includes:**
```json
{
  "booking": { ... },
  "invoice": { ... },
  "housekeepingTask": { ... },
  "qrTokensRevoked": 1
}
```

## QR Token JWT Payload

```typescript
type QRTokenPayload = {
  sub: string              // guestId
  hotelId: string
  stayId: string
  roomId: string
  roomNumber: string
  guestName: string
  iat: number              // issued at (unix timestamp)
  exp: number              // expiration (unix timestamp)
  type: 'qr_guest_login'
  permissions: string[]    // ['access_services', 'request_service', ...]
}
```

## Guest Context Adapter Functions

### `createGuestContext(guest, hotelId, options?)`

Create unified guest context from guest + stay records.

```typescript
const context = createGuestContext(guest, 'hotel-1')
// Returns: GuestContext with active permissions if has active stay
```

### `createStayContext(stay)`

Create stay context from stay record.

```typescript
const context = createStayContext(stay)
// Returns: StayContext with room, guest, and active status
```

### `createUnifiedContext(guest, hotelId)`

Combine guest and stay contexts.

```typescript
const { guest: guestCtx, stay: stayCtx } = createUnifiedContext(guest, 'hotel-1')
// Returns: { guest: GuestContext, stay: StayContext | null }
```

### `validateGuestContextForQRLogin(context)`

Validate guest is eligible for QR login.

```typescript
const { valid, reason } = validateGuestContextForQRLogin(context)
if (!valid) {
  // Guest doesn't have active stay or other requirement not met
}
```

### `enrichGuestContextForWidget(context, data)`

Add widget-specific data to guest context.

```typescript
const enriched = enrichGuestContextForWidget(context, {
  activeTickets: 2,
  pendingRequests: 1,
  billBalance: 0,
  lastVisitDate: new Date('2024-01-10')
})
```

## QR Token Service Functions

### `generateQRToken(stayId, guestId, hotelId, roomId, roomNumber, guestName, options?)`

Generate JWT + store in database.

```typescript
const { token, tokenInfo } = await generateQRToken(
  'stay-1',
  'guest-1',
  'hotel-1',
  'room-1',
  '402',
  'John Doe',
  {
    expiryHours: 24,
    metadata: { bookingId: 'booking-1' }
  }
)
```

### `verifyQRToken(token)`

Verify JWT signature + database status.

```typescript
const { valid, payload, tokenInfo, reason } = await verifyQRToken(token)
if (valid) {
  // Token is valid and active
  const guest = payload.sub  // guestId
}
```

### `revokeQRToken(token)`

Revoke single token.

```typescript
const { revoked, reason } = await revokeQRToken(token)
```

### `revokeStayQRTokens(stayId)`

Bulk revoke all tokens for stay.

```typescript
const { revokedCount } = await revokeStayQRTokens('stay-1')
```

### `createStay(guestId, roomId, hotelId, bookingId, checkInTime, checkOutTime)`

Create stay record for check-in.

```typescript
const { id: stayId, error } = await createStay(
  'guest-1',
  'room-1',
  'hotel-1',
  'booking-1',
  new Date(),
  new Date(Date.now() + 48 * 60 * 60 * 1000)
)
```

### `closeStay(stayId, actualCheckOutTime?)`

Close stay and revoke tokens on checkout.

```typescript
const { closed, error } = await closeStay('stay-1', new Date())
```

## Environment Variables

```env
# JWT secret for QR token signing
JWT_SECRET=your-secret-key-min-32-chars

# QR token expiry duration (hours)
QR_TOKEN_EXPIRY_HOURS=24
```

## Database Migrations

Run Prisma migrations to create new tables:

```bash
npx prisma migrate dev --name add_stays_and_qr_tokens
npx prisma generate
```

This creates:
- `Stay` table with proper indexes
- `QRToken` table with JWT + hash storage
- Relationships to `Guest`, `Room`, `Hotel`, `PMSBooking`

## Testing

### Unit Tests (`tests/unit/pms-guest-context.test.ts`)

```bash
npm run test -- tests/unit/pms-guest-context.test.ts
```

Tests:
- ✅ GuestContext creation with/without active stay
- ✅ StayContext creation and status tracking
- ✅ Unified context combining
- ✅ QR login validation
- ✅ Edge cases (multiple stays, expired stays, no data)

### Integration Tests (`tests/integration/pms-guest-context.test.ts`)

```bash
npm run test:integration -- tests/integration/pms-guest-context.test.ts
```

Covers:
- ✅ Complete check-in → stay access → checkout flow
- ✅ Multi-tenant isolation
- ✅ Permission and access control
- ✅ QR token lifecycle
- ✅ Error handling and edge cases
- ✅ Performance considerations

## API Testing with Postman

Import the collection: `docs/MODULE_11_QR_LOGIN_POSTMAN.json`

**Setup:**
1. Set `base_url` = `http://localhost:3000`
2. Authenticate and set `access_token`
3. Set guest/room/stay IDs for your test data

**Test Flow:**
1. POST /api/pms/checkin → Get `stayId` and `qrToken`
2. GET /api/pms/guest/:guestId → Verify permissions true
3. GET /api/pms/stay/active?guestId=... → Verify active stay
4. GET /api/pms/room/:roomId → Verify room occupied
5. POST /api/pms/checkout → Verify tokens revoked

## Integration with Widget SDK

### Widget Initialization with QR Login

```typescript
// In Widget component
const guestContext = await fetch('/api/pms/guest/' + guestId)
  .then(r => r.json())
  .then(d => d.guestContext)

// Widget now has context:
// - Guest name and preferences
// - Active permissions
// - Language and VIP status
// - Loyalty points

// For QR scan authentication:
const stayContext = await fetch('/api/pms/stay/active?guestId=' + guestId)
  .then(r => r.json())
  .then(d => d.stayContext)

// Widget authenticated with:
// - Stay details (check-in/out times)
// - Room information
// - Active QR tokens
```

### Widget Permissions Based on Guest Context

```typescript
// Widget UI rendered based on guestContext.permissions:

if (guestContext.permissions.canRequestService) {
  // Show "Request Service" button
}

if (guestContext.permissions.canViewBill) {
  // Show "View Bill" section
}

if (guestContext.permissions.canOrderFood) {
  // Show "Order Food" menu
}

if (guestContext.permissions.canRequestHousekeeping) {
  // Show "Housekeeping Request" option
}
```

## Multi-Tenant Security

All endpoints enforce multi-tenant isolation:

```typescript
where: {
  id: guestId,
  hotelId: session.user.hotelId  // ← Multi-tenant enforcement
}
```

- Guest from Hotel A cannot be accessed by Hotel B users
- Rooms are filtered by hotel
- Stays and QR tokens are hotel-specific
- JWT tokens include hotelId claim

## Error Handling

### Common Responses

**404 Not Found:**
```json
{
  "error": "Guest not found"
}
```

**400 Bad Request:**
```json
{
  "error": "Either guestId or roomId must be provided"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**500 Server Error:**
```json
{
  "error": "Failed to fetch guest context"
}
```

## Performance Optimization

### Database Indexes

Stay table indexes:
- `hotelId, status` - Fast queries by hotel + status
- `checkInTime, checkOutTime` - Date range queries
- `guestId, status` - Guest active stay lookup
- `roomId, status` - Room occupancy lookup

QRToken table indexes:
- `hotelId` - Multi-tenant isolation
- `stayId` - Find tokens by stay
- `guestId, expiresAt` - Active tokens for guest
- `tokenHash` - Fast token lookup
- `revokedAt` - Filter revoked tokens

### Query Optimization

All endpoints:
- ✅ Use proper `include` for related data
- ✅ Filter by `hotelId` early
- ✅ Limit result sets appropriately
- ✅ Index most-used query paths

## Troubleshooting

### QR Token Generation Fails But Check-in Succeeds

This is expected behavior:
- Check-in transaction completes successfully
- QR token generation failure is non-blocking
- Warning logged: "QR token generation failed, continuing with check-in"
- Guest can check in without QR code, manual verification available

### Guest Permissions All False

Check:
1. Guest has active stay: `GET /api/pms/guest/{guestId}` should have `hasActiveStay: true`
2. Stay is CHECKED_IN: `GET /api/pms/stay/{stayId}` should show `status: "CHECKED_IN"`
3. Checkout time is in future: `checkOutTime > now()`

### QR Token Won't Verify

Check:
1. Token format is correct JWT
2. Token hasn't expired: `exp > now()`
3. Token hasn't been revoked: `revokedAt = null`
4. Token hash exists in database

## Future Enhancements

Planned for post-Module 11:
- Multi-room extensions during stay
- Room change with token update
- Guest self-check-in with QR
- Token usage analytics and reporting
- Enhanced security with rate limiting
- Device binding and IP tracking

## Reference

- **Types**: `/lib/pms/types.ts` - GuestContext, StayContext, QRTokenPayload
- **Adapter**: `/lib/pms/adapters/guestContext.ts` - Context creation functions
- **Service**: `/lib/services/pms/qrTokenService.ts` - QR token management
- **Endpoints**: `/app/api/pms/{guest,room,stay}/route.ts` - API implementations
- **Schema**: `/prisma/schema.prisma` - Stay and QRToken models
- **Tests**: `/tests/{unit,integration}/pms-guest-*.test.ts`
- **Postman**: `/docs/MODULE_11_QR_LOGIN_POSTMAN.json`
