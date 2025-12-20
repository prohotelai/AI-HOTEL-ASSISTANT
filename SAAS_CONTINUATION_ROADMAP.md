# 🚀 AI HOTEL ASSISTANT - SaaS CONTINUATION ROADMAP

**Date**: December 13, 2025  
**Current Status**: Phase 5.7 Complete (Secure API Integration ✅)  
**Next Phase**: Phase 6 - Production Readiness & Feature Completion  

---

## 📊 CURRENT STATE ASSESSMENT

### ✅ **ALREADY COMPLETED** (Session 5.7.1)

1. **OpenAI Integration** - ✅ Real API calls implemented (not mocked anymore)
2. **Pinecone Vector Search** - ✅ Multi-tenant semantic search ready
3. **Redis/Upstash Cache** - ✅ Caching, queues, rate limiting, pub/sub
4. **Resend Email** - ✅ 5 production email templates ready
5. **Stripe Payments** - ✅ Payment intents, webhooks, refunds
6. **Environment Management** - ✅ Secure .env system with validation
7. **Startup Verification** - ✅ Health checks for all services
8. **Health Endpoint** - ✅ GET /api/health for monitoring

**Status**: 3 of 4 critical blockers resolved ✅

---

## 🎯 REMAINING CRITICAL BLOCKERS

### ❌ **BLOCKER #1: RBAC Middleware Enforcement** (Week 1)

**Problem**: Permission system exists but not enforced on 70% of API routes. Anyone with valid session can access any resource within their hotel.

**Impact**: Security vulnerability - staff members can access admin functions

**Solution Required**:
```typescript
// Create middleware wrapper
// File: lib/middleware/rbac.ts (NEW)

export function withPermission(permission: Permission) {
  return async (req: NextRequest, handler: Function) => {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401})
    
    const hasAccess = await hasPermission(session.user.id, permission, session.user.hotelId)
    if (!hasAccess) return NextResponse.json({error: 'Forbidden'}, {status: 403})
    
    return handler(req)
  }
}

// Usage in routes:
export const GET = withPermission(Permission.TICKETS_VIEW)(async (req) => {
  // ... actual handler
})
```

**Files to Modify** (25+ routes):
- `app/api/pms/**/route.ts` (10 routes)
- `app/api/tickets/**/route.ts` (5 routes)
- `app/api/knowledge-base/**/route.ts` (3 routes)
- `app/api/admin/**/route.ts` (7 routes)

**Effort**: 8-12 hours (1.5 days)  
**Priority**: 🔴 CRITICAL - Must be done before production  

---

## 🚀 PHASE 6: PRODUCTION READINESS (Weeks 1-2)

### **Week 1 - Security & Core Features**

#### **Task 1: Implement RBAC Middleware** (Days 1-2) - CRITICAL
- [ ] Create `lib/middleware/rbac.ts` with permission wrapper
- [ ] Add RBAC checks to all PMS routes (10 files)
- [ ] Add RBAC checks to ticket routes (5 files)
- [ ] Add RBAC checks to knowledge base routes (3 files)
- [ ] Add RBAC checks to admin routes (7 files)
- [ ] Test permission denial (403 responses)
- [ ] Test permission hierarchy (owner > manager > staff)
- [ ] Update API documentation with permission requirements

**Verification**:
```bash
# Test as non-admin user
curl -X DELETE http://localhost:3000/api/admin/users/123 \
  -H "Cookie: next-auth.session-token=staff-token"
# Should return: 403 Forbidden

# Test as admin user
curl -X DELETE http://localhost:3000/api/admin/users/123 \
  -H "Cookie: next-auth.session-token=admin-token"
# Should return: 200 OK
```

**Files**:
- `lib/middleware/rbac.ts` (NEW - 150 lines)
- 25+ route files (MODIFY - add permission checks)

---

#### **Task 2: Fix Test Failures** (Days 2-3) - HIGH
**Current**: 262/356 tests passing (74 failing)

**Known Issues**:
- Session token format mismatches in auth tests (18 failures)
- Mock database setup issues in service tests (12 failures)
- RBAC permission check failures (20 failures)
- Email service mock errors (8 failures)
- Async queue timing issues (16 failures)

**Action Plan**:
- [ ] Audit all failing tests: `npm test -- --reporter=verbose > test-results.txt`
- [ ] Fix auth token tests (standardize JWT format)
- [ ] Update mock database to match schema
- [ ] Add RBAC test fixtures with proper permissions
- [ ] Mock email service calls properly
- [ ] Add delays for async queue tests
- [ ] Re-run full suite: `npm test`
- [ ] Achieve 95%+ pass rate (340+/356 tests)

**Verification**:
```bash
npm test -- --coverage
# Target: 340+ passing, <16 failures
```

**Effort**: 6-8 hours  
**Priority**: 🟡 HIGH - Blocks CI/CD confidence  

---

#### **Task 3: PDF Invoice Generation** (Day 3) - HIGH

**Problem**: Invoice data exists but can't be downloaded as PDF

**Solution**: Use `pdfkit` to generate PDF invoices

**Implementation**:
```typescript
// lib/services/pms/pdfService.ts (NEW)
import PDFDocument from 'pdfkit'

export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    
    // Header
    doc.fontSize(20).text('INVOICE', { align: 'center' })
    doc.moveDown()
    
    // Invoice details
    doc.fontSize(12)
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`)
    doc.text(`Date: ${invoice.issueDate.toLocaleDateString()}`)
    doc.text(`Guest: ${invoice.guest.name}`)
    doc.moveDown()
    
    // Line items
    doc.fontSize(10)
    invoice.items.forEach(item => {
      doc.text(`${item.description}: $${item.amount.toFixed(2)}`)
    })
    doc.moveDown()
    
    // Total
    doc.fontSize(14).text(`Total: $${invoice.totalAmount.toFixed(2)}`, {
      align: 'right'
    })
    
    doc.end()
  })
}
```

**Files**:
- `lib/services/pms/pdfService.ts` (NEW - 200 lines)
- `app/api/pms/invoices/[id]/pdf/route.ts` (NEW - 50 lines)
- `lib/services/pms/invoiceService.ts` (MODIFY - add PDF generation)

**Dependencies**:
```bash
npm install pdfkit @types/pdfkit
```

**Verification**:
```bash
curl http://localhost:3000/api/pms/invoices/123/pdf \
  -H "Authorization: Bearer $TOKEN" \
  --output invoice.pdf

# Should download PDF file
```

**Effort**: 6-8 hours  
**Priority**: 🟡 HIGH - Customer-facing feature  

---

### **Week 2 - PMS Integration & Analytics**

#### **Task 4: First Real PMS Adapter - Mews** (Days 4-5) - CRITICAL

**Problem**: Only mock PMS provider exists. Cannot connect to real hotels.

**Solution**: Implement Mews PMS adapter (most popular cloud PMS)

**Mews API Documentation**: https://mews-systems.gitbook.io/connector-api/

**Implementation**:
```typescript
// lib/pms/providers/mewsProvider.ts (NEW)
import { PMSProvider, Booking, Room, Guest } from '../types'

export class MewsPMSProvider implements PMSProvider {
  private apiUrl: string
  private accessToken: string
  
  constructor(config: { apiUrl: string; accessToken: string }) {
    this.apiUrl = config.apiUrl
    this.accessToken = config.accessToken
  }
  
  async getBookings(startDate: Date, endDate: Date): Promise<Booking[]> {
    const response = await fetch(`${this.apiUrl}/reservations/getAll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': this.accessToken
      },
      body: JSON.stringify({
        StartUtc: startDate.toISOString(),
        EndUtc: endDate.toISOString()
      })
    })
    
    const data = await response.json()
    return data.Reservations.map(this.mapMewsBooking)
  }
  
  async getRooms(): Promise<Room[]> {
    // Implement room fetching
  }
  
  async getGuests(): Promise<Guest[]> {
    // Implement guest fetching
  }
  
  async createBooking(booking: Booking): Promise<string> {
    // Implement booking creation
  }
  
  async updateBooking(id: string, updates: Partial<Booking>): Promise<void> {
    // Implement booking update
  }
  
  async cancelBooking(id: string): Promise<void> {
    // Implement cancellation
  }
  
  private mapMewsBooking(mewsRes: any): Booking {
    // Map Mews format to internal format
  }
}

// Register provider
import { registerProvider } from '../registry'
registerProvider('mews', MewsPMSProvider)
```

**Files**:
- `lib/pms/providers/mewsProvider.ts` (NEW - 300 lines)
- `lib/pms/registry.ts` (MODIFY - register Mews)
- `app/api/pms/providers/mews/webhook/route.ts` (NEW - webhook handler)

**Configuration**:
```bash
# Add to .env.local
MEWS_API_URL=https://api.mews.com
MEWS_ACCESS_TOKEN=your-mews-token
```

**Verification**:
```typescript
// Test in console or test file
import { getProvider } from '@/lib/pms/registry'

const mews = getProvider('mews', {
  apiUrl: process.env.MEWS_API_URL,
  accessToken: process.env.MEWS_ACCESS_TOKEN
})

const bookings = await mews.getBookings(new Date(), new Date())
console.log(bookings) // Should return real Mews bookings
```

**Effort**: 12-16 hours  
**Priority**: 🔴 CRITICAL - System becomes production-ready  

---

#### **Task 5: Implement Real Analytics** (Days 6-7) - MEDIUM

**Problem**: Analytics dashboard shows placeholder/mock data

**Solution**: Aggregate real data from database

**Implementation**:
```typescript
// lib/services/analyticsService.ts (NEW)

export async function getConversationAnalytics(hotelId: string, period: 'day' | 'week' | 'month') {
  const startDate = getStartDate(period)
  
  // Total conversations
  const totalConversations = await prisma.conversation.count({
    where: { hotelId, createdAt: { gte: startDate } }
  })
  
  // Average messages per conversation
  const avgMessages = await prisma.message.groupBy({
    by: ['conversationId'],
    where: { conversation: { hotelId }, createdAt: { gte: startDate } },
    _count: { id: true }
  })
  
  // Conversations by hour (for chart)
  const conversationsByHour = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('hour', "createdAt") as hour,
      COUNT(*) as count
    FROM "Conversation"
    WHERE "hotelId" = ${hotelId}
      AND "createdAt" >= ${startDate}
    GROUP BY hour
    ORDER BY hour
  `
  
  return {
    totalConversations,
    avgMessagesPerConversation: avgMessages.length > 0 
      ? avgMessages.reduce((sum, g) => sum + g._count.id, 0) / avgMessages.length 
      : 0,
    conversationsByHour
  }
}

export async function getTicketAnalytics(hotelId: string, period: string) {
  // Ticket resolution time
  const resolvedTickets = await prisma.ticket.findMany({
    where: {
      hotelId,
      status: 'RESOLVED',
      resolvedAt: { not: null },
      createdAt: { gte: getStartDate(period) }
    },
    select: { createdAt: true, resolvedAt: true }
  })
  
  const avgResolutionTime = resolvedTickets.length > 0
    ? resolvedTickets.reduce((sum, t) => {
        return sum + (t.resolvedAt!.getTime() - t.createdAt.getTime())
      }, 0) / resolvedTickets.length / (1000 * 60 * 60) // hours
    : 0
  
  // Tickets by status
  const ticketsByStatus = await prisma.ticket.groupBy({
    by: ['status'],
    where: { hotelId, createdAt: { gte: getStartDate(period) } },
    _count: { id: true }
  })
  
  // Tickets by priority
  const ticketsByPriority = await prisma.ticket.groupBy({
    by: ['priority'],
    where: { hotelId, createdAt: { gte: getStartDate(period) } },
    _count: { id: true }
  })
  
  return {
    avgResolutionTimeHours: avgResolutionTime,
    ticketsByStatus: Object.fromEntries(
      ticketsByStatus.map(t => [t.status, t._count.id])
    ),
    ticketsByPriority: Object.fromEntries(
      ticketsByPriority.map(t => [t.priority, t._count.id])
    )
  }
}

export async function getKnowledgeBaseAnalytics(hotelId: string) {
  const totalDocuments = await prisma.knowledgeBaseDocument.count({
    where: { source: { hotelId } }
  })
  
  const totalChunks = await prisma.knowledgeBaseChunk.count({
    where: { document: { source: { hotelId } } }
  })
  
  // Most queried documents (from retrieval logs)
  const popularDocs = await prisma.$queryRaw`
    SELECT 
      d.id,
      d.title,
      COUNT(*) as query_count
    FROM "KnowledgeBaseChunk" c
    JOIN "KnowledgeBaseDocument" d ON c."documentId" = d.id
    JOIN "KnowledgeBaseSource" s ON d."sourceId" = s.id
    WHERE s."hotelId" = ${hotelId}
    GROUP BY d.id, d.title
    ORDER BY query_count DESC
    LIMIT 10
  `
  
  return {
    totalDocuments,
    totalChunks,
    avgChunksPerDocument: totalDocuments > 0 ? totalChunks / totalDocuments : 0,
    popularDocuments: popularDocs
  }
}
```

**Update API Route**:
```typescript
// app/api/analytics/route.ts (REPLACE placeholder)
import { getConversationAnalytics, getTicketAnalytics, getKnowledgeBaseAnalytics } from '@/lib/services/analyticsService'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'week'
  
  const [conversations, tickets, knowledgeBase] = await Promise.all([
    getConversationAnalytics(session.user.hotelId, period as any),
    getTicketAnalytics(session.user.hotelId, period),
    getKnowledgeBaseAnalytics(session.user.hotelId)
  ])
  
  return NextResponse.json({
    conversations,
    tickets,
    knowledgeBase,
    period,
    generatedAt: new Date().toISOString()
  })
}
```

**Files**:
- `lib/services/analyticsService.ts` (NEW - 300 lines)
- `app/api/analytics/route.ts` (REPLACE - 100 lines)
- `app/dashboard/analytics/page.tsx` (MODIFY - use real data)

**Verification**:
```bash
curl http://localhost:3000/api/analytics?period=week \
  -H "Cookie: next-auth.session-token=$TOKEN"

# Should return real aggregated data
```

**Effort**: 8-10 hours  
**Priority**: 🟡 MEDIUM - Dashboard becomes useful  

---

## 🎨 PHASE 7: FEATURE COMPLETION (Weeks 3-4)

### **Task 6: Rate Plan & Dynamic Pricing** (Days 8-9)

**Implementation**:
```typescript
// lib/services/pms/pricingService.ts (NEW)

export interface RatePlan {
  id: string
  name: string
  baseMarkup: number // percentage
  conditions: PricingCondition[]
}

export interface PricingCondition {
  type: 'seasonal' | 'occupancy' | 'advance_booking' | 'length_of_stay'
  modifier: number // percentage adjustment
  criteria: any
}

export async function calculateRoomPrice(
  roomTypeId: string,
  ratePlanId: string,
  checkIn: Date,
  checkOut: Date,
  hotelId: string
): Promise<number> {
  // Get base price
  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId }
  })
  
  if (!roomType) throw new Error('Room type not found')
  
  let basePrice = roomType.basePrice
  
  // Apply rate plan
  const ratePlan = await prisma.ratePlan.findUnique({
    where: { id: ratePlanId },
    include: { conditions: true }
  })
  
  if (ratePlan) {
    basePrice *= (1 + ratePlan.baseMarkup / 100)
    
    // Apply conditions
    for (const condition of ratePlan.conditions) {
      const adjustment = evaluateCondition(condition, checkIn, checkOut, hotelId)
      basePrice *= (1 + adjustment / 100)
    }
  }
  
  // Calculate total (nights * price)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  return basePrice * nights
}

function evaluateCondition(
  condition: PricingCondition,
  checkIn: Date,
  checkOut: Date,
  hotelId: string
): number {
  switch (condition.type) {
    case 'seasonal':
      // Check if dates fall in high/low season
      return isHighSeason(checkIn) ? condition.modifier : 0
    
    case 'occupancy':
      // Higher price if hotel is >80% full
      const occupancy = getCurrentOccupancy(hotelId)
      return occupancy > 0.8 ? condition.modifier : 0
    
    case 'advance_booking':
      // Discount for booking X days in advance
      const daysInAdvance = (checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return daysInAdvance > condition.criteria.minDays ? condition.modifier : 0
    
    case 'length_of_stay':
      // Discount for longer stays
      const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      return nights >= condition.criteria.minNights ? condition.modifier : 0
    
    default:
      return 0
  }
}
```

**Database Schema Update**:
```prisma
// Add to schema.prisma
model RatePlan {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  name        String
  description String?
  baseMarkup  Float    @default(0) // percentage
  isActive    Boolean  @default(true)
  conditions  PricingCondition[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([hotelId])
}

model PricingCondition {
  id         String   @id @default(cuid())
  ratePlanId String
  ratePlan   RatePlan @relation(fields: [ratePlanId], references: [id], onDelete: Cascade)
  type       String   // 'seasonal', 'occupancy', 'advance_booking', 'length_of_stay'
  modifier   Float    // percentage adjustment
  criteria   Json     // flexible criteria storage
  createdAt  DateTime @default(now())
  
  @@index([ratePlanId])
}
```

**Migration**:
```bash
npx prisma migrate dev --name add_rate_plans
```

**Files**:
- `lib/services/pms/pricingService.ts` (NEW - 250 lines)
- `prisma/schema.prisma` (ADD models)
- `app/api/pms/rate-plans/route.ts` (NEW - CRUD endpoints)
- `lib/services/pms/availabilityService.ts` (MODIFY - use pricing service)

**Effort**: 8-10 hours  
**Priority**: 🟢 MEDIUM - Revenue optimization feature  

---

### **Task 7: Email Invoice Delivery** (Day 10)

**Implementation**:
```typescript
// Modify lib/services/pms/invoiceService.ts

import { sendInvoiceEmail } from '@/lib/email'
import { generateInvoicePDF } from './pdfService'
import { addEmailToQueue } from '@/lib/queues/emailQueue'

export async function generateAndSendInvoice(
  bookingId: string,
  hotelId: string
): Promise<{ invoiceId: string; emailSent: boolean }> {
  // Generate invoice record
  const invoice = await generateInvoice(bookingId, hotelId)
  
  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(invoice)
  
  // Store PDF (if using S3, upload here)
  const pdfUrl = await storePDF(pdfBuffer, invoice.invoiceNumber)
  
  // Update invoice with PDF URL
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdfUrl }
  })
  
  // Send email with PDF attachment
  const emailSent = await sendInvoiceEmail(
    invoice.guest.email,
    invoice.guest.name,
    invoice.invoiceNumber,
    invoice.totalAmount,
    pdfUrl
  )
  
  // Log audit
  await prisma.invoiceAudit.create({
    data: {
      invoiceId: invoice.id,
      action: 'EMAIL_SENT',
      details: { email: invoice.guest.email, success: emailSent }
    }
  })
  
  return { invoiceId: invoice.id, emailSent }
}
```

**Files**:
- `lib/services/pms/invoiceService.ts` (MODIFY - add email sending)
- `lib/queues/emailQueue.ts` (MODIFY - handle invoice emails)

**Verification**:
```bash
# Trigger invoice generation
curl -X POST http://localhost:3000/api/pms/bookings/123/invoice \
  -H "Authorization: Bearer $TOKEN"

# Check email inbox for invoice PDF
```

**Effort**: 4-6 hours  
**Priority**: 🟢 MEDIUM - Automation feature  

---

### **Task 8: Two-Factor Authentication (2FA)** (Days 11-12)

**Implementation**:
```typescript
// lib/security/mfa.ts (NEW)
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export async function generateMFASecret(userId: string): Promise<{
  secret: string
  qrCode: string
  backupCodes: string[]
}> {
  const secret = authenticator.generateSecret()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  
  if (!user) throw new Error('User not found')
  
  // Generate QR code
  const otpauth = authenticator.keyuri(user.email, 'AI Hotel Assistant', secret)
  const qrCode = await QRCode.toDataURL(otpauth)
  
  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () => 
    Math.random().toString(36).substring(2, 10).toUpperCase()
  )
  
  // Store secret (encrypted)
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaSecret: secret, // Should encrypt this
      mfaBackupCodes: backupCodes.join(','), // Should encrypt
      mfaEnabled: false // User must verify first
    }
  })
  
  return { secret, qrCode, backupCodes }
}

export async function verifyMFAToken(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true }
  })
  
  if (!user || !user.mfaSecret) return false
  
  return authenticator.verify({ token, secret: user.mfaSecret })
}

export async function enableMFA(userId: string, verificationToken: string): Promise<boolean> {
  const isValid = await verifyMFAToken(userId, verificationToken)
  
  if (!isValid) return false
  
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true }
  })
  
  return true
}
```

**Update Auth Flow**:
```typescript
// lib/auth.ts (MODIFY authorize callback)

authorize: async (credentials) => {
  // ... existing email/password check
  
  if (user && isPasswordValid) {
    // Check if MFA enabled
    if (user.mfaEnabled) {
      if (!credentials.mfaToken) {
        throw new Error('MFA_REQUIRED')
      }
      
      const isMFAValid = await verifyMFAToken(user.id, credentials.mfaToken)
      if (!isMFAValid) {
        throw new Error('Invalid MFA token')
      }
    }
    
    return user
  }
  
  return null
}
```

**Database Schema**:
```prisma
model User {
  // ... existing fields
  mfaEnabled     Boolean  @default(false)
  mfaSecret      String?  // TOTP secret (should be encrypted)
  mfaBackupCodes String?  // Comma-separated backup codes
}
```

**Migration**:
```bash
npx prisma migrate dev --name add_mfa_fields
```

**Files**:
- `lib/security/mfa.ts` (NEW - 200 lines)
- `lib/auth.ts` (MODIFY - add MFA check)
- `app/api/auth/mfa/route.ts` (NEW - MFA management endpoints)
- `app/settings/security/page.tsx` (NEW - MFA setup UI)
- `prisma/schema.prisma` (ADD fields)

**Dependencies**:
```bash
npm install otplib qrcode @types/qrcode
```

**Verification**:
```bash
# Setup MFA
curl -X POST http://localhost:3000/api/auth/mfa/setup \
  -H "Cookie: next-auth.session-token=$TOKEN"

# Returns QR code and backup codes

# Verify and enable
curl -X POST http://localhost:3000/api/auth/mfa/enable \
  -H "Cookie: next-auth.session-token=$TOKEN" \
  -d '{"token": "123456"}'

# Login with MFA
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -d 'email=user@example.com&password=pass&mfaToken=123456'
```

**Effort**: 8-10 hours  
**Priority**: 🟢 MEDIUM - Security enhancement  

---

## 🚀 PHASE 8: ENHANCEMENT FEATURES (Weeks 5+)

### **Task 9: Mobile App Offline Sync** (Optional)

**Implementation**: Service worker + IndexedDB + background sync

**Effort**: 12-16 hours  
**Priority**: 🔵 LOW - Nice to have  

---

### **Task 10: Website Auto-Scanning** (Optional)

**Implementation**: Puppeteer crawler + content extraction + KB auto-population

**Effort**: 16-20 hours  
**Priority**: 🔵 LOW - Automation feature  

---

### **Task 11: Channel Manager Integration** (Optional)

**Implementation**: Booking.com, Airbnb API adapters

**Effort**: 20+ hours per channel  
**Priority**: 🔵 LOW - Phase 2 feature  

---

### **Task 12: Real-time WebSocket Chat** (Optional)

**Implementation**: Socket.io + presence tracking

**Effort**: 8-12 hours  
**Priority**: 🔵 LOW - UX enhancement  

---

## 📅 EXECUTION TIMELINE

### **Week 1: Security & Core** (40 hours)
- **Days 1-2**: RBAC middleware enforcement (12h)
- **Days 2-3**: Fix test failures (8h)
- **Day 3**: PDF invoice generation (8h)
- **Days 4-5**: Buffer/catch-up (12h)

### **Week 2: Integration & Analytics** (40 hours)
- **Days 4-5**: Mews PMS adapter (16h)
- **Days 6-7**: Real analytics implementation (10h)
- **Day 7**: Testing & QA (8h)
- **Remaining**: Documentation updates (6h)

### **Week 3-4: Feature Completion** (40 hours)
- **Days 8-9**: Rate plan pricing (10h)
- **Day 10**: Email invoice delivery (6h)
- **Days 11-12**: Two-factor authentication (10h)
- **Days 13-14**: Integration testing & bug fixes (14h)

### **Week 5+: Optional Enhancements** (as needed)
- Mobile offline sync
- Website auto-scanning
- Channel manager
- Real-time features

---

## ✅ VERIFICATION CHECKLIST

### **Before Production Launch**:

- [ ] All API keys rotated (from security checklist)
- [ ] RBAC middleware on all protected routes
- [ ] 95%+ test pass rate (340+/356 tests)
- [ ] PDF invoices downloadable
- [ ] At least one real PMS adapter working
- [ ] Analytics showing real data
- [ ] Email notifications functional
- [ ] Health endpoint monitored
- [ ] Database backups configured
- [ ] Error tracking (Sentry) configured
- [ ] Rate limiting active
- [ ] CORS configured properly
- [ ] SSL certificates valid
- [ ] Environment variables secured
- [ ] Documentation updated
- [ ] User acceptance testing complete

---

## 📊 SUCCESS METRICS

### **MVP Definition of Done**:

1. ✅ All 4 critical blockers resolved
2. ✅ 95%+ test coverage passing
3. ✅ At least 1 real PMS integration
4. ✅ RBAC enforced on all routes
5. ✅ PDF invoice generation working
6. ✅ Real analytics dashboard
7. ✅ Email notifications sending
8. ✅ Health monitoring active
9. ✅ Security audit passed
10. ✅ Production deployment successful

### **Phase 6 Completion Criteria**:

- All Week 1-2 tasks complete (8 tasks)
- System passes security audit
- Load testing shows adequate performance
- User acceptance testing passed
- Documentation complete and reviewed
- Team trained on new features

---

## 📁 DELIVERABLES

### **Code Deliverables**:
1. RBAC middleware (`lib/middleware/rbac.ts`)
2. PDF service (`lib/services/pms/pdfService.ts`)
3. Mews PMS adapter (`lib/pms/providers/mewsProvider.ts`)
4. Analytics service (`lib/services/analyticsService.ts`)
5. Pricing service (`lib/services/pms/pricingService.ts`)
6. MFA service (`lib/security/mfa.ts`)
7. Updated tests (340+ passing)

### **Documentation Deliverables**:
1. RBAC Implementation Guide
2. PMS Integration Guide (Mews)
3. PDF Generation Guide
4. Analytics Data Dictionary
5. MFA Setup Guide
6. Updated API Documentation
7. Production Runbook

### **Infrastructure Deliverables**:
1. Updated database schema (rate plans, MFA fields)
2. New API endpoints (15+ routes)
3. Health monitoring dashboard
4. Test coverage report
5. Security audit report

---

## 🎯 NEXT IMMEDIATE STEPS

### **Start Now** (First 3 Tasks):

1. **Create RBAC Middleware** (Day 1 Morning)
   ```bash
   touch lib/middleware/rbac.ts
   # Implement permission wrapper
   ```

2. **Add RBAC to First Route** (Day 1 Afternoon)
   ```bash
   # Start with /api/admin routes (most critical)
   # Modify app/api/admin/users/route.ts
   ```

3. **Test RBAC Enforcement** (Day 1 Evening)
   ```bash
   # Create test user with limited permissions
   # Verify 403 responses on protected routes
   ```

---

## 📞 SUPPORT & RESOURCES

### **Documentation References**:
- [SECURE_API_INTEGRATION_GUIDE.md](SECURE_API_INTEGRATION_GUIDE.md) - Security setup
- [API_INTEGRATION_SUMMARY.md](API_INTEGRATION_SUMMARY.md) - Current integrations
- [CODEBASE_ANALYSIS_REPORT.md](CODEBASE_ANALYSIS_REPORT.md) - Full analysis
- [SECURITY_SETUP_CHECKLIST.md](SECURITY_SETUP_CHECKLIST.md) - Security checklist

### **External Resources**:
- **Mews API**: https://mews-systems.gitbook.io/connector-api/
- **Stripe API**: https://stripe.com/docs/api
- **Resend API**: https://resend.com/docs
- **Pinecone API**: https://docs.pinecone.io
- **OpenAI API**: https://platform.openai.com/docs

---

**Status**: Ready to Continue Development ✅  
**Priority**: RBAC Middleware → Test Fixes → PDF Generation → Mews PMS  
**Timeline**: 2-4 weeks to production-ready MVP  

**Let's build! 🚀**
