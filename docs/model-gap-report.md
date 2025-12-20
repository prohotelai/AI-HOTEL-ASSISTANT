# Model Gap Report - Missing Prisma Models

**Date**: December 16, 2025  
**Phase**: 0 - Foundation Audit  
**Purpose**: Formal dependency map of all missing Prisma models

---

## Executive Summary

**Total Missing Models**: 28  
**Total Code References**: 150+  
**Affected Services**: 50+ files  
**Build Status**: ❌ FAILING (80+ TypeScript errors)

---

## 1. Security & Compliance (PRIORITY 1 - BLOCKER)

### 1.1 AuditLog Model

**Status**: ❌ MISSING  
**Priority**: **P1 - CRITICAL**  
**References**: 25+ across 15 files

#### Dependencies:

| File | Operation Count | Operations |
|------|----------------|------------|
| `lib/services/audit/auditLogger.ts` | 13 | create, findMany, deleteMany, count |
| `lib/auth/staffAuth.ts` | 3 | create (login, logout, suspicious activity) |
| `app/api/auth/*/route.ts` | 5 | create (auth events) |
| `lib/security/*.ts` | 4 | create (security events) |

#### Required Fields:
```prisma
model AuditLog {
  id           String   @id @default(cuid())
  hotelId      String   // Multi-tenant
  userId       String
  sessionId    String?
  eventType    String   // 'login', 'logout', 'suspicious_activity', etc.
  action       String   // Human-readable description
  resourceType String?  // 'session', 'user', 'guest', 'room', etc.
  resourceId   String?
  userAgent    String?
  ipAddress    String?
  success      Boolean
  errorMessage String?
  severity     String   // 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
  metadata     Json?
  createdAt    DateTime @default(now())
}
```

#### Service Functions Requiring AuditLog:
1. `logAuthenticationSuccess()`
2. `logAuthenticationFailure()`
3. `logSuspiciousActivity()`
4. `logTokenRotation()`
5. `logLogout()`
6. `logAccessDenied()`
7. `logRoleChange()`
8. `logPermissionChange()`
9. `logDataAccess()`
10. `logDataModification()`
11. `logConfigChange()`
12. `getAuditLogs()`
13. `cleanupOldAuditLogs()`

#### Impact if Not Implemented:
- ❌ No compliance audit trail (GDPR, SOC2, HIPAA)
- ❌ Cannot investigate security incidents
- ❌ No login/logout tracking
- ❌ No suspicious activity detection logs
- ❌ Legal/regulatory risk

---

### 1.2 RateLimitEntry Model

**Status**: ❌ MISSING  
**Priority**: **P1 - CRITICAL**  
**References**: 11 in 3 files

#### Dependencies:

| File | Operation Count | Operations |
|------|----------------|------------|
| `lib/security/rateLimiter.ts` | 7 | findUnique, create, update, updateMany, deleteMany |
| `app/api/*/route.ts` | 4 | checkRateLimit() calls |

#### Required Fields:
```prisma
model RateLimitEntry {
  id         String   @id @default(cuid())
  identifier String   // IP, user ID, or API key
  endpoint   String   // e.g., '/api/chat', '/api/booking'
  attempts   Int      @default(1)
  lastAttempt DateTime @default(now())
  resetAt     DateTime
  
  @@unique([identifier, endpoint])
  @@index([identifier])
  @@index([resetAt])
}
```

#### Service Functions Requiring RateLimitEntry:
1. `checkRateLimit()` - Verify if request allowed
2. `resetRateLimit()` - Manual reset
3. `getRateLimitStatus()` - Check current limits
4. `cleanupRateLimitEntries()` - Expired entries cleanup
5. `checkRateLimitMultiple()` - Batch check

#### Impact if Not Implemented:
- ❌ API endpoints vulnerable to abuse
- ❌ No DDoS protection
- ❌ Costly OpenAI API abuse possible
- ❌ Database overload risk
- ❌ Security vulnerability

---

### 1.3 BruteForceAttempt Model

**Status**: ❌ MISSING  
**Priority**: **P1 - CRITICAL**  
**References**: 11 in 2 files

#### Dependencies:

| File | Operation Count | Operations |
|------|----------------|------------|
| `lib/security/bruteForceProtection.ts` | 11 | findUnique, create, update, updateMany, findMany, deleteMany |

#### Required Fields:
```prisma
model BruteForceAttempt {
  id           String   @id @default(cuid())
  identifier   String   @unique  // Email or IP
  attemptCount Int      @default(1)
  lastAttempt  DateTime @default(now())
  isLocked     Boolean  @default(false)
  lockedUntil  DateTime?
  lockedAt     DateTime?
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([identifier])
  @@index([isLocked])
}
```

#### Service Functions Requiring BruteForceAttempt:
1. `recordFailedAttempt()` - Track failed login
2. `checkIfLocked()` - Verify if account locked
3. `lockAccount()` - Temporary lockout
4. `unlockAccount()` - Manual unlock
5. `resetAttempts()` - Clear attempts after success
6. `getLockedAccounts()` - Admin view
7. `cleanupExpiredLocks()` - Auto-unlock

#### Impact if Not Implemented:
- ❌ Account takeover vulnerability
- ❌ Brute force attacks possible
- ❌ No automatic account locking
- ❌ Security compliance failure
- ❌ High-risk vulnerability

---

## 2. PMS System (PRIORITY 1/3 - CONDITIONAL)

### 2.1 Room Model

**Status**: ❌ MISSING  
**Priority**: **P1 if PMS in scope, P3 if deferred**  
**References**: 30+ across 12 files

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/pms/roomService.ts` | create, findUnique, findMany, update, count |
| `lib/services/pms/housekeepingService.ts` | findMany, update (status changes) |
| `lib/services/pms/maintenanceService.ts` | findUnique, update (OOO status) |
| `lib/services/pms/availabilityService.ts` | count, findMany |
| `lib/services/pms/checkinService.ts` | findFirst, findUnique, findMany |
| `lib/services/pms/housekeepingRoundService.ts` | findMany (dirty rooms) |
| `lib/services/pms/keyService.ts` | findUnique |
| `lib/services/pms/noShowCheckerService.ts` | update (status) |
| `modules/pms-adapter/pmsSyncEngine.ts` | upsert, findMany |

#### Required Schema:
```prisma
model Room {
  id           String   @id @default(cuid())
  hotelId      String
  hotel        Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  roomTypeId   String
  roomType     RoomType @relation(fields: [roomTypeId], references: [id])
  
  number       String   // "101", "305"
  floor        Int?
  building     String?
  
  status       RoomStatus @default(VACANT_CLEAN)
  lastCleaned  DateTime?
  
  isOutOfOrder Boolean  @default(false)
  oooReason    String?
  oooUntil     DateTime?
  
  needsMaintenance Boolean @default(false)
  maintenanceNotes String?
  
  bookings              Booking[]
  housekeepingTasks     HousekeepingTask[]
  maintenanceRequests   MaintenanceRequest[]
  statusHistory         RoomStatusHistory[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([hotelId, number])
  @@index([hotelId])
  @@index([status])
}

enum RoomStatus {
  VACANT_CLEAN
  VACANT_DIRTY
  OCCUPIED_CLEAN
  OCCUPIED_DIRTY
  OUT_OF_ORDER
  OUT_OF_SERVICE
  INSPECTED
  BLOCKED
}
```

#### Service Functions Requiring Room:
**roomService.ts** (18 functions):
1. `createRoom()`, 2. `getRoomById()`, 3. `getRooms()`, 4. `updateRoom()`, 5. `updateRoomStatus()`, 6. `recordStatusChange()`, 7. `getRoomStatusHistory()`, 8. `setOutOfOrder()`, 9. `clearOutOfOrder()`, 10. `getRoomStatistics()`, 11. `getOccupancyRate()`, 12. `deleteRoom()`, 13. `markNeedsMaintenance()`, 14. `getRoomAvailability()`, 15. `getCleanRooms()`, 16. `getDirtyRooms()`, 17. `getOccupiedRooms()`, 18. `getRoomsByStatus()`

**housekeepingService.ts** (8 functions):
1. `markRoomCleaned()`, 2. `markRoomDirty()`, 3. `getRoomsNeedingCleaning()`, 4. `getDirtyRooms()`, 5. `getOccupiedRooms()`, 6. `inspectRoom()`, 7. `failInspection()`, 8. `getHousekeepingStats()`

**10+ more functions in other services**

---

### 2.2 RoomType Model

**Status**: ❌ MISSING  
**Priority**: **P1 if PMS in scope**  
**References**: 15+ across 5 files

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/pms/bookingService.ts` | findUnique (pricing) |
| `lib/services/pms/availabilityService.ts` | findMany (availability by type) |
| `lib/services/pms/availabilityRecalcService.ts` | findMany (recalc per type) |

#### Required Schema:
```prisma
model RoomType {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  name        String   // "Standard Room", "Deluxe Suite"
  code        String   // "STD", "DLX"
  description String?
  
  maxOccupancy Int     @default(2)
  bedConfiguration String?
  
  baseRate    Float
  amenities   Json?
  images      Json?
  
  isActive    Boolean  @default(true)
  rooms       Room[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([hotelId, code])
  @@index([hotelId])
}
```

---

### 2.3 Booking Model

**Status**: ❌ MISSING  
**Priority**: **P1 if PMS in scope**  
**References**: 75+ across 15 files

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/pmsService.ts` | findMany, upsert |
| `lib/services/pms/bookingService.ts` | create, update, findMany |
| `lib/services/pms/checkinService.ts` | findFirst, update (check-in) |
| `lib/services/pms/checkoutService.ts` | update (check-out) |
| `lib/services/pms/qrTokenService.ts` | findUnique, update |
| `lib/services/pms/noShowCheckerService.ts` | findMany (no-shows) |
| `modules/pms-adapter/pmsSyncEngine.ts` | upsert, findMany |
| `app/api/pms/*/route.ts` | Various operations |

#### Required Schema:
```prisma
model Booking {
  id              String   @id @default(cuid())
  hotelId         String
  hotel           Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  guestId         String
  guest           Guest    @relation(fields: [guestId], references: [id])
  
  roomId          String?
  room            Room?    @relation(fields: [roomId], references: [id])
  
  confirmationCode String  @unique
  
  checkIn         DateTime
  checkOut        DateTime
  nights          Int
  
  adults          Int      @default(1)
  children        Int      @default(0)
  
  status          BookingStatus @default(PENDING)
  source          BookingSource @default(DIRECT)
  
  roomRate        Float
  totalAmount     Float
  currency        String   @default("USD")
  
  specialRequests String?
  notes           String?
  
  checkedInAt     DateTime?
  checkedInBy     String?
  checkedOutAt    DateTime?
  checkedOutBy    String?
  
  folio           Folio?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([hotelId])
  @@index([guestId])
  @@index([status])
  @@index([checkIn])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
  NO_SHOW
}

enum BookingSource {
  DIRECT
  PHONE
  WALK_IN
  BOOKING_COM
  EXPEDIA
  AIRBNB
  OTHER_OTA
  CORPORATE
  AGENT
}
```

#### Service Functions Requiring Booking:
- 30+ functions across 8 service files
- Critical for: Check-in, checkout, availability, billing, reporting

---

### 2.4 Guest Model

**Status**: ❌ MISSING  
**Priority**: **P1 if PMS in scope**  
**References**: 25+ across 8 files

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/pms/guestService.ts` | create, findFirst, findUnique, findMany, update, delete, count |
| `lib/services/pms/bookingService.ts` | create (new guest) |
| `lib/services/pms/checkinService.ts` | update (check-in info) |
| `lib/services/pms/checkoutService.ts` | update (checkout info) |
| `lib/services/pms/noShowCheckerService.ts` | update (status) |
| `modules/pms-adapter/pmsSyncEngine.ts` | upsert, findMany |
| `app/api/pms/guest/*/route.ts` | findFirst |

#### Required Schema:
```prisma
model Guest {
  id           String   @id @default(cuid())
  hotelId      String
  hotel        Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  firstName    String
  lastName     String
  email        String
  phone        String?
  
  address      String?
  city         String?
  state        String?
  country      String?
  postalCode   String?
  
  idType       String?
  idNumber     String?
  idCountry    String?
  
  preferences  Json?
  isVIP        Boolean  @default(false)
  vipNotes     String?
  
  bookings     Booking[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([hotelId, email])
  @@index([hotelId])
  @@index([email])
}
```

#### Service Functions Requiring Guest:
**guestService.ts** (20 functions):
1. `createGuest()`, 2. `getGuestById()`, 3. `getGuestByEmail()`, 4. `getGuests()`, 5. `updateGuest()`, 6. `updateGuestPreferences()`, 7. `markAsVIP()`, 8. `removeVIPStatus()`, 9. `getGuestProfile()`, 10. `mergeGuests()`, 11. `deleteGuest()`, 12. `getGuestStats()`, 13. `searchGuests()`, 14. `getGuestHistory()`, 15. `addGuestNote()`, 16. `updateContactInfo()`, 17. `getVIPGuests()`, 18. `getReturningGuests()`, 19. `getNewGuests()`, 20. `exportGuestList()`

---

### 2.5 RoomStatusHistory Model

**Status**: ❌ MISSING  
**Priority**: **P2** (audit trail, not critical)  
**References**: 8 in 2 files

#### Required Schema:
```prisma
model RoomStatusHistory {
  id          String   @id @default(cuid())
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  
  fromStatus  RoomStatus
  toStatus    RoomStatus
  changedBy   String?
  reason      String?
  
  createdAt   DateTime @default(now())
  
  @@index([roomId])
}
```

---

### 2.6 RoomAvailability Model

**Status**: ❌ MISSING  
**Priority**: **P1** (required for availability engine)  
**References**: 12 in 1 file

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/pms/availabilityRecalcService.ts` | upsert, findMany |

#### Required Schema:
```prisma
model RoomAvailability {
  id          String   @id @default(cuid())
  hotelId     String
  roomTypeId  String
  date        DateTime
  available   Int      // Available rooms
  occupied    Int      // Occupied rooms
  blocked     Int      // Blocked/OOO rooms
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([hotelId, roomTypeId, date])
  @@index([hotelId, date])
}
```

#### Service Functions:
1. `recalculateAvailability()` - Daily recalculation
2. `getAvailability()` - Query availability
3. `getOccupancyForecast()` - Predictive analytics
4. `getLowOccupancyDays()` - Revenue optimization

---

### 2.7 HousekeepingTask Model

**Status**: ❌ MISSING  
**Priority**: **P2**  
**References**: 10 in 2 files

#### Required Schema:
```prisma
model HousekeepingTask {
  id            String   @id @default(cuid())
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  roomId        String
  room          Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  
  taskType      HousekeepingTaskType @default(STANDARD_CLEAN)
  priority      TaskPriority @default(NORMAL)
  status        HousekeepingTaskStatus @default(PENDING)
  
  assignedTo    String?
  assignedAt    DateTime?
  startedAt     DateTime?
  completedAt   DateTime?
  
  inspectedBy   String?
  inspectedAt   DateTime?
  inspectionPassed Boolean?
  
  notes         String?
  issuesFound   String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
  @@index([roomId])
  @@index([status])
}

enum HousekeepingTaskType {
  STANDARD_CLEAN
  DEEP_CLEAN
  CHECKOUT_CLEAN
  TURNDOWN_SERVICE
  REFRESH
}

enum HousekeepingTaskStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  INSPECTED
  FAILED_INSPECTION
}

enum TaskPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

---

### 2.8 MaintenanceRequest Model

**Status**: ❌ MISSING  
**Priority**: **P2**  
**References**: 10 in 2 files

#### Required Schema:
```prisma
model MaintenanceRequest {
  id            String   @id @default(cuid())
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  roomId        String?
  room          Room?    @relation(fields: [roomId], references: [id])
  
  title         String
  description   String
  category      MaintenanceCategory
  priority      TaskPriority @default(NORMAL)
  status        MaintenanceStatus @default(OPEN)
  
  reportedBy    String
  reportedAt    DateTime @default(now())
  
  assignedTo    String?
  assignedAt    DateTime?
  startedAt     DateTime?
  completedAt   DateTime?
  resolution    String?
  
  estimatedCost Float?
  actualCost    Float?
  photos        Json?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
  @@index([roomId])
  @@index([status])
}

enum MaintenanceCategory {
  PLUMBING
  ELECTRICAL
  HVAC
  APPLIANCE
  FURNITURE
  FIXTURE
  PAINTING
  FLOORING
  DOOR_WINDOW
  SAFETY
  OTHER
}

enum MaintenanceStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}
```

---

### 2.9 Folio Model

**Status**: ❌ MISSING  
**Priority**: **P2** (billing)  
**References**: 8 in 3 files

#### Required Schema:
```prisma
model Folio {
  id            String   @id @default(cuid())
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  bookingId     String   @unique
  booking       Booking  @relation(fields: [bookingId], references: [id])
  
  folioNumber   String   @unique
  status        FolioStatus @default(OPEN)
  
  totalCharges  Float    @default(0)
  totalPayments Float    @default(0)
  balance       Float    @default(0)
  
  charges       FolioCharge[]
  payments      Payment[]
  invoice       Invoice?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
  @@index([bookingId])
}

enum FolioStatus {
  OPEN
  CLOSED
  DISPUTED
}

model FolioCharge {
  id          String   @id @default(cuid())
  folioId     String
  folio       Folio    @relation(fields: [folioId], references: [id], onDelete: Cascade)
  
  description String
  category    ChargeCategory
  amount      Float
  quantity    Int      @default(1)
  chargeDate  DateTime @default(now())
  postedBy    String?
  
  createdAt   DateTime @default(now())
  
  @@index([folioId])
}

enum ChargeCategory {
  ROOM_RATE
  TAX
  MINIBAR
  RESTAURANT
  ROOM_SERVICE
  LAUNDRY
  SPA
  PARKING
  TELEPHONE
  INTERNET
  EXTRA_BED
  LATE_CHECKOUT
  DAMAGE
  OTHER
}
```

---

### 2.10 Payment Model

**Status**: ❌ MISSING  
**Priority**: **P2**  
**References**: 6 in 2 files

#### Required Schema:
```prisma
model Payment {
  id            String   @id @default(cuid())
  folioId       String
  folio         Folio    @relation(fields: [folioId], references: [id], onDelete: Cascade)
  
  amount        Float
  method        PaymentMethod
  transactionId String?  @unique
  reference     String?
  
  cardLast4     String?
  cardBrand     String?
  
  status        PaymentStatus @default(PENDING)
  processedAt   DateTime?
  processedBy   String?
  notes         String?
  
  createdAt     DateTime @default(now())
  
  @@index([folioId])
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  BANK_TRANSFER
  CHECK
  MOBILE_PAYMENT
  GIFT_CARD
  COMP
  OTHER
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}
```

---

### 2.11 Invoice Model

**Status**: ❌ MISSING  
**Priority**: **P2**  
**References**: 6 in 2 files

#### Required Schema:
```prisma
model Invoice {
  id            String   @id @default(cuid())
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  folioId       String   @unique
  folio         Folio    @relation(fields: [folioId], references: [id])
  
  invoiceNumber String   @unique
  subtotal      Float
  tax           Float
  total         Float
  
  status        InvoiceStatus @default(DRAFT)
  issuedAt      DateTime?
  dueAt         DateTime?
  paidAt        DateTime?
  pdfUrl        String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
  OVERDUE
  CANCELLED
}
```

---

## 3. Ticket System (PRIORITY 3 - OPTIONAL)

### 3.1 Ticket Model

**Status**: ❌ MISSING  
**Priority**: **P3** (defer to Phase 7)  
**References**: 40+ across 6 files

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/ticketService.ts` | findMany, findFirst, create, update, groupBy |
| `lib/queues/ticketQueues.ts` | findUnique, update |
| `lib/services/adminService.ts` | groupBy (analytics) |

#### Required Schema:
```prisma
model Ticket {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  title       String
  description String
  status      TicketStatus @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  
  reportedBy  String
  assignedTo  String?
  
  comments    TicketComment[]
  audits      TicketAudit[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([hotelId])
  @@index([status])
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  ON_HOLD
  RESOLVED
  CLOSED
  CANCELLED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model TicketComment {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  content   String
  authorId  String
  createdAt DateTime @default(now())
  @@index([ticketId])
}

model TicketAudit {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  action    String
  oldValue  String?
  newValue  String?
  userId    String
  createdAt DateTime @default(now())
  @@index([ticketId])
}

model TicketAutomationRun {
  id        String   @id @default(cuid())
  ticketId  String?
  automation String
  result    String
  createdAt DateTime @default(now())
}
```

#### Impact if Deferred:
- ✅ Can use external ticketing tool (Zendesk, Intercom)
- ⚠️ Usage tracking for tickets will return 0
- ⚠️ Admin dashboard will show empty ticket stats

---

## 4. Knowledge Base (PRIORITY 3 - OPTIONAL)

### 4.1 KnowledgeBase Models

**Status**: ❌ MISSING  
**Priority**: **P3** (defer to Phase 8)  
**References**: 30+ across 3 files

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/knowledgeBaseService.ts` | create, findFirst, findUnique, count |
| `lib/queues/knowledgeBaseQueue.ts` | findUnique, findMany, update |
| `lib/services/adminService.ts` | count (analytics) |

#### Required Schema:
```prisma
model KnowledgeBaseSource {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  name        String
  type        String
  status      String   @default("ACTIVE")
  config      Json?
  documents   KnowledgeBaseDocument[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([hotelId])
}

model KnowledgeBaseDocument {
  id          String   @id @default(cuid())
  sourceId    String
  source      KnowledgeBaseSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  title       String
  content     String   @db.Text
  status      KnowledgeBaseDocumentStatus @default(PENDING)
  chunks      KnowledgeBaseChunk[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([sourceId])
  @@index([status])
}

enum KnowledgeBaseDocumentStatus {
  PENDING
  PROCESSING
  READY
  FAILED
  ARCHIVED
}

model KnowledgeBaseChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    KnowledgeBaseDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content     String   @db.Text
  embedding   Json?
  createdAt   DateTime @default(now())
  @@index([documentId])
}

model KnowledgeBaseSyncJob {
  id        String   @id @default(cuid())
  sourceId  String
  status    String
  startedAt DateTime?
  endedAt   DateTime?
  error     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Impact if Deferred:
- ⚠️ AI uses only general knowledge (no hotel-specific training)
- ✅ AI assistant still functional
- ⚠️ Admin KB dashboard shows empty data

---

## 5. Staff Management (PRIORITY 2 - NICE-TO-HAVE)

### 5.1 StaffInvitation Model

**Status**: ❌ MISSING  
**Priority**: **P2** (defer to Phase 6)  
**References**: 15+ across 4 files

#### Dependencies:

| File | Operations Used |
|------|----------------|
| `lib/services/invitationService.ts` | findFirst, findUnique, create, update, updateMany, findMany |
| `app/api/staff/invitations/*/route.ts` | Various operations |

#### Required Schema:
```prisma
model StaffInvitation {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  email       String
  firstName   String
  lastName    String
  role        String
  
  token       String   @unique
  tokenHash   String
  
  status      InvitationStatus @default(PENDING)
  expiresAt   DateTime
  acceptedAt  DateTime?
  
  invitedBy   String
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([hotelId])
  @@index([email])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

model StaffProfile {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hotelId        String
  hotel          Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  firstName      String
  lastName       String
  phoneNumber    String?
  dateOfBirth    DateTime?
  departmentId   String?
  department     Department? @relation(fields: [departmentId], references: [id])
  position       String?
  startDate      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([hotelId])
}

model Department {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  name        String
  description String?
  staff       StaffProfile[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([hotelId, name])
  @@index([hotelId])
}
```

#### Impact if Deferred:
- ⚠️ Cannot send magic link invitations
- ✅ Staff can still be created manually via User model
- ✅ Authentication/authorization still works
- ⚠️ Staff invitation APIs return errors

---

## 6. Summary Table

| Domain | Models | Priority | Phase | References | Impact |
|--------|--------|----------|-------|------------|--------|
| **Security** | 3 | **P1** | 1 | 45+ | ❌ **BLOCKER** |
| **PMS Core** | 4 | **P1/P3** | 2-3 | 80+ | ⚠️ **CONDITIONAL** |
| **PMS Operations** | 6 | **P2** | 4-5 | 50+ | ⚠️ **PARTIAL** |
| **PMS Billing** | 4 | **P2** | 5 | 28+ | ⚠️ **PARTIAL** |
| **Tickets** | 4 | **P3** | 7 | 40+ | ℹ️ **OPTIONAL** |
| **Knowledge Base** | 4 | **P3** | 8 | 30+ | ℹ️ **OPTIONAL** |
| **Staff Mgmt** | 3 | **P2** | 6 | 15+ | ℹ️ **NICE-TO-HAVE** |
| **TOTAL** | **28** | - | **1-9** | **288+** | - |

---

## 7. Implementation Priority

### Phase 1 (IMMEDIATE - 2-3 hours):
```
✅ AuditLog
✅ RateLimitEntry
✅ BruteForceAttempt
```
**Goal**: Production-ready security

---

### Phase 2-5 (PMS - 40-60 hours):
```
Phase 2: Room, RoomType, Booking, Guest (schema only)
Phase 3: Availability engine + booking logic
Phase 4: HousekeepingTask, MaintenanceRequest
Phase 5: Folio, FolioCharge, Payment, Invoice
```
**Goal**: Functional PMS system

---

### Phase 6-9 (Optional - 20-30 hours):
```
Phase 6: StaffInvitation, StaffProfile, Department
Phase 7: Ticket, TicketComment, TicketAudit
Phase 8: KnowledgeBase models
Phase 9: Hardening + feature gating
```
**Goal**: Complete feature set

---

## 8. Risks & Blockers

### 8.1 Current Blockers:
1. ❌ **Build failing** - 80+ TypeScript errors
2. ❌ **Cannot deploy** - Errors prevent production build
3. ❌ **No security compliance** - Missing audit/rate limit/brute force
4. ❌ **PMS non-functional** - 19 service files useless

### 8.2 Risks:
1. **Scope Creep**: 28 models is massive - must phase carefully
2. **Migration Complexity**: Adding 28 models across 9 phases
3. **Breaking Changes**: Must maintain backward compatibility
4. **Data Integrity**: Multi-phase migrations need careful planning
5. **Testing**: Each phase needs comprehensive testing

---

## 9. Recommendations

### 9.1 Immediate Actions:
1. ✅ **Phase 1**: Add 3 security models (2-3 hours)
2. ✅ **Verify**: Build passes after Phase 1
3. ✅ **Deploy**: Security-ready baseline

### 9.2 PMS Decision:
- **Option A**: Implement PMS (Phases 2-5, 40-60 hours)
- **Option B**: Defer PMS, remove service files (4-6 hours)

**Recommendation**: **Option A** - Follow planned phases 2-5

### 9.3 Optional Features:
- ⏸️ Defer Tickets (Phase 7)
- ⏸️ Defer Knowledge Base (Phase 8)
- ⏸️ Defer Staff Management (Phase 6 if needed)

---

**Report End**
