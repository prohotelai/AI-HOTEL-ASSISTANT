# AI Hotel Assistant – Copilot Guide

## Architecture Baseline
- **Multi-tenant Next.js 14 App Router** SaaS: AI agents + PMS integration + billing + 24/7 support.
- **Structure**: [app](app) (UI/API routes), [lib/services](lib/services) (domain logic), [prisma/schema.prisma](prisma/schema.prisma) (data models).
- **Singletons**: [lib/prisma.ts](lib/prisma.ts) (connection pooling 5–10), [lib/env.ts](lib/env.ts) (typed env validation), [lib/auth.ts](lib/auth.ts) (NextAuth + hotelId/role).
- **Middleware**: [middleware.ts](middleware.ts) validates tokens + enforces tenant boundaries; [lib/middleware/rbac.ts](lib/middleware/rbac.ts) gates APIs by permission. **Update both when protecting routes.**

## Tenant & Security (Critical)
- **Never trust request hotelId**: Always extract from `getToken()` (NextAuth JWT) via [lib/auth/withAuth.ts](lib/auth/withAuth.ts) or `getServerSession()`.
- **Service Pattern**: All services signature: `async function(hotelId, userId?, input)` + **all Prisma queries filter `where: { hotelId }`**. See [lib/services/ticketService.ts](lib/services/ticketService.ts) for template.
- **Permissions**: [lib/rbac.ts](lib/rbac.ts) enum (`TICKETS_CREATE`, `PMS_BOOKINGS_READ`, etc.) + role→permission map. Guard handlers with `withPermission(Permission.X)`.
- **API Pattern**: Wrap with `withAuth()` → parse body → check permission → call service → return DTO (no secrets). Example: [app/api/tickets/route.ts](app/api/tickets/route.ts).
- **User Scopes**: Staff: `userId` + `hotelId`. Guests: `guestId` (session-scoped, widget) or `userId` (authenticated). Never leak cross-hotel data.

## AI & Chat Pipeline
- **Entry**: [app/api/chat/route.ts](app/api/chat/route.ts) accepts `{ message, conversationId, hotelId, guestId }`.
- **Flow**: (1) Retrieve docs via [lib/ai/retrieval.ts](lib/ai/retrieval.ts) (Pinecone + keyword search), (2) Call OpenAI [lib/ai/openai.ts](lib/ai/openai.ts), (3) Route tool calls via [lib/ai/tools.ts](lib/ai/tools.ts).
- **Tools**: Map actions like `create_ticket`. Check guards in [lib/ai/guards](lib/ai/guards) before executing (e.g., guest/staff permissions).
- **Events**: Emit via [lib/events/eventBus.ts](lib/events/eventBus.ts) (must include `hotelId`). Silent rejection if hotelId missing.
- **Knowledge Base**: Pinecone in [lib/ai/vectorProvider.ts](lib/ai/vectorProvider.ts) (graceful fallback). Ingest via [lib/services/knowledgeBaseService.ts](lib/services/knowledgeBaseService.ts).

## Events & Background Jobs
- **Event Bus**: In-process EventEmitter at [lib/events/eventBus.ts](lib/events/eventBus.ts). **Every payload must have `hotelId` or silently rejected.**
- **Queues**: BullMQ in [lib/queues](lib/queues) (Redis-backed): KB embedding, ticket SLA, PMS sync.
- **Pattern**: Services emit on state change (e.g., `eventBus.emit('tickets.created', { ticketId, hotelId })`); listeners enqueue jobs.
- **PMS Sync**: [lib/services/pmsService.ts](lib/services/pmsService.ts) reads [prisma/schema.prisma](prisma/schema.prisma) `ExternalPMSConfig` model (Opera, Mews, etc.); maps via [lib/ai/read-models](lib/ai/read-models).

## Key Data Models
- **Hotel**: Tenant root; many users, rooms, bookings, tickets, conversations, PMS config, subscription plan.
- **User/Role**: Staff with hotelId + roles (via UserRole) → permissions (via RolePermission).
- **Room/Booking/Guest**: PMS core—rooms have status (AVAILABLE, OCCUPIED, DIRTY); bookings link guest + room + dates.
- **Ticket**: Support/maintenance; created by guest (AI) or staff; linked to Conversation; SLA tracking, assignment, tags.
- **Conversation**: Chat session; hotelId + optional userId; messages + guestId for widget sessions.
- **Folio/Invoice/Payment**: Billing—Folio accumulates FolioItems; generates Invoice; Decimal for accuracy.

## Subscription & Usage Limits
- **Plans**: STARTER (100 msgs/mo, 10 tickets), PRO (1000 msgs, unlimited), PRO_PLUS (3000 msgs), ENTERPRISE (custom).
- **Tracking**: Hotel fields `aiMessagesUsed`, `ticketsCreated`, `storageUsedGB` reset monthly.
- **Enforcement**: [lib/subscription/usageTracking.ts](lib/subscription/usageTracking.ts) `checkAIMessageLimit()` throws `UsageLimitError`; emit `usage.limit.exceeded`.

## Widget SDK & Demo
- **Build**: `npm run widget:build` → [widget-sdk](widget-sdk) IIFE bundle for browser embedding.
- **API**: `createWidget(options)` exposes chat UI, voice, localization, telemetry.
- **Demo**: [app/widget-demo](app/widget-demo) loads bundle + talks to [app/api/chat/route.ts](app/api/chat/route.ts).

## Developer Workflows
- **Dev**: `npm run dev` (Next.js), `npm run db:studio` (Prisma UI), `npm test` (Vitest).
- **Database**: `npm run db:push` (sync), `npm run db:migrate` (Neon), `npm run db:seed` (test data).
- **Scripts**: [scripts](scripts) — `validate-deployment.ts`, `load-assistant-docs.ts`, billing tests.
- **Build**: `npm run build` (local), `npm run vercel-build` (Vercel).

## Testing & Validation
- **Unit/Integration**: Vitest in [tests](tests) mirrors [lib](lib), [app/api](app/api). Config: [vitest.config.ts](vitest.config.ts).
- **E2E**: Playwright specs in [tests/e2e](tests/e2e). Config: [playwright.config.ts](playwright.config.ts).
- **Pre-deploy**: `npx ts-node scripts/validate-deployment.ts` checks env, Redis, Postgres, Pinecone.
- **Health**: `/health` (basic), `/api/health/db` (Prisma + Redis).

## Deployment & Operations
- **Vercel**: Runs `vercel-build` hook (Prisma migrate + Next.js build). Use Neon + Upstash Redis.
- **Secrets**: Encrypt PMS/OpenAI/Stripe keys; rotate regularly. Audit logs in AuditLog model.
- **Errors**: Custom classes: UsageLimitError, PMSIntegrationError, PlanAccessError (see [lib](lib) for details).
