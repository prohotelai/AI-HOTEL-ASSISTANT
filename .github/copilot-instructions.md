# AI Hotel Assistant – Copilot Guide

## Architecture Baseline
**Multi-tenant Next.js 14 App Router SaaS**: AI agents + PMS integration + subscription billing + 24/7 support.
- **Structure**: [app](app) (routes), [lib/services](lib/services) (domain logic), [prisma/schema.prisma](prisma/schema.prisma) (data models).
- **Singletons**: [lib/prisma.ts](lib/prisma.ts) (connection pool), [lib/env.ts](lib/env.ts) (typed env + validation), [lib/auth.ts](lib/auth.ts) (NextAuth + JWT).
- **Middleware**: [middleware.ts](middleware.ts) enforces auth + hotel boundaries. **Update when protecting new routes.**
- **Type Aliases**: Use relative imports (`@/lib/...`); `hotelId` always extracted from auth, never from request body.

## Tenant Security (Critical – Read First)
- **Always extract hotelId from auth**: `getServerSession()` or `withAuth()` extracts from NextAuth JWT, not from request body.
- **Service Signature Pattern**: Every service function: `async function(hotelId: string, userId?: string, input: InputType)`.
  - Example: [lib/services/ticketService.ts](lib/services/ticketService.ts#L60) `listTickets(hotelId, query)` → filters `where: { hotelId }`.
  - Enforce at **every Prisma query**: `where: { hotelId }` prevents cross-tenant data leaks.
- **API Handler Pattern**: `withAuth()` wrapper → validate request → check permission → call service → return DTO (never expose secrets).
  - Wrap route handlers: `export const POST = withAuth(async (req, ctx) => { ... })` with `AuthContext = { userId, hotelId, role }`.
- **RBAC**: [lib/rbac.ts](lib/rbac.ts) defines Permission enum (`TICKETS_CREATE`, `PMS_BOOKINGS_READ`). Check via `permissionsForRole(role)` or `hasPermission(role, perm)`.

## AI & Chat Pipeline
**Entry**: [app/api/chat/route.ts](app/api/chat/route.ts) accepts `{ message, conversationId, hotelId, guestId }`.
- **Flow**: (1) Check message usage limits via [lib/subscription/usageTracking.ts](lib/subscription/usageTracking.ts), (2) retrieve knowledge via [lib/ai/retrieval.ts](lib/ai/retrieval.ts) (Pinecone + keyword fallback), (3) call OpenAI [lib/ai/openai.ts](lib/ai/openai.ts), (4) route tool calls via [lib/ai/tools.ts](lib/ai/tools.ts).
- **Tools**: Defined in [lib/ai/tools.ts](lib/ai/tools.ts) with `toolDefinitions` array. Execute via `executeToolCall()` which validates permissions before action.
- **Limits**: Usage tracked per hotel per month (resets monthly). Throw `UsageLimitError` if exceeded; emit `usage.limit.exceeded` event.
- **Knowledge Base**: Ingest via [lib/services/knowledgeBaseService.ts](lib/services/knowledgeBaseService.ts) → embeddings → Pinecone. Graceful fallback if Pinecone unavailable.

## Events & Jobs
- **Event Bus**: In-process [lib/events/eventBus.ts](lib/events/eventBus.ts) (EventEmitter). **All payloads must include `hotelId`.**
- **Queues**: BullMQ in [lib/queues](lib/queues) (Redis-backed). Job types: KB embedding, ticket SLA, PMS sync.
- **Pattern**: Service emits on state change (e.g., `eventBus.emit('tickets.created', { ticketId, hotelId })`). Listeners enqueue jobs; workers process async.
- **PMS Sync**: [lib/services/pmsService.ts](lib/services/pmsService.ts) reads `ExternalPMSConfig` model; adapter pattern via [lib/ai/read-models](lib/ai/read-models) (Opera, Mews, etc.).

## Key Data Models
**Hotel** (tenant root) has: users, conversations, rooms, bookings, tickets, PMS config, subscription plan, usage tracking.
- **User/Role**: Staff linked to hotel via `hotelId`. Roles map to permissions (owner > manager > reception > staff > ai_agent).
- **Room/Booking/Guest**: PMS tables—rooms have status (AVAILABLE, OCCUPIED, DIRTY); bookings link guest + room + dates.
- **Ticket**: Support or maintenance; created by guest/AI or staff; linked to Conversation; SLA tracking, assignments, tags.
- **Conversation**: Chat session scoped to hotel + optional userId; stores messages; can have guestId (widget sessions).
- **Folio/Invoice/Payment**: Billing—Folio accumulates charges; generates Invoice; amounts use Decimal type for precision.
- **Subscription**: Hotel has plan (STARTER, PRO, PRO_PLUS, ENTERPRISE) with monthly message/storage/ticket limits.

## Developer Workflows
**Dev Mode**: `npm run dev` → Next.js on `:3000`, Prisma Studio: `npm run db:studio`.
- **Database**: `npm run db:push` (sync schema), `npm run db:migrate` (Neon), `npm run db:seed` (load test data).
- **Build & Test**: `npm run build` (local), `npm run vercel-build` (CI), `npm test` (Vitest).
- **Scripts**: [scripts](scripts) folder—`validate-deployment.ts`, `load-assistant-docs.ts`, billing workflow tests.
- **Pre-Deploy Check**: `npx ts-node scripts/validate-deployment.ts` validates env, Redis, Postgres, Pinecone connectivity.

## Testing Patterns
- **Unit/Integration**: Vitest in [tests](tests) mirroring structure. Config: [vitest.config.ts](vitest.config.ts).
- **E2E**: Playwright specs in [tests/e2e](tests/e2e). Config: [playwright.config.ts](playwright.config.ts).
- **Mocking**: Use `vi.mock()` for external APIs (OpenAI, Pinecone). Mock auth context for tests.

## Error Handling
- **Custom Errors**: Throw domain-specific errors—`UsageLimitError`, `PMSIntegrationError`, `PlanAccessError`.
- **Env Validation**: [lib/env.ts](lib/env.ts) `getEnv()`, `requireOpenAI()` throw early if missing. Checks run at startup.
- **Audit Logs**: Store user actions via [lib/services/knowledgeBaseAudit.ts](lib/services/knowledgeBaseAudit.ts) for compliance.

## Deployment
- **Vercel**: Runs `vercel-build` (Prisma generate + migrate + Next build). Push to repo to auto-deploy.
- **DB**: Neon (serverless Postgres); use connection pooling to avoid cold starts.
- **Cache/Queue**: Upstash Redis for queue jobs, rate limiting, session cache.
- **Secrets**: Rotate OpenAI/Stripe/PMS API keys regularly. Store encrypted in vault.
