# Module 10 — PMS Full System Implementation Plan

## Overview
Complete Property Management System with Front Office, Housekeeping, and Maintenance modules.

---

## 📋 Implementation Phases

### Phase 1: Database Schema (Priority: CRITICAL)
- [ ] Room & RoomType models
- [ ] RatePlan model
- [ ] Booking model with full guest details
- [ ] Guest CRM model
- [ ] Folio & FolioItem models
- [ ] Invoice & PaymentRecord models
- [ ] HousekeepingTask & HousekeepingRound models
- [ ] WorkOrder model
- [ ] MaintenanceSchedule model
- [ ] Equipment & InventoryItem models
- [ ] KeyIssueLog model
- [ ] RoomStatusHistory model
- [ ] NoShowRecord model
- [ ] Enums: RoomStatus, BookingStatus, PaymentMethod, WorkOrderPriority, etc.

### Phase 2: Service Layer (Priority: HIGH)
- [ ] roomService.ts - Room management & availability
- [ ] bookingService.ts - Booking CRUD & validation
- [ ] availabilityService.ts - Availability calculation engine
- [ ] checkinService.ts - Check-in workflow
- [ ] checkoutService.ts - Check-out & folio closure
- [ ] guestService.ts - Guest CRM
- [ ] folioService.ts - Billing & charges
- [ ] invoiceService.ts - Invoice generation
- [ ] housekeepingService.ts - Task management
- [ ] maintenanceService.ts - Work orders
- [ ] inventoryService.ts - Parts management
- [ ] keyService.ts - Key generation & tracking

### Phase 3: API Endpoints (Priority: HIGH)
**Front Office APIs:**
- [ ] POST /api/pms/bookings - Create booking
- [ ] GET /api/pms/bookings - List bookings
- [ ] GET /api/pms/bookings/:id - Get booking details
- [ ] PATCH /api/pms/bookings/:id - Update booking
- [ ] DELETE /api/pms/bookings/:id - Cancel booking
- [ ] GET /api/pms/availability - Check availability
- [ ] POST /api/pms/checkin - Check-in guest
- [ ] POST /api/pms/checkout - Check-out guest
- [ ] GET /api/pms/rooms - List rooms
- [ ] PATCH /api/pms/rooms/:id/status - Update room status
- [ ] POST /api/pms/keys - Issue key
- [ ] GET /api/pms/guests - List guests
- [ ] GET /api/pms/guests/:id - Guest profile
- [ ] GET /api/pms/folio/:bookingId - Get folio
- [ ] POST /api/pms/folio/:bookingId/items - Add charge
- [ ] POST /api/pms/invoice/:bookingId - Generate invoice

**Housekeeping APIs:**
- [ ] GET /api/pms/housekeeping/tasks - List tasks
- [ ] POST /api/pms/housekeeping/tasks - Create task
- [ ] PATCH /api/pms/housekeeping/tasks/:id - Update task
- [ ] POST /api/pms/housekeeping/rounds - Assign round
- [ ] GET /api/pms/housekeeping/dashboard - Dashboard data

**Maintenance APIs:**
- [ ] GET /api/pms/maintenance/workorders - List work orders
- [ ] POST /api/pms/maintenance/workorders - Create work order
- [ ] PATCH /api/pms/maintenance/workorders/:id - Update work order
- [ ] GET /api/pms/maintenance/schedule - Get PM schedule
- [ ] POST /api/pms/maintenance/schedule - Add PM task
- [ ] GET /api/pms/maintenance/inventory - List inventory
- [ ] POST /api/pms/maintenance/inventory/:id/adjust - Adjust stock

### Phase 4: Background Jobs (Priority: MEDIUM)
- [ ] dailyHousekeepingTaskGenerator - Auto-create daily tasks
- [ ] preventiveMaintenanceScheduler - Generate PM tasks
- [ ] noShowChecker - Mark no-shows
- [ ] availabilityRecalculator - Update availability cache
- [ ] autoInvoiceGenerator - Generate invoices on checkout

### Phase 5: UI Components (Priority: MEDIUM)
**Front Office:**
- [ ] BookingCalendar.tsx - Availability grid
- [ ] BookingForm.tsx - Create/edit booking
- [ ] BookingList.tsx - Bookings table
- [ ] CheckInModal.tsx - Check-in flow
- [ ] CheckOutModal.tsx - Check-out flow
- [ ] GuestProfile.tsx - Guest details
- [ ] FolioView.tsx - Billing view
- [ ] InvoicePDF.tsx - Invoice template

**Housekeeping:**
- [ ] HousekeepingBoard.tsx - Kanban board
- [ ] TaskCard.tsx - Task details
- [ ] RoomStatusGrid.tsx - Room status overview
- [ ] RoundAssignment.tsx - Assign rounds

**Maintenance:**
- [ ] WorkOrderList.tsx - Work orders table
- [ ] WorkOrderForm.tsx - Create/edit work order
- [ ] PMSchedule.tsx - Preventive maintenance calendar
- [ ] InventoryTable.tsx - Parts inventory

### Phase 6: Integration (Priority: LOW)
- [ ] Integrate with Ticket System
- [ ] Integrate with Staff Module
- [ ] PMS Adapter override logic
- [ ] Webhook support for external integrations

### Phase 7: Testing (Priority: HIGH)
- [ ] Unit tests for services
- [ ] API integration tests
- [ ] Availability calculation tests
- [ ] Check-in/out workflow tests
- [ ] Work order lifecycle tests

---

## 🔢 Estimated Scope

**Database Models:** 18 models
**API Endpoints:** 30+ endpoints
**Services:** 12 services
**Background Jobs:** 5 jobs
**UI Components:** 15+ components
**Tests:** 50+ test cases
**Total LOC:** ~8,000 lines

---

## 🎯 Success Criteria

1. ✅ Complete booking lifecycle (create → check-in → checkout → invoice)
2. ✅ Real-time room status management
3. ✅ Automated housekeeping task generation
4. ✅ Work order creation from housekeeping
5. ✅ Preventive maintenance scheduling
6. ✅ Guest CRM with history
7. ✅ Multi-folio support
8. ✅ Tax calculation & invoice PDF
9. ✅ Key issuance tracking
10. ✅ Inventory management

---

## 📅 Timeline

- **Phase 1 (Schema):** 2 hours
- **Phase 2 (Services):** 6 hours
- **Phase 3 (APIs):** 4 hours
- **Phase 4 (Jobs):** 2 hours
- **Phase 5 (UI):** 6 hours
- **Phase 6 (Integration):** 2 hours
- **Phase 7 (Testing):** 3 hours

**Total Estimated Time:** 25 hours

---

## 🚀 Let's Begin!

Starting with Phase 1: Prisma Schema
