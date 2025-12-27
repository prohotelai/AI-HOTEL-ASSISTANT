# AI Hotel Assistant – Copilot Guide

## Architecture Overview
Multi-tenant Next.js 14 App Router SaaS with AI agents, PMS integration, subscription billing, and 24/7 support.
- **Routes**: [app/](app/) (Next.js routes)
- **Services**: [lib/services/](lib/services/) (domain logic, e.g., `ticketService.ts`)
- **Data**: [prisma/schema.prisma](prisma/schema.prisma) (models: Hotel tenant, User, Room, Booking, Ticket, etc.)
- **Auth**: [lib/auth/](lib/auth/) (NextAuth + custom sessions), [middleware.ts](middleware.ts) enforces boundaries
- **AI**: [lib/ai/](lib/ai/) (OpenAI, Pinecone, tools), [app/api/chat/](app/api/chat/) entry point
- **Queues**: [lib/queues/](lib/queues/) (BullMQ for async jobs)
- **Widget SDK**: [widget-sdk/](widget-sdk/) (Vite-built ESM/UMD/IIFE for embeds)

## Security Patterns (Critical)
- **Tenant Isolation**: Always extract `hotelId` from auth (never request body). Enforce `where: { hotelId }` in every Prisma query.
- **Service Functions**: `async function(hotelId: string, userId?: string, input: InputType)` - e.g., `listTickets(hotelId, query)`
- **API Handlers**: Wrap with `withAuth()` from [lib/auth/withAuth.ts](lib/auth/withAuth.ts): `export const POST = withAuth(async (req, ctx) => { ... })`
- **RBAC**: Use [lib/rbac.ts](lib/rbac.ts) for permissions (e.g., `TICKETS_CREATE`)
- **Sessions**: Staff/guest use Bearer tokens; admins use NextAuth JWT.

## AI & Chat Flow
- **Pipeline**: [app/api/chat/route.ts](app/api/chat/route.ts) → usage check → knowledge retrieval ([lib/ai/retrieval.ts](lib/ai/retrieval.ts)) → OpenAI ([lib/ai/openai.ts](lib/ai/openai.ts)) → tool execution ([lib/ai/tools.ts](lib/ai/tools.ts))
- **Tools**: Defined in `toolDefinitions` array; execute with `ToolExecutionContext { hotelId, userId, permissions }`
- **Limits**: Track per-hotel monthly usage; throw `UsageLimitError`
- **Events**: Emit to [lib/events/eventBus.ts](lib/events/eventBus.ts) (include `hotelId`), enqueue jobs in [lib/queues/](lib/queues/)

## Key Models & Relationships
- **Hotel**: Root tenant with users, rooms, bookings, tickets, subscriptions
- **User**: Roles (OWNER > MANAGER > RECEPTION > STAFF > AI_AGENT), linked via `hotelId`
- **Room/Booking/Guest**: PMS data; rooms have status (AVAILABLE/OCCUPIED/DIRTY)
- **Ticket**: Support/maintenance linked to Conversation; SLA, assignments, tags
- **Conversation**: Scoped to hotel + userId; stores messages; guest sessions via `guestId`
- **Subscription**: Plans (STARTER/PRO/PRO_PLUS/ENTERPRISE) with limits

## Developer Workflows
- **Dev**: `npm run dev` (Next.js :3000), `npm run db:studio` (Prisma)
- **DB**: `npm run db:push` (sync), `npm run db:migrate` (Neon), `npm run db:seed`
- **Build/Test**: `npm run build`, `npm test` (Vitest), `npm run widget:build`
- **Scripts**: `npm run assistant:load-docs` (KB ingest), `npx ts-node scripts/validate-deployment.ts` (pre-deploy)
- **Testing**: Vitest in [tests/](tests/), mock with `vi.mock()` for OpenAI/Pinecone

## Deployment & Infra
- **Vercel**: `vercel-build` (generate + build), auto-deploy on push
- **DB**: Neon Postgres (pooling), Upstash Redis (queues/cache)
- **Env**: [lib/env.ts](lib/env.ts) validates required vars (DATABASE_URL, NEXTAUTH_*); optional: OPENAI_*, PINECONE_*, STRIPE_*
- **Errors**: Custom throws (e.g., `UsageLimitError`), audit logs for compliance

## Conventions
- **Imports**: Relative with `@/lib/...`
- **Events**: All payloads include `hotelId`; pattern: emit → enqueue job → async process
- **PMS**: Adapter pattern in [lib/ai/read-models/](lib/ai/read-models/) for Opera/Mews
- **Billing**: Folios accumulate charges → Invoice → Payment (Decimal precision)
- **Widget**: Build with `npm run widget:build`; integrate via `<script>` or ESM import
