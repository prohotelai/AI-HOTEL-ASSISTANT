# Tickets System Module (Session 5.1 – QR Code Guest Login)

This document captures the production-ready blueprint for the Tickets System module, built for a multi-tenant hotel SaaS with QR-based guest login. It follows the required output format for approval before implementation.

---

## [1] Overview
- Multi-tenant ticketing for hotel operations: guest requests, staff tasks, AI escalations.
- Source channels: QR guest widget, WhatsApp, AI Agent, Staff dashboard, PMS events.
- Goals: fast triage, SLA tracking, auditability, secure guest auto-login via QR.

## [2] Architecture
- **App**: Next.js 14 (App Router, RSC) + API routes (Route Handlers).
- **DB**: PostgreSQL via Prisma; all core tables keyed by `hotelId`.
- **Queue**: BullMQ/Redis for async jobs (notifications, SLA, PMS sync).
- **Storage**: S3-compatible for attachments.
- **Event Bus**: lightweight in-app emitter with webhook fan-out (Stripe/Affiliate/PMS safe mode).
- **Auth**: JWT for guests (QR token validation → guest session) and staff (sessions/JWT).
- **RBAC**: Owner, Manager, Reception, Staff, AI Agent; middleware enforces hotel scoping.
- **Observability**: structured logs + audit trail table.

## [3] Database Schema (Prisma models + migrations)
```prisma
model Hotel {
  id          String   @id @default(cuid())
  name        String
  // ...
  tickets     Ticket[]
  guestTokens GuestQRToken[]
  ticketTags  TicketTag[]
}

model GuestQRToken {
  id        String   @id @default(cuid())
  hotelId   String
  guestId   String   // references Guest.id (defined in core guest domain)
  roomId    String   // references Room.id (PMS adapter)
  tokenHash String   @unique // hashed token (e.g., sha256(jwt))
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  usedAt    DateTime?

  hotel Hotel @relation(fields: [hotelId], references: [id])
  @@index([tokenHash])
  @@index([hotelId, guestId, roomId])
}

model Ticket {
  id          String   @id @default(cuid())
  hotelId     String
  source      TicketSource
  status      TicketStatus @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  title       String
  description String?
  guestId     String?  // Guest.id (nullable for staff-created tasks)
  roomId      String?  // Room.id (nullable for non-room tasks)
  createdById String?  // Staff/User.id
  assignedToId String? // Staff/User.id
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  hotel   Hotel  @relation(fields: [hotelId], references: [id])
  comments TicketComment[]
  audits   TicketAudit[]
  tags      TicketTagOnTicket[]

  @@index([hotelId, status, priority])
  @@index([hotelId, assignedToId])
}

model TicketComment {
  id        String   @id @default(cuid())
  ticketId  String
  authorId  String?  // Staff/User.id or AI Agent pseudo-user
  content   String
  isInternal Boolean @default(false)
  createdAt DateTime @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id])
}

model TicketAudit {
  id        String   @id @default(cuid())
  ticketId  String
  actorId   String?  // Staff/User.id or service actor
  action    String
  payload   Json
  createdAt DateTime @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id])
}

model TicketTag {
  id      String @id @default(cuid())
  hotelId String
  name    String
  color   String?
  tickets TicketTagOnTicket[]
  hotel   Hotel  @relation(fields: [hotelId], references: [id])
  @@unique([hotelId, name])
}

model TicketTagOnTicket {
  ticketId String
  tagId    String
  ticket   Ticket   @relation(fields: [ticketId], references: [id])
  tag      TicketTag @relation(fields: [tagId], references: [id])
  @@id([ticketId, tagId])
}

enum TicketStatus { OPEN IN_PROGRESS RESOLVED CLOSED }
enum TicketPriority { LOW MEDIUM HIGH URGENT }
enum TicketSource { QR_WIDGET WHATSAPP STAFF_DASH AI_AGENT PMS }
```
**Foreign keys**: `guestId`, `roomId`, `createdById`, `assignedToId`, `authorId`, and `actorId` reference core `Guest`, `Room`, and `Staff/User` tables (to be added in the shared domain). Hotel relations are already defined; relations to Guest/Room/Staff will be added once those models land in the shared schema, along with cascade rules.

**Migrations**: generated via `prisma migrate dev --name tickets_module`; add initial seed for tags/priorities; ensure foreign keys to Hotel/Guest/Staff tables (to be implemented globally).

## [4] API Endpoints + validation + sample requests/responses
- **POST /api/qr/generate**  
  - Body (Zod): `{ hotelId: string(), guestId: string(), roomId: string(), expiresInMinutes: number().optional().default(60) }`  
  - Logic: RBAC (Reception+); validate `guestId` is assigned to `roomId` for `hotelId` (PMS/CRM lookup) before issuing; create `GuestQRToken` with signed JWT payload `{hotelId, guestId, roomId, tokenId}` and persist **hashed** token value.  
  - Response: `{ qrUrl, token, expiresAt }`

- **POST /api/qr/validate**  
  - Body: `{ token: string }` → verify JWT signature, hash token, compare to stored `tokenHash`, ensure unused/unexpired; apply rate limit (e.g., 10 req/min/IP and 5 req/min/guest) → mark `used=true` + issue guest session.  
  - Response: `{ sessionToken, guestId, hotelId, roomId }`

- **POST /api/tickets**  
  - Body (Zod): `{ title: string().min(3), description?: string(), priority?: enum(), tags?: string[], roomId?: string(), source: enum().default('QR_WIDGET') }`  
  - Auth: guest via QR session or staff; enforce `hotelId` from session.  
  - Response: `Ticket`.

- **GET /api/tickets** (paginated, filters by status/priority/tag/assignee).
- **GET /api/tickets/:id**
- **PATCH /api/tickets/:id** (status, priority, assignee, tags) with audit trail.
- **POST /api/tickets/:id/comments** (supports internal note flag).
- **POST /api/tickets/:id/attachments** (presigned upload then attachment record).
- **Webhook** `POST /api/webhooks/pms/ticket-sync` for PMS adapter ingestion (signature verified).

Sample request (create ticket):
```json
POST /api/tickets
{
  "title": "Need extra towels",
  "description": "Please send two to room 1205",
  "priority": "MEDIUM",
  "source": "QR_WIDGET",
  "roomId": "room_1205" // canonical Room.id from PMS adapter
}
```
Sample response:
```json
{
  "id": "tik_123",
  "status": "OPEN",
  "priority": "MEDIUM",
  "createdAt": "2025-01-01T10:00:00Z"
}
```

## [5] Background Jobs / Queues
- Queue: `tickets:notifications` (guest/staff notifications via email/SMS/WhatsApp), `tickets:sla` (breach detection, escalation), `tickets:pms-sync` (mirror to PMS adapter), `tickets:analytics` (emit events to warehouse).
- Jobs dispatched on ticket create/update/comment; retries with exponential backoff; poison-pill to DLQ.
- Cron: SLA scan every 5 minutes scoped by hotel.

## [6] UI (Next.js + shadcn/ui + Tailwind)
- Pages (App Router):  
  - `/tickets` list with filters, tags, assignee, status chips.  
  - `/tickets/[id]` detail with comments, audit log, attachment list, action bar.  
  - QR guest widget: minimal chat-style form to create ticket; auto-login via QR validation response.
- Components: `TicketCard`, `TicketForm`, `CommentThread`, `StatusBadge`, `PriorityBadge`, `AssignmentDropdown`, `TagMultiSelect`.  
- Styling: Tailwind + shadcn/ui primitives (Card, Badge, Button, Sheet for filters).  
- Accessibility: keyboard-first, ARIA labels on inputs/buttons.

## [7] RBAC & Middleware
- Roles: Owner, Manager, Reception, Staff, AI Agent.  
- Permissions:  
  - Owner/Manager: full access.  
  - Reception/Staff: create/view/update tickets for their hotel; limited bulk actions.  
  - AI Agent: create/comment with `isInternal=true` when auto-summarizing.  
- Middleware:  
  - Auth guard (session/JWT) + `hotelId` scoping on queries.  
  - QR validate route allows public JWT but checks `GuestQRToken` unused/unexpired.  
  - Request rate-limits for QR endpoints: **10 requests/min/IP** and **5 requests/min/guest** (configurable defaults tuned for expected scan volume; per-tenant overrides allowed).

## [8] Events / Integrations / Webhooks
- Events emitted: `ticket.created`, `ticket.updated`, `ticket.assigned`, `ticket.commented`, `ticket.closed`, `qr.issued`, `qr.validated`.  
- Event handlers fan out to:  
  - Webhook dispatcher (per-hotel endpoints with signing secret).  
  - PMS Adapter Layer (sync ticket lifecycle).  
  - Analytics pipeline (batch to warehouse).  
- Webhook safety: HMAC signatures, idempotency keys, per-tenant retry with backoff.

## [9] Unit & Integration Tests (Vitest)
- Unit: validation schemas, ticket service (status transitions, tag dedupe), QR token service (expiry/use once).  
- Integration: API route handlers (create, update, comment) with mocked Prisma + Redis; QR generate/validate happy/expiry/used cases; RBAC access matrix.  
- Example (pseudo):
```ts
it('rejects expired QR token', async () => {
  const token = await tokens.create({ expiresAt: past });
  const res = await app.inject({ method: 'POST', url: '/api/qr/validate', body: { token: token.jwt } });
  expect(res.statusCode).toBe(400);
});
```

## [10] PR-ready folder structure & README
```
docs/
  module-01-tickets.md
app/
  api/
    qr/generate/route.ts
    qr/validate/route.ts
    tickets/[id]/route.ts
    tickets/[id]/comments/route.ts
    tickets/route.ts
lib/
  rbac/
    roles.ts
    middleware.ts
  prisma/
    schema.prisma
  queue/
    index.ts
    processors/
  events/
    emitter.ts
    handlers/
components/tickets/
  TicketCard.tsx
  TicketForm.tsx
tests/
  api/
  services/
  rbac/
```
- Root README should link to this module doc; migrations tracked via Prisma migrations folder; add `.env.example` for DB/Redis keys when implementing.

---
