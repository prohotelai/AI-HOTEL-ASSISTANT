# Prisma Schema Proposal - Schema-First Approach

**Date**: December 16, 2025  
**Status**: PROPOSAL - Not Implemented

## Executive Summary

Analysis of the codebase reveals **50+ services** referencing **15+ Prisma models** that **DO NOT EXIST** in the current schema. This has caused cascading build failures requiring extensive stubbing.

This document proposes a comprehensive Prisma schema covering:
1. **Core SaaS** (already implemented)
2. **Security & Compliance** (missing)
3. **PMS Full System** (missing)
4. **Ticketing System** (missing)
5. **Knowledge Base** (missing)
6. **Staff Management** (missing)

---

## 1. Missing Models Analysis

### 1.1 Security & Compliance (CORE - PRIORITY 1)

**Current Status**: Referenced in 20+ files, ALL stubbed

| Model | References | Services Using |
|-------|-----------|----------------|
| `AuditLog` | 25+ | staffAuth.ts, audit/auditLogger.ts, all auth flows |
| `RateLimitEntry` | 11 | rateLimiter.ts, all API endpoints |
| `BruteForceAttempt` | 11 | bruteForceProtection.ts, login flows |

**Impact**: 
- ❌ No audit trail for compliance (GDPR, SOC2)
- ❌ No rate limiting (API vulnerable to abuse)
- ❌ No brute force protection (security risk)

**Categorization**: **CORE** - These MUST exist for production security

---

### 1.2 PMS Models (CORE FOR PMS MODULE - PRIORITY 1)

**Current Status**: Referenced in 80+ files across entire PMS system

| Model | References | Services Using |
|-------|-----------|----------------|
| `Room` | 30+ | roomService, housekeepingService, maintenanceService, availabilityService |
| `RoomType` | 15+ | roomService, availabilityService, pricingService |
| `RoomStatusHistory` | 8 | roomService, housekeepingService |
| `Booking` | 75+ | bookingService, checkinService, checkoutService, folioService, pmsSyncEngine |
| `Guest` | 25+ | guestService, bookingService, checkinService, pmsSyncEngine, guestContext.ts |
| `RoomAvailability` | 12 | availabilityService, availabilityRecalcService |
| `HousekeepingTask` | 10 | housekeepingService, housekeepingRoundService |
| `HousekeepingAssignment` | 8 | housekeepingService |
| `MaintenanceRequest` | 10 | maintenanceService, maintenanceSchedulerService |
| `MaintenanceSchedule` | 6 | maintenanceSchedulerService |
| `Folio` | 8 | folioService, invoiceService |
| `FolioCharge` | 8 | folioService, checkoutService |
| `Payment` | 6 | folioService, checkoutService |
| `Invoice` | 6 | invoiceService, invoiceGeneratorService |

**Impact**:
- ❌ **19 PMS service files** completely non-functional
- ❌ Cannot manage rooms, bookings, guests
- ❌ No housekeeping, maintenance, or billing
- ❌ PMS module is 100% theoretical code with no database

**Categorization**: 
- **CORE** if PMS module is a deliverable
- **OPTIONAL** if PMS is future phase (then remove all PMS services)

---

### 1.3 Ticketing System (OPTIONAL - PRIORITY 3)

**Current Status**: Referenced in 15+ files

| Model | References | Services Using |
|-------|-----------|----------------|
| `Ticket` | 40+ | ticketService, ticketQueues, adminService |
| `TicketComment` | 5 | ticketService |
| `TicketAudit` | 3 | ticketService |
| `TicketAutomationRun` | 2 | ticketQueues |

**Impact**:
- ❌ Ticket system non-functional
- ❌ Cannot track service requests
- ⚠️ Usage tracking for tickets exists but has no data

**Categorization**: **OPTIONAL** - Can defer to Phase 7+

---

### 1.4 Knowledge Base (OPTIONAL - PRIORITY 3)

**Current Status**: Referenced in 10+ files

| Model | References | Services Using |
|-------|-----------|----------------|
| `KnowledgeBaseSource` | 8 | knowledgeBaseService, knowledgeBaseQueue |
| `KnowledgeBaseDocument` | 12 | knowledgeBaseService, knowledgeBaseQueue, adminService |
| `KnowledgeBaseChunk` | 6 | knowledgeBaseService, knowledgeBaseQueue |
| `KnowledgeBaseSyncJob` | 4 | knowledgeBaseQueue |

**Impact**:
- ❌ AI training data management non-functional
- ❌ Cannot ingest/chunk/embed documents
- ⚠️ Impacts AI assistant quality

**Categorization**: **OPTIONAL** - Can defer to Phase 8+

---

### 1.5 Staff Management (OPTIONAL - PRIORITY 2)

**Current Status**: Referenced in 15+ files

| Model | References | Services Using |
|-------|-----------|----------------|
| `StaffInvitation` | 15+ | invitationService, staff invitation APIs |
| `StaffProfile` | 5 | invitationService, staff APIs |
| `Department` | 3 | invitationService, staff management |

**Impact**:
- ❌ Staff onboarding via magic links broken
- ⚠️ Staff can still be created manually via User model
- ✅ Authentication still works

**Categorization**: **OPTIONAL** - Nice-to-have, not critical

---

## 2. Recommended Categorization

### ✅ CORE (Must Implement Now)

**Security & Compliance**:
- `AuditLog` - Legal/compliance requirement
- `RateLimitEntry` - Security requirement
- `BruteForceAttempt` - Security requirement

**Total**: 3 models

**Effort**: 2-3 hours  
**Risk if skipped**: HIGH - Security vulnerabilities, compliance failures

---

### 🔶 CONDITIONAL CORE (Depends on PMS Scope)

**Question**: Is the PMS module part of the current deliverable?

**If YES** - Add all 14 PMS models:
- `Room`, `RoomType`, `RoomStatusHistory`, `RoomAvailability`
- `Booking`, `Guest`
- `HousekeepingTask`, `HousekeepingAssignment`
- `MaintenanceRequest`, `MaintenanceSchedule`
- `Folio`, `FolioCharge`, `Payment`, `Invoice`

**If NO** - Remove all 19 PMS service files:
- Delete `/lib/services/pms/*` (19 files)
- Delete `/modules/pms-adapter/*`
- Remove PMS imports from 50+ files

**Recommendation**: **REMOVE PMS services** for now
- Reason: 14 models is massive scope
- Alternative: Deliver PMS as separate Phase 7 after SaaS core stabilizes

---

### ⏸️ OPTIONAL (Defer to Future Phases)

**Ticketing System** (Phase 7):
- `Ticket`, `TicketComment`, `TicketAudit`, `TicketAutomationRun`
- Keep usage tracking stub, implement models later

**Knowledge Base** (Phase 8):
- `KnowledgeBaseSource`, `KnowledgeBaseDocument`, `KnowledgeBaseChunk`, `KnowledgeBaseSyncJob`
- Keep service interface, implement when AI assistant scope expands

**Staff Management** (Phase 6):
- `StaffInvitation`, `StaffProfile`, `Department`
- Manual user creation works fine for now

---

## 3. Proposed Prisma Schema Additions

### 3.1 Security & Compliance Models (CORE)

```prisma
// ========== SECURITY & COMPLIANCE ==========

// Audit Log: Track all security events
model AuditLog {
  id           String   @id @default(cuid())
  
  // Context
  hotelId      String
  hotel        Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  sessionId    String?
  
  // Event details
  eventType    String   // 'login', 'logout', 'token_rotation', 'suspicious_activity', etc.
  action       String   // Human-readable action description
  resourceType String?  // 'session', 'user', 'hotel', 'guest', 'room', 'ticket', etc.
  resourceId   String?
  
  // Request metadata
  userAgent    String?
  ipAddress    String?
  
  // Result
  success      Boolean
  errorMessage String?
  severity     String   // 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
  
  // Metadata (JSON)
  metadata     Json?
  
  createdAt    DateTime @default(now())
  
  @@index([hotelId])
  @@index([userId])
  @@index([sessionId])
  @@index([eventType])
  @@index([severity])
  @@index([createdAt])
  @@index([hotelId, eventType, createdAt])
}

// Rate Limit Entry: Per-endpoint rate limiting
model RateLimitEntry {
  id         String   @id @default(cuid())
  
  // Identifier (IP, user ID, or API key)
  identifier String
  
  // Endpoint being rate limited
  endpoint   String
  
  // Counter
  attempts   Int      @default(1)
  
  // Window
  lastAttempt DateTime @default(now())
  resetAt     DateTime
  
  @@unique([identifier, endpoint])
  @@index([identifier])
  @@index([endpoint])
  @@index([resetAt])
}

// Brute Force Attempt: Track failed login attempts
model BruteForceAttempt {
  id           String   @id @default(cuid())
  
  // Identifier (IP, email, or user ID)
  identifier   String   @unique
  
  // Tracking
  attemptCount Int      @default(1)
  lastAttempt  DateTime @default(now())
  
  // Lockout
  isLocked     Boolean  @default(false)
  lockedUntil  DateTime?
  lockedAt     DateTime?
  
  // Metadata
  metadata     Json?    // IP, user agent, etc.
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([identifier])
  @@index([isLocked])
  @@index([lockedUntil])
}
```

---

### 3.2 PMS Full System Models (CONDITIONAL)

**⚠️ ONLY ADD IF PMS IS IN CURRENT SCOPE**

```prisma
// ========== PMS: ROOM MANAGEMENT ==========

// Room Type: Categories of rooms (Standard, Deluxe, Suite, etc.)
model RoomType {
  id          String   @id @default(cuid())
  
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  // Type details
  name        String   // "Standard Room", "Deluxe Suite", etc.
  code        String   // "STD", "DLX", "SUT"
  description String?
  
  // Capacity
  maxOccupancy Int     @default(2)
  bedConfiguration String? // "1 King", "2 Queens", etc.
  
  // Pricing
  baseRate    Float    // Base nightly rate
  
  // Amenities (JSON array)
  amenities   Json?    // ["WiFi", "TV", "Mini Bar", "Balcony"]
  
  // Images
  images      Json?    // Array of image URLs
  
  // Status
  isActive    Boolean  @default(true)
  
  // Relations
  rooms       Room[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([hotelId, code])
  @@index([hotelId])
  @@index([isActive])
}

// Room: Physical room inventory
model Room {
  id           String   @id @default(cuid())
  
  hotelId      String
  hotel        Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  roomTypeId   String
  roomType     RoomType @relation(fields: [roomTypeId], references: [id])
  
  // Room identification
  number       String   // "101", "305", etc.
  floor        Int?
  building     String?
  
  // Current status
  status       RoomStatus @default(VACANT_CLEAN)
  lastCleaned  DateTime?
  
  // Condition flags
  isOutOfOrder Boolean  @default(false)
  oooReason    String?  // Out of order reason
  oooUntil     DateTime?
  
  // Maintenance flags
  needsMaintenance Boolean @default(false)
  maintenanceNotes String?
  
  // Relations
  bookings              Booking[]
  housekeepingTasks     HousekeepingTask[]
  maintenanceRequests   MaintenanceRequest[]
  statusHistory         RoomStatusHistory[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([hotelId, number])
  @@index([hotelId])
  @@index([roomTypeId])
  @@index([status])
  @@index([isOutOfOrder])
  @@index([needsMaintenance])
}

// Room Status Enum
enum RoomStatus {
  VACANT_CLEAN        // Available for sale
  VACANT_DIRTY        // Needs cleaning
  OCCUPIED_CLEAN      // Guest checked in, room clean
  OCCUPIED_DIRTY      // Guest checked in, needs cleaning
  OUT_OF_ORDER        // Not available (maintenance)
  OUT_OF_SERVICE      // Not available (management hold)
  INSPECTED           // Cleaned and inspected
  BLOCKED             // Administratively blocked
}

// Room Status History: Audit trail
model RoomStatusHistory {
  id          String   @id @default(cuid())
  
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  
  fromStatus  RoomStatus
  toStatus    RoomStatus
  
  changedBy   String?  // User ID
  reason      String?
  
  createdAt   DateTime @default(now())
  
  @@index([roomId])
  @@index([createdAt])
}

// ========== PMS: BOOKING MANAGEMENT ==========

// Booking: Guest reservations
model Booking {
  id              String   @id @default(cuid())
  
  hotelId         String
  hotel           Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  guestId         String
  guest           Guest    @relation(fields: [guestId], references: [id])
  
  roomId          String?
  room            Room?    @relation(fields: [roomId], references: [id])
  
  // Booking details
  confirmationCode String  @unique
  
  // Stay dates
  checkIn         DateTime
  checkOut        DateTime
  nights          Int
  
  // Guest counts
  adults          Int      @default(1)
  children        Int      @default(0)
  
  // Status
  status          BookingStatus @default(PENDING)
  source          BookingSource @default(DIRECT)
  
  // Pricing
  roomRate        Float
  totalAmount     Float
  currency        String   @default("USD")
  
  // Special requests
  specialRequests String?
  notes           String?
  
  // Check-in/out tracking
  checkedInAt     DateTime?
  checkedInBy     String?  // Staff user ID
  checkedOutAt    DateTime?
  checkedOutBy    String?  // Staff user ID
  
  // Relations
  folio           Folio?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([hotelId])
  @@index([guestId])
  @@index([roomId])
  @@index([status])
  @@index([checkIn])
  @@index([checkOut])
  @@index([confirmationCode])
}

enum BookingStatus {
  PENDING         // Not confirmed
  CONFIRMED       // Confirmed, awaiting arrival
  CHECKED_IN      // Guest arrived
  CHECKED_OUT     // Guest departed
  CANCELLED       // Cancelled by guest/hotel
  NO_SHOW         // Guest didn't arrive
}

enum BookingSource {
  DIRECT          // Direct booking via hotel
  PHONE           // Phone reservation
  WALK_IN         // Walk-in guest
  BOOKING_COM     // Booking.com
  EXPEDIA         // Expedia
  AIRBNB          // Airbnb
  OTHER_OTA       // Other online travel agency
  CORPORATE       // Corporate booking
  AGENT           // Travel agent
}

// Guest: Customer information
model Guest {
  id           String   @id @default(cuid())
  
  hotelId      String
  hotel        Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  // Personal info
  firstName    String
  lastName     String
  email        String
  phone        String?
  
  // Address
  address      String?
  city         String?
  state        String?
  country      String?
  postalCode   String?
  
  // Identification
  idType       String?  // "passport", "drivers_license", "national_id"
  idNumber     String?
  idCountry    String?
  
  // Preferences
  preferences  Json?    // Room preferences, dietary restrictions, etc.
  
  // VIP status
  isVIP        Boolean  @default(false)
  vipNotes     String?
  
  // Relations
  bookings     Booking[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([hotelId, email])
  @@index([hotelId])
  @@index([email])
  @@index([lastName])
}

// ========== PMS: HOUSEKEEPING ==========

// Housekeeping Task: Daily room cleaning assignments
model HousekeepingTask {
  id            String   @id @default(cuid())
  
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  roomId        String
  room          Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  
  // Task details
  taskType      HousekeepingTaskType @default(STANDARD_CLEAN)
  priority      TaskPriority @default(NORMAL)
  
  // Status
  status        HousekeepingTaskStatus @default(PENDING)
  
  // Assignment
  assignedTo    String?  // Staff user ID
  assignedAt    DateTime?
  
  // Completion
  startedAt     DateTime?
  completedAt   DateTime?
  
  // Quality control
  inspectedBy   String?  // Supervisor user ID
  inspectedAt   DateTime?
  inspectionPassed Boolean?
  
  // Notes
  notes         String?
  issuesFound   String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
  @@index([roomId])
  @@index([status])
  @@index([assignedTo])
  @@index([createdAt])
}

enum HousekeepingTaskType {
  STANDARD_CLEAN      // Regular daily clean
  DEEP_CLEAN          // Thorough cleaning
  CHECKOUT_CLEAN      // Post-checkout cleaning
  TURNDOWN_SERVICE    // Evening turndown
  REFRESH             // Quick refresh
}

enum HousekeepingTaskStatus {
  PENDING             // Not started
  ASSIGNED            // Assigned to staff
  IN_PROGRESS         // Currently being cleaned
  COMPLETED           // Cleaning finished
  INSPECTED           // Quality check passed
  FAILED_INSPECTION   // Quality check failed
}

enum TaskPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

// ========== PMS: MAINTENANCE ==========

// Maintenance Request: Room/facility maintenance tracking
model MaintenanceRequest {
  id            String   @id @default(cuid())
  
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  roomId        String?
  room          Room?    @relation(fields: [roomId], references: [id])
  
  // Request details
  title         String
  description   String
  category      MaintenanceCategory
  priority      TaskPriority @default(NORMAL)
  
  // Status
  status        MaintenanceStatus @default(OPEN)
  
  // Reporting
  reportedBy    String   // User ID
  reportedAt    DateTime @default(now())
  
  // Assignment
  assignedTo    String?  // Maintenance staff user ID
  assignedAt    DateTime?
  
  // Resolution
  startedAt     DateTime?
  completedAt   DateTime?
  resolution    String?
  
  // Cost tracking
  estimatedCost Float?
  actualCost    Float?
  
  // Photos
  photos        Json?    // Array of photo URLs
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
  @@index([roomId])
  @@index([status])
  @@index([priority])
  @@index([assignedTo])
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

// ========== PMS: BILLING ==========

// Folio: Guest billing account
model Folio {
  id            String   @id @default(cuid())
  
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  bookingId     String   @unique
  booking       Booking  @relation(fields: [bookingId], references: [id])
  
  // Folio number
  folioNumber   String   @unique
  
  // Status
  status        FolioStatus @default(OPEN)
  
  // Balances
  totalCharges  Float    @default(0)
  totalPayments Float    @default(0)
  balance       Float    @default(0)
  
  // Relations
  charges       FolioCharge[]
  payments      Payment[]
  invoice       Invoice?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
  @@index([bookingId])
  @@index([status])
}

enum FolioStatus {
  OPEN
  CLOSED
  DISPUTED
}

// Folio Charge: Individual charges
model FolioCharge {
  id          String   @id @default(cuid())
  
  folioId     String
  folio       Folio    @relation(fields: [folioId], references: [id], onDelete: Cascade)
  
  // Charge details
  description String
  category    ChargeCategory
  amount      Float
  quantity    Int      @default(1)
  
  // Date
  chargeDate  DateTime @default(now())
  
  // Posted by
  postedBy    String?  // Staff user ID
  
  createdAt   DateTime @default(now())
  
  @@index([folioId])
  @@index([category])
  @@index([chargeDate])
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

// Payment: Payment transactions
model Payment {
  id            String   @id @default(cuid())
  
  folioId       String
  folio         Folio    @relation(fields: [folioId], references: [id], onDelete: Cascade)
  
  // Payment details
  amount        Float
  method        PaymentMethod
  
  // Transaction
  transactionId String?  @unique
  reference     String?
  
  // Card details (if applicable)
  cardLast4     String?
  cardBrand     String?
  
  // Status
  status        PaymentStatus @default(PENDING)
  
  // Processing
  processedAt   DateTime?
  processedBy   String?  // Staff user ID
  
  // Notes
  notes         String?
  
  createdAt     DateTime @default(now())
  
  @@index([folioId])
  @@index([method])
  @@index([status])
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  BANK_TRANSFER
  CHECK
  MOBILE_PAYMENT
  GIFT_CARD
  COMP            // Complimentary
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

// Invoice: Final billing document
model Invoice {
  id            String   @id @default(cuid())
  
  hotelId       String
  hotel         Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  folioId       String   @unique
  folio         Folio    @relation(fields: [folioId], references: [id])
  
  // Invoice details
  invoiceNumber String   @unique
  
  // Amounts
  subtotal      Float
  tax           Float
  total         Float
  
  // Status
  status        InvoiceStatus @default(DRAFT)
  
  // Dates
  issuedAt      DateTime?
  dueAt         DateTime?
  paidAt        DateTime?
  
  // PDF
  pdfUrl        String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([hotelId])
  @@index([status])
  @@index([invoiceNumber])
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

### 3.3 Optional Models (Future Phases)

**Ticketing System** (Phase 7):
```prisma
// Ticket: Service request tracking
model Ticket {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  title       String
  description String
  status      TicketStatus @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  
  reportedBy  String   // User ID
  assignedTo  String?  // Staff user ID
  
  comments    TicketComment[]
  audits      TicketAudit[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([hotelId])
  @@index([status])
  @@index([assignedTo])
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
  authorId  String   // User ID
  
  createdAt DateTime @default(now())
  
  @@index([ticketId])
}

model TicketAudit {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  action    String   // "created", "assigned", "status_changed", etc.
  oldValue  String?
  newValue  String?
  userId    String
  
  createdAt DateTime @default(now())
  
  @@index([ticketId])
}
```

**Staff Management** (Phase 6):
```prisma
// Staff Invitation: Magic link invitations
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
  
  invitedBy   String   // User ID
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([hotelId])
  @@index([email])
  @@index([status])
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
  @@index([departmentId])
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

**Knowledge Base** (Phase 8):
```prisma
// Knowledge Base: AI training data
model KnowledgeBaseSource {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  name        String
  type        String   // "file", "url", "text"
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
  embedding   Json?    // Vector embedding
  
  createdAt   DateTime @default(now())
  
  @@index([documentId])
}
```

---

## 4. Recommendations

### 4.1 Immediate Actions (This Week)

**✅ IMPLEMENT SECURITY MODELS** (3 models, 2-3 hours):
1. Add `AuditLog`, `RateLimitEntry`, `BruteForceAttempt` to schema
2. Run migration: `npx prisma migrate dev --name add-security-models`
3. Remove stubs from security services
4. Test build - should succeed for security

**Impact**: Production-ready security and compliance

---

### 4.2 PMS Decision (This Week)

**Option A: Include PMS in Current Scope**
- Add all 14 PMS models
- Keep all 19 PMS service files
- Estimated effort: 40-60 hours (full PMS implementation)
- Deliverable: Complete hotel management system

**Option B: Defer PMS to Phase 7** ⭐ **RECOMMENDED**
- Remove all PMS service files (19 files)
- Remove PMS imports from codebase (50+ files)
- Add PMS models in Phase 7 when ready
- Estimated effort: 4-6 hours (cleanup)
- Deliverable: Clean SaaS core with billing

**My Recommendation**: **Option B - Defer PMS**
- Reason: PMS is massive scope (14 models, 19 services)
- SaaS billing is already complete and working
- Better to deliver clean SaaS now, PMS later
- Reduces complexity and risk

---

### 4.3 Optional Systems (Future Phases)

**Phase 6**: Staff Management (3 models)
- Keep invitationService but mark as "coming soon"
- Implement when onboarding flow is prioritized

**Phase 7**: Ticketing System (4 models)
- Keep ticketService but return empty data
- Implement when customer support features are prioritized

**Phase 8**: Knowledge Base (4 models)
- Keep knowledgeBaseService but disable ingestion
- Implement when AI training pipeline is ready

---

## 5. Next Steps

### Step 1: Review & Approve This Proposal

**Decision Points**:
1. ✅ Add security models (AuditLog, RateLimitEntry, BruteForceAttempt)?
2. ❓ Include PMS (14 models) or defer to Phase 7?
3. ✅ Defer optional systems (Tickets, KB, Staff) to future?

### Step 2: Update Prisma Schema

Based on decisions:
- Add approved models to `prisma/schema.prisma`
- Run migration
- Verify Prisma client regenerates correctly

### Step 3: Remove Stubs

For approved models:
- Remove stub code from services
- Restore original Prisma operations
- Test functionality

### Step 4: Remove Out-of-Scope Services (If PMS deferred)

If PMS deferred:
- Delete `/lib/services/pms/*` (19 files)
- Remove PMS imports from 50+ files
- Update documentation

### Step 5: Verify Build

- Run `npm run build`
- Should succeed with only ESLint warnings
- No type errors

---

## 6. Summary Table

| System | Models | Status | Priority | Effort | Recommendation |
|--------|--------|--------|----------|--------|----------------|
| **Security & Compliance** | 3 | Missing | P1 | 2-3h | ✅ **ADD NOW** |
| **PMS Full System** | 14 | Missing | P1/P3 | 40-60h | ⏸️ **DEFER** or ✅ **ADD** |
| **Ticketing** | 4 | Missing | P3 | 8-12h | ⏸️ **DEFER** |
| **Knowledge Base** | 4 | Missing | P3 | 10-15h | ⏸️ **DEFER** |
| **Staff Management** | 3 | Missing | P2 | 6-8h | ⏸️ **DEFER** |

**Total if all added**: 28 models, 80-100 hours  
**Total if core only**: 3 models, 2-3 hours ⭐

---

## 7. Questions for Decision

1. **Is PMS part of the current deliverable?**
   - If YES → Add 14 PMS models + 40-60h implementation
   - If NO → Remove 19 PMS service files + 4-6h cleanup

2. **What is the target launch date?**
   - If < 2 weeks → Defer PMS (too much scope)
   - If > 1 month → Can consider PMS inclusion

3. **What are the must-have features for launch?**
   - SaaS billing ✅ (already done)
   - Security/audit ⚠️ (needs 3 models)
   - PMS ❓ (needs decision)

---

**End of Proposal**
