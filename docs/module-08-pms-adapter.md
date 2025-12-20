# Module 08 — PMS Adapter Layer

## Objectives
- Integrate external property management systems (PMS) with the AI Hotel Assistant.
- Provide REST and GraphQL adapters for ingesting and exposing PMS data.
- Map PMS data structures into internal Prisma models (notably `Booking` and related hotel records).
- Handle error conditions gracefully with retries and structured logging.
- Run background synchronization jobs to reconcile PMS data on a schedule.

## Scope
1. **REST Ingestion Endpoints**
   - Accept booking, guest, and availability payloads from external PMS partners.
   - Authenticate requests via provider key + hotel-scoped token.
   - Normalize payloads and upsert into Prisma models with idempotency controls.
2. **GraphQL Exposure Endpoint**
   - Offer a minimal GraphQL schema for partner systems to query bookings and availability.
   - Support filtering by hotel, status, and date ranges.
3. **Adapter & Mapping Layer**
   - Define a provider-agnostic interface with concrete adapters (starting with a mock provider).
   - Implement mappers to translate provider payloads to internal entities.
   - Persist status transitions and emit domain events (e.g., `pms.booking.synced`).
4. **Background Sync Jobs**
   - Queue periodic sync tasks per hotel/provider.
   - Fetch delta updates from provider APIs and reconcile with local store.
   - Record sync outcomes for observability.
5. **Error Handling & Observability**
   - Wrap external calls with retries and backoff.
   - Capture structured logs including provider, hotel, and correlation ids.
   - Surface sync failures in admin dashboard (future integration).

## Deliverables
- `lib/pms/` provider interfaces, mock adapter, and mapping utilities.
- `lib/services/pmsService.ts` orchestrating ingestion, mapping, and persistence.
- REST handlers in `app/api/pms/*` for provider webhooks and sync triggers.
- GraphQL handler exposing read queries under `app/api/pms/graphql`.
- `lib/queues/pmsQueue.ts` for background sync scheduling and workers.
- Vitest coverage for service logic and mappers under `tests/pms/`.
- Documentation updates (this module brief plus summary in `PROJECT_SUMMARY.md`).

## References
- Booking schema: see `prisma/schema.prisma` (`Booking` model).
- Existing queue pattern: `lib/queues/knowledgeBaseQueue.ts`.
- Event bus: `lib/events/eventBus.ts` (extend with PMS events).
