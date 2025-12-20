# AI Hotel Assistant - System Architecture

**Date**: December 16, 2025  
**Version**: 1.0 - Phase 0 Foundation Audit  
**Status**: Current State Analysis

---

## 1. System Overview

AI Hotel Assistant is a **multi-tenant SaaS platform** providing AI-powered customer service and property management system (PMS) capabilities for hotels.

### 1.1 Core Domains

```
┌─────────────────────────────────────────────────────────────┐
│                   AI HOTEL ASSISTANT                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   SaaS Core      │  │  Security Layer  │                 │
│  │  ✅ COMPLETE     │  │  ⚠️  PARTIAL     │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   PMS System     │  │  AI Assistant    │                 │
│  │  ⏳ INCOMPLETE   │  │  ✅ COMPLETE     │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Ticket System    │  │ Knowledge Base   │                 │
│  │  ⏳ INCOMPLETE   │  │  ⏳ INCOMPLETE   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: React Context + Server Components
- **Real-time**: Socket.io-client (voice/chat)

### 2.2 Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Authentication**: NextAuth.js v5
- **Database ORM**: Prisma
- **Database**: PostgreSQL

### 2.3 External Services
- **AI**: OpenAI GPT-4
- **Vector DB**: Pinecone (embeddings)
- **Payments**: Stripe
- **Voice**: Twilio (planned)
- **Email**: (TBD)

### 2.4 Infrastructure
- **Hosting**: Vercel (frontend + API)
- **Database**: PostgreSQL (cloud provider TBD)
- **CDN**: Vercel Edge Network
- **Container**: Docker (dev environment)

---

## 3. Domain Architecture

### 3.1 SaaS Core ✅ **COMPLETE**

**Purpose**: Multi-tenant subscription management and billing

**Database Models**:
- ✅ `Hotel` - Tenant root with subscription fields
- ✅ `User` - Authentication and authorization
- ✅ `SubscriptionPlan` enum - 5 pricing tiers
- ✅ `SubscriptionStatus` enum - Lifecycle states
- ✅ `UsageRecord` - Billing history tracking

**Features**:
- 5-tier subscription plans (STARTER to ENTERPRISE_MAX)
- Usage-based billing (AI messages, voice minutes, tickets, storage)
- Stripe integration ready (customer ID, subscription ID fields exist)
- Plan guard middleware (enforces feature limits)
- Usage tracking service (automatic metering)

**Status**: **Production-ready**

---

### 3.2 Security & Compliance ⚠️ **PARTIAL**

**Purpose**: Production-grade security, audit logging, rate limiting

**Current State**:
- ✅ Authentication (NextAuth.js operational)
- ✅ RBAC system (Role, Permission, UserRole models exist)
- ✅ Session management (secure, httpOnly cookies)
- ❌ **Audit logging** (model missing, service stubbed)
- ❌ **Rate limiting** (model missing, service stubbed)
- ❌ **Brute force protection** (model missing, service stubbed)

**Missing Database Models**:
- `AuditLog` - Track all security events (25+ references in code)
- `RateLimitEntry` - API endpoint rate limiting (11 references)
- `BruteForceAttempt` - Failed login tracking (11 references)

**Impact**: **BLOCKER for production deployment**
- No compliance audit trail (GDPR, SOC2 requirement)
- No API abuse protection
- No account takeover protection

**Next Phase**: Phase 1 (Security Models)

---

### 3.3 PMS System ⏳ **INCOMPLETE**

**Purpose**: Complete property management system for hotels

**Current State**:
- ✅ 19 service files implemented (front office, housekeeping, maintenance, billing)
- ❌ **ZERO database models** (all services non-functional)
- ❌ 80+ Prisma operations referencing missing models

**Missing Database Models**:

#### Front Office (Core):
- `Room` - Physical room inventory (30+ references)
- `RoomType` - Room categories/pricing (15+ references)
- `Booking` - Reservations (75+ references)
- `Guest` - Customer records (25+ references)

#### Operations:
- `RoomStatusHistory` - Audit trail for room status changes (8 references)
- `RoomAvailability` - Date-based availability tracking (12 references)

#### Housekeeping:
- `HousekeepingTask` - Daily cleaning assignments (10 references)
- `HousekeepingAssignment` - Staff assignment tracking (8 references)

#### Maintenance:
- `MaintenanceRequest` - Repair/maintenance tickets (10 references)
- `MaintenanceSchedule` - Preventive maintenance (6 references)

#### Billing:
- `Folio` - Guest billing account (8 references)
- `FolioCharge` - Individual charges (8 references)
- `Payment` - Payment transactions (6 references)
- `Invoice` - Final invoice generation (6 references)

**Service Files** (19 total):
1. `roomService.ts` - Room CRUD, status management
2. `bookingService.ts` - Reservation management
3. `guestService.ts` - Guest profile management
4. `availabilityService.ts` - Room availability queries
5. `availabilityRecalcService.ts` - Availability recalculation engine
6. `checkinService.ts` - Guest check-in workflow
7. `checkoutService.ts` - Guest checkout workflow
8. `housekeepingService.ts` - Cleaning task management
9. `housekeepingRoundService.ts` - Daily housekeeping rounds
10. `maintenanceService.ts` - Maintenance request tracking
11. `maintenanceSchedulerService.ts` - Preventive maintenance scheduling
12. `folioService.ts` - Guest billing management
13. `invoiceService.ts` - Invoice generation
14. `invoiceGeneratorService.ts` - Invoice PDF generation
15. `keyService.ts` - Room key management
16. `inventoryService.ts` - Inventory tracking
17. `qrTokenService.ts` - PMS QR code integration
18. `noShowCheckerService.ts` - No-show detection automation
19. `index.ts` - Service exports

**PMS Adapter Module**:
- `modules/pms-adapter/` - External PMS integration framework
- `pmsSyncEngine.ts` - Bidirectional sync engine (Room, Booking, Guest)

**Impact**: **PMS completely non-functional**
- Cannot manage rooms or reservations
- Cannot check in/out guests
- Cannot track housekeeping or maintenance
- Cannot generate folios or invoices

**Next Phases**: Phase 2-5 (PMS implementation)

---

### 3.4 AI Assistant ✅ **COMPLETE**

**Purpose**: AI-powered customer service chatbot

**Current State**:
- ✅ OpenAI GPT-4 integration
- ✅ Pinecone vector embeddings
- ✅ Conversation management
- ✅ Context-aware responses
- ✅ Hotel-specific knowledge

**Database Models**:
- ✅ `Conversation` - Chat session tracking
- ✅ `Message` - Individual chat messages
- ✅ Hotel-specific context (from Hotel model)

**Features**:
- Multi-turn conversations
- Streaming responses
- Voice input/output ready
- Guest and Staff modes

**Status**: **Production-ready**

---

### 3.5 Ticket System ⏳ **INCOMPLETE**

**Purpose**: Customer support ticket tracking and automation

**Current State**:
- ✅ Service files implemented (`ticketService.ts`, queue system)
- ❌ Database models missing (service non-functional)
- ❌ 40+ Prisma operations referencing missing models

**Missing Database Models**:
- `Ticket` - Support ticket tracking (40+ references)
- `TicketComment` - Threaded comments (5 references)
- `TicketAudit` - Status change audit trail (3 references)
- `TicketAutomationRun` - Automation execution logs (2 references)

**Features** (stubbed):
- Ticket creation and assignment
- Priority and status management
- Automated escalation rules
- SLA tracking
- Queue management

**Impact**: **Ticket system non-functional**
- Cannot track service requests
- No automation workflows
- Usage tracking for tickets exists but has no data

**Next Phase**: Phase 7+ (Optional - can defer)

---

### 3.6 Knowledge Base ⏳ **INCOMPLETE**

**Purpose**: AI training data management and document ingestion

**Current State**:
- ✅ Service files implemented (`knowledgeBaseService.ts`, queue system)
- ❌ Database models missing (service non-functional)
- ❌ 30+ Prisma operations referencing missing models

**Missing Database Models**:
- `KnowledgeBaseSource` - Data sources (file, URL, text) (8 references)
- `KnowledgeBaseDocument` - Ingested documents (12 references)
- `KnowledgeBaseChunk` - Document chunks for embeddings (6 references)
- `KnowledgeBaseSyncJob` - Background sync jobs (4 references)

**Features** (stubbed):
- Document ingestion (PDF, DOCX, TXT, CSV, JSON)
- Automatic chunking for embeddings
- Pinecone vector sync
- Source management
- Background processing queues

**Impact**: **AI training pipeline non-functional**
- Cannot ingest custom hotel knowledge
- Cannot improve AI responses with hotel-specific data
- Generic AI responses only

**Next Phase**: Phase 8+ (Optional - can defer)

---

### 3.7 Staff Management ⏳ **INCOMPLETE**

**Purpose**: Staff onboarding and profile management

**Current State**:
- ✅ Service file implemented (`invitationService.ts`)
- ❌ Database models missing (service non-functional)
- ❌ 15+ Prisma operations referencing missing models

**Missing Database Models**:
- `StaffInvitation` - Magic link invitations (15+ references)
- `StaffProfile` - Staff profiles (5 references)
- `Department` - Organizational structure (3 references)

**Features** (stubbed):
- Magic link staff invitations
- Email-based onboarding
- Department assignment
- Role-based access control integration

**Impact**: **Staff onboarding broken**
- Cannot send invitation emails
- Staff must be created manually
- ✅ Authentication still works (User model exists)

**Next Phase**: Phase 6 (Optional - defer if manual onboarding acceptable)

---

## 4. Multi-Tenancy Architecture

### 4.1 Tenant Isolation

**Root Model**: `Hotel`
- Every major entity has `hotelId` foreign key
- All queries filtered by `hotelId`
- Cascade delete on hotel deletion

**Tenant Context**:
```typescript
// Extracted from session
const hotel = await getHotel(session.user.hotelId)

// All queries scoped to hotel
prisma.booking.findMany({ 
  where: { hotelId: hotel.id } 
})
```

### 4.2 Data Isolation Strategy

**Level 1 - Logical Isolation** (Current):
- Single database
- `hotelId` on all tenant-scoped tables
- Row-level security via ORM

**Level 2 - Schema Isolation** (Future):
- Separate PostgreSQL schema per tenant
- `tenant_123.bookings` vs `tenant_456.bookings`

**Level 3 - Physical Isolation** (Enterprise):
- Separate database per enterprise customer
- Full data sovereignty

---

## 5. Authentication & Authorization

### 5.1 Authentication (NextAuth.js)

**Providers**:
- ✅ Credentials (email/password)
- ✅ OAuth ready (Google, GitHub)
- ✅ Magic links ready

**Session Management**:
- ✅ Secure session cookies (httpOnly, sameSite)
- ✅ Session token rotation
- ✅ Auto-logout on suspicious activity

### 5.2 Authorization (RBAC)

**Database Models** (✅ Complete):
- `Role` - System roles (admin, manager, staff, guest)
- `Permission` - Granular permissions (e.g., `booking:create`)
- `RolePermission` - Role-permission mapping
- `UserRole` - User-role assignment

**Middleware**:
- ✅ `requirePermission()` - API route protection
- ✅ `requireRole()` - Role-based guards
- ✅ Server-side permission checks

### 5.3 QR Code Authentication

**Purpose**: Passwordless guest/staff authentication

**Database Model**:
- ✅ `GuestStaffQRToken` - QR token storage

**Features**:
- ✅ Short-lived tokens (15 min default)
- ✅ Single-use tokens
- ✅ Secure token hashing (bcrypt)
- ✅ Guest and Staff modes
- ✅ Booking association

**Status**: **Fully functional**

---

## 6. API Architecture

### 6.1 API Routes Structure

```
/api/
├── auth/              # NextAuth.js endpoints
├── admin/             # Admin-only endpoints
├── staff/             # Staff endpoints (invitations, tickets)
├── guest/             # Guest-facing endpoints
├── pms/               # PMS operations (booking, rooms, etc.)
├── billing/           # Subscription and billing
├── chat/              # AI chat endpoints
└── webhooks/          # External webhooks (Stripe, etc.)
```

### 6.2 API Protection Layers

1. **Authentication** - `getServerSession()` verifies JWT
2. **Multi-tenancy** - Extract `hotelId` from session
3. **Authorization** - Check permissions via RBAC
4. **Rate Limiting** - ⚠️ Not implemented (Phase 1)
5. **Plan Guards** - Check subscription limits
6. **Audit Logging** - ⚠️ Not implemented (Phase 1)

### 6.3 Current API Status

| Route | Auth | RBAC | Rate Limit | Audit | Plan Guard |
|-------|------|------|------------|-------|------------|
| `/api/auth/*` | ✅ | N/A | ❌ | ❌ | N/A |
| `/api/admin/*` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `/api/staff/*` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `/api/guest/*` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `/api/pms/*` | ✅ | ✅ | ❌ | ❌ | ⚠️ (models missing) |
| `/api/billing/*` | ✅ | ✅ | ❌ | ❌ | N/A |
| `/api/chat/*` | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 7. Database Architecture

### 7.1 Current Schema Status

**Total Models**: 14 (as of Phase 0)

**✅ Complete Domains** (14 models):
1. Multi-tenancy: `Hotel`
2. Authentication: `User`, `Account`, `Session`
3. Authorization: `Role`, `Permission`, `RolePermission`, `UserRole`
4. AI Assistant: `Conversation`, `Message`
5. QR Auth: `GuestStaffQRToken`
6. Billing: `UsageRecord`
7. Enums: `SubscriptionPlan`, `SubscriptionStatus`

**❌ Missing Domains** (28+ models needed):
- Security: 3 models (AuditLog, RateLimitEntry, BruteForceAttempt)
- PMS: 14 models (Room, Booking, Guest, Housekeeping, Maintenance, Billing)
- Tickets: 4 models (Ticket, TicketComment, TicketAudit, TicketAutomationRun)
- Knowledge Base: 4 models (KBSource, KBDocument, KBChunk, KBSyncJob)
- Staff Management: 3 models (StaffInvitation, StaffProfile, Department)

### 7.2 Database Provider

**Current**: PostgreSQL
- Multi-tenant via `hotelId` column
- JSONB support for flexible fields
- Full-text search capabilities
- Vector extension ready (pgvector for embeddings)

### 7.3 ORM Strategy

**Prisma**:
- Type-safe queries
- Auto-generated TypeScript types
- Migration management
- Connection pooling

**Best Practices** (Current):
- ✅ All writes in transactions where needed
- ✅ Proper indexes on foreign keys
- ✅ Cascade deletes for tenant data
- ⚠️ No soft deletes (add in Phase 8)
- ⚠️ No row-level security (RLS) - relying on ORM filtering

---

## 8. Real-Time Architecture

### 8.1 Socket.io Integration

**Client**: `socket.io-client` installed
**Server**: Socket.io server (TBD - needs implementation)

**Use Cases**:
- Real-time chat updates
- Voice call signaling
- Ticket notifications
- Room status updates
- Availability changes

**Status**: **Partially implemented** (client-side only)

---

## 9. File Structure

```
AI-HOTEL-ASSISTANT/
├── app/                        # Next.js 14 App Router
│   ├── (auth)/                # Auth routes
│   ├── (dashboard)/           # Main app
│   ├── api/                   # API routes
│   ├── settings/              # User settings
│   │   └── billing/           # ✅ Billing UI (NEW)
│   └── widget/                # Embedded widget
├── components/                # React components
│   ├── ui/                    # Shadcn/ui base components
│   ├── billing/               # ✅ Billing components (NEW)
│   └── [domain]/              # Domain-specific components
├── lib/                       # Shared libraries
│   ├── auth/                  # Authentication utilities
│   ├── security/              # ⚠️ Security services (stubbed)
│   ├── services/              # Business logic
│   │   ├── pms/               # ⚠️ PMS services (19 files, non-functional)
│   │   ├── audit/             # ⚠️ Audit service (stubbed)
│   │   ├── adminService.ts    # ✅ Admin operations
│   │   ├── ticketService.ts   # ⚠️ Ticket service (non-functional)
│   │   ├── invitationService.ts # ⚠️ Invitation service (stubbed)
│   │   └── knowledgeBaseService.ts # ⚠️ KB service (stubbed)
│   ├── queues/                # Background job queues
│   └── db/                    # Database client
├── modules/                   # Feature modules
│   └── pms-adapter/           # ⚠️ External PMS adapter (non-functional)
├── prisma/                    # Database
│   ├── schema.prisma          # ⚠️ 14 models (28+ missing)
│   └── migrations/            # Migration history
├── tests/                     # Test suite
├── docs/                      # Documentation (NEW - Phase 0)
└── public/                    # Static assets
```

---

## 10. Critical Issues & Blockers

### 10.1 Build Status: ❌ **FAILING**

**Root Cause**: 80+ TypeScript errors due to missing Prisma models

**Error Pattern**:
```
Type error: Property 'room' does not exist on type 'PrismaClient'
Type error: Property 'booking' does not exist on type 'PrismaClient'
Type error: Property 'auditLog' does not exist on type 'PrismaClient'
```

**Impact**: Cannot deploy to production

---

### 10.2 Security Vulnerabilities

**Critical** (Phase 1 Priority):
1. ❌ No audit logging - Cannot track security events
2. ❌ No rate limiting - APIs vulnerable to abuse
3. ❌ No brute force protection - Login endpoints vulnerable

**Impact**: **Unacceptable for production deployment**

---

### 10.3 PMS System Status

**Impact**: 19 service files are **theoretical code only**
- All PMS APIs return errors
- Cannot demonstrate hotel management capabilities
- SaaS product incomplete

**Decision Required**:
- **Option A**: Implement full PMS (14 models, 40-60h effort) - Phases 2-5
- **Option B**: Remove PMS services, defer to future (4-6h cleanup)

**Current Plan**: Option A - Implement PMS (Phases 2-5)

---

### 10.4 Stubbed Services

**Services with Stub Implementations**:
1. `lib/security/rateLimiter.ts` - 5 functions stubbed
2. `lib/security/sessionHijackingPrevention.ts` - Type fixes
3. `lib/services/audit/auditLogger.ts` - 13 functions stubbed (all return empty arrays)
4. `lib/services/invitationService.ts` - 11 functions stubbed (throw "not implemented")
5. `lib/services/knowledgeBaseService.ts` - 7 functions stubbed (throw errors)
6. `lib/services/pms/*` - Multiple functions partially stubbed

**Impact**: **Technical debt** - Stubs must be replaced with real implementations

---

## 11. Deployment Status

### 11.1 Environment Configuration

**Required Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=https://yourapp.com
NEXTAUTH_SECRET=xxx

# OpenAI
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=xxx
PINECONE_INDEX=xxx

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 11.2 Deployment Readiness

| Component | Status | Blocker |
|-----------|--------|---------|
| Frontend | ✅ Ready | None |
| API Routes | ✅ Ready | None |
| Database | ⚠️ Partial | Missing 28 models |
| Authentication | ✅ Ready | None |
| Authorization | ✅ Ready | None |
| Security | ❌ Not Ready | Audit, rate limit, brute force |
| PMS | ❌ Not Ready | 14 models missing |
| AI Assistant | ✅ Ready | None |
| Billing UI | ✅ Ready | None |
| **Build** | ❌ **FAILING** | TypeScript errors |

**Verdict**: **NOT READY for production**

---

## 12. Phase 0 Completion Summary

### 12.1 Audit Results

**Codebase Scanned**:
- 150+ files analyzed
- 100+ Prisma references identified
- 28+ missing models documented
- 19 PMS service files inventoried

**Technical Debt**:
- 80+ TypeScript errors
- 7 services with stub implementations
- Build failing for 24+ hours

### 12.2 Dependency Map

**Domain Dependencies** (detailed in `model-gap-report.md`):
1. **Security** → 3 models → 25+ files
2. **PMS** → 14 models → 80+ files
3. **Tickets** → 4 models → 15+ files
4. **Knowledge Base** → 4 models → 10+ files
5. **Staff Management** → 3 models → 15+ files

### 12.3 Next Steps

**Phase 1** (Immediate - 2-3 hours):
- Add 3 security models (AuditLog, RateLimitEntry, BruteForceAttempt)
- Remove security service stubs
- Achieve green build for security

**Phase 2-5** (PMS Implementation - 40-60 hours):
- Phase 2: Add 5 core PMS models (schema only)
- Phase 3: Implement booking engine
- Phase 4: Housekeeping & maintenance
- Phase 5: Billing & folios

**Phase 6-9** (Hardening & Features):
- Phase 6: AI + PMS integration
- Phase 7: External PMS adapters
- Phase 8: Performance & scale
- Phase 9: Feature gating & finalization

---

## 13. Conclusion

AI Hotel Assistant has a **solid foundation**:
- ✅ Modern tech stack (Next.js 14, Prisma, TypeScript)
- ✅ Multi-tenant architecture
- ✅ Complete authentication & authorization
- ✅ Working AI assistant
- ✅ Subscription & billing system

**Critical Gaps**:
- ❌ Security models missing (BLOCKER)
- ❌ PMS system incomplete (14 models needed)
- ❌ Build failing (80+ TypeScript errors)

**Path Forward**: Execute Phases 0-9 sequentially
- Each phase ends with green build
- No breaking changes
- Incremental delivery
- Production-ready at Phase 9

**Current Status**: **Phase 0 Complete** ✅  
**Next**: Phase 1 - Implement Security Models

---

**Document End**
