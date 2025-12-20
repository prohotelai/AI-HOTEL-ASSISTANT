# Module 7 — Admin Dashboard Implementation Plan

## Objectives
- Provide a dedicated admin dashboard that equips hotel owners/managers with insight into tenants (hotels), staff, bookings, ticket health, and knowledge base readiness.
- Deliver interactive visualizations using Recharts while keeping bundle sizes manageable.
- Enforce role-based permissions so only authorized roles access admin capabilities.
- Supply a service layer for aggregated analytics and targeted tables that can be reused by APIs/future pages.
- Cover core utilities with unit tests and refresh documentation to reflect the new module.

## Scope & Features
1. **Admin Entry Point**
   - `app/dashboard/admin/page.tsx` server component.
   - Session + RBAC guard; redirects unauthorized users.
   - Fetches aggregated data via new admin service and renders React client component.
2. **Service Layer**
   - `lib/services/adminService.ts` with `getAdminDashboardData` and reusable summarizers.
   - Aggregates metrics for staff counts, ticket backlog, knowledge base readiness, booking volume, and trends.
   - Exposes helper functions for booking trend graph, ticket status breakdown, and knowledge status summary.
3. **UI Components**
   - `components/admin/AdminDashboard.tsx` client component using Recharts (LineChart + PieChart) and tailwind cards/tables.
   - Includes overview cards, booking trend line chart, ticket status pie chart, knowledge base status badges, and tabular views for staff/bookings/tickets/documents.
   - Responsive layout to work across breakpoints.
4. **Domain Additions**
   - New Prisma `Booking` model + enum for booking status.
   - Extend Hotel relation to bookings.
   - RBAC permissions `admin:view` and `admin:manage` exposed to owner/manager roles.
   - Admin UI respects permissions (ticket creation CTA hidden if scope missing).
5. **Tooling**
   - Add `recharts` dependency and ensure Next.js pages mark components as client-side.
   - Provide root npm script coverage (existing lint/test commands already cover new files).
6. **Testing & Docs**
   - Add Vitest coverage for admin service summarizer helpers.
   - Update `README.md` and `PROJECT_SUMMARY.md` with Module 7 notes and new commands/sections if required.

## Non-Goals
- Building mutation flows (e.g., create/delete staff) — dashboard is read/insight oriented.
- Implementing external analytics pipelines.
- Creating separate API routes for admin (service is consumed server-side).

## Risks & Mitigations
- **No Booking Data** → Provide empty-state messaging and rely on helper functions to safely handle zero-length arrays.
- **Role Drift** → Centralize permission checks via new RBAC enum; tests cover helper logic independent of DB.
- **Recharts SSR** → Render charts inside client component with dynamic import-safe usage and guard for empty data.

## Success Criteria
- `/dashboard/admin` renders for owner/manager roles and blocks others with 403 redirect.
- Overview cards display aggregated metrics pulled via Prisma.
- Recharts graphs render without console errors and adapt to empty datasets.
- Tables list staff, bookings, tickets, and knowledge base documents.
- `npm run lint` and `npm test -- --run tests/admin/adminService.test.ts` pass.
- Project docs describe the new module.
