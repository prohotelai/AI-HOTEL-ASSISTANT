# PMS v2.0 - Testing Automation Plan

**Document Version**: 1.0  
**Date**: December 2025  
**Status**: Master Testing Strategy  
**Scope**: Complete automated testing for all PMS modules

---

## Executive Summary

This document outlines a comprehensive testing automation strategy covering:
- **Frontend**: Jest + React Testing Library + Playwright E2E
- **Backend**: Vitest for API routes + utilities
- **Services**: Unit tests for email, sync, analytics
- **Database**: Integration tests with test databases
- **Widget SDK**: Standalone testing framework
- **Mobile**: Vitest + Detox (future)

**Target Coverage**: 80%+ across all modules
**CI/CD Integration**: GitHub Actions automation
**Estimated Implementation**: 2-3 weeks for comprehensive suite

---

## 1. Testing Architecture Overview

### Testing Pyramid

```
                    ⬆️
                  E2E Tests (5%)
                 Playwright Tests
              /          \
           Manual      Automated
          Testing      Testing
           /              \
    ~150 tests        /        \
                  /              \
              Integration Tests (15%)
           API Routes + Database
              /              \
          Backend         Frontend
         Services      Integration
          ~200 tests   ~150 tests
              \              /
                \          /
                  \      /
                Unit Tests (80%)
             Jest + Vitest + React Testing Library
                    ~600 tests
                   /          \
               Frontend      Backend
              Components     Utilities
               /              \
            400 tests        200 tests
```

### Testing Framework Matrix

| Layer | Framework | Language | Coverage Target |
|-------|-----------|----------|-----------------|
| **Components** | Jest + RTL | TypeScript/TSX | 85% |
| **Pages** | Jest + RTL | TypeScript/TSX | 80% |
| **API Routes** | Vitest | TypeScript | 85% |
| **Services** | Vitest | TypeScript | 90% |
| **Database** | Vitest + Prisma | TypeScript | 80% |
| **Integration** | Vitest + MSW | TypeScript | 75% |
| **E2E** | Playwright | TypeScript | 70% |
| **Mobile** | Jest + Detox | TypeScript/TSX | 75% |

---

## 2. Folder Structure & Organization

### Test Directory Layout

```
tests/
├── unit/                              # Unit tests (Jest + Vitest)
│   ├── api/                          # API route handlers
│   │   ├── auth/
│   │   │   ├── login.test.ts
│   │   │   ├── magic-link.test.ts
│   │   │   ├── refresh.test.ts
│   │   │   └── logout.test.ts
│   │   ├── bookings/
│   │   ├── staff/
│   │   ├── rooms/
│   │   ├── housekeeping/
│   │   ├── payments/
│   │   └── analytics/
│   ├── services/                     # Business logic services
│   │   ├── auth/
│   │   │   ├── passwordReset.test.ts
│   │   │   ├── magicLink.test.ts
│   │   │   └── tokenRefresh.test.ts
│   │   ├── email/
│   │   ├── export/
│   │   ├── sync/
│   │   └── payment/
│   ├── utils/                        # Utility functions
│   │   ├── validation.test.ts
│   │   ├── formatting.test.ts
│   │   ├── calculations.test.ts
│   │   └── transformers.test.ts
│   ├── lib/                          # Library functions
│   │   ├── auth/
│   │   ├── rbac.test.ts
│   │   ├── validation.test.ts
│   │   └── analytics.test.ts
│   └── components/                   # React components
│       ├── auth/
│       │   ├── LoginForm.test.tsx
│       │   └── SignupForm.test.tsx
│       ├── dashboard/
│       ├── widgets/
│       ├── forms/
│       └── layouts/
├── integration/                       # Integration tests
│   ├── auth/
│   │   ├── loginFlow.test.ts
│   │   ├── magicLinkFlow.test.ts
│   │   └── sessionManagement.test.ts
│   ├── booking/
│   │   ├── bookingFlow.test.ts
│   │   ├── paymentIntegration.test.ts
│   │   └── confirmationEmail.test.ts
│   ├── staff/
│   │   ├── staffCRM.test.ts
│   │   ├── taskManagement.test.ts
│   │   └── reportGeneration.test.ts
│   ├── housekeeping/
│   │   ├── taskAssignment.test.ts
│   │   └── statusTracking.test.ts
│   ├── payments/
│   │   ├── paymentProcessing.test.ts
│   │   └── invoiceGeneration.test.ts
│   ├── database/
│   │   ├── transactions.test.ts
│   │   └── dataConsistency.test.ts
│   └── thirdParty/
│       ├── paymentProvider.test.ts
│       └── emailService.test.ts
├── e2e/                              # End-to-End tests (Playwright)
│   ├── auth.spec.ts
│   ├── booking.spec.ts
│   ├── dashboard.spec.ts
│   ├── staff.spec.ts
│   ├── housekeeping.spec.ts
│   └── admin.spec.ts
├── fixtures/                         # Test data & fixtures
│   ├── users.ts
│   ├── bookings.ts
│   ├── hotels.ts
│   ├── rooms.ts
│   ├── staff.ts
│   └── payments.ts
├── mocks/                            # Mock implementations
│   ├── msw/                          # Mock Service Worker
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── database/
│   │   ├── mockPrisma.ts
│   │   └── mockQueries.ts
│   ├── services/
│   │   ├── mockEmailService.ts
│   │   ├── mockPaymentService.ts
│   │   └── mockAuthService.ts
│   └── external/
│       ├── paymentProvider.ts
│       └── smsService.ts
├── helpers/                          # Test utilities
│   ├── testUtils.ts                 # React Testing Library setup
│   ├── dbHelpers.ts                 # Database test helpers
│   ├── apiHelpers.ts                # API testing utilities
│   ├── authHelpers.ts               # Auth test utilities
│   └── assertions.ts                # Custom assertions
├── setup/                            # Test configuration
│   ├── jest.setup.ts
│   ├── vitest.setup.ts
│   ├── playwright.setup.ts
│   └── db.setup.ts
└── snapshots/                        # Jest snapshots
    ├── components/
    └── pages/
```

### Configuration Files

```
Project Root/
├── jest.config.js                   # Jest configuration
├── jest.setup.js                    # Jest setup file
├── vitest.config.ts                 # Vitest configuration (exists)
├── playwright.config.ts             # Playwright configuration
├── .env.test                        # Test environment variables
└── tests/setup/                     # All test setup files
```

---

## 3. Testing Stack & Dependencies

### Frontend Testing

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.1.1"
  }
}
```

### Backend Testing

```json
{
  "devDependencies": {
    "vitest": "^0.34.0",
    "@vitest/ui": "^0.34.0",
    "msw": "^2.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "ts-node": "^10.9.2"
  }
}
```

### E2E Testing

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0"
  }
}
```

### Mobile Testing (Future)

```json
{
  "devDependencies": {
    "detox": "^20.0.0",
    "detox-cli": "^20.0.0"
  }
}
```

---

## 4. Test File Naming Conventions

### Unit Tests

**Pattern**: `{moduleName}.test.ts` or `{ComponentName}.test.tsx`

Examples:
- `auth.test.ts` - Auth service unit tests
- `rbac.test.ts` - RBAC utility tests
- `LoginForm.test.tsx` - React component tests
- `validation.test.ts` - Validation utility tests

### Integration Tests

**Pattern**: `{featureName}Flow.test.ts` or `{featureName}Integration.test.ts`

Examples:
- `loginFlow.test.ts` - Complete login integration
- `bookingFlow.test.ts` - Complete booking process
- `paymentIntegration.test.ts` - Payment processing integration

### E2E Tests

**Pattern**: `{pageName}.spec.ts` (Playwright convention)

Examples:
- `auth.spec.ts` - Authentication page flows
- `dashboard.spec.ts` - Dashboard interactions
- `booking.spec.ts` - Booking page flows

---

## 5. Mock & Fixture Strategy

### Mock Service Worker (MSW) Setup

```typescript
// tests/mocks/msw/handlers.ts
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    // Handle login mock
  }),
  http.post('/api/auth/logout', () => {
    // Handle logout mock
  }),
  // ... more handlers
]

// tests/mocks/msw/server.ts
export const server = setupServer(...handlers)

// tests/setup/jest.setup.ts
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Database Mocking

```typescript
// tests/mocks/database/mockPrisma.ts
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  // ... other models
}
```

### Fixture Data

```typescript
// tests/fixtures/users.ts
export const mockUsers = {
  admin: {
    id: 'user-admin-1',
    email: 'admin@hotel.com',
    name: 'Admin User',
    role: 'ADMIN',
    hotelId: 'hotel-1',
  },
  staff: {
    id: 'user-staff-1',
    email: 'staff@hotel.com',
    name: 'Staff User',
    role: 'STAFF',
    hotelId: 'hotel-1',
  },
  guest: {
    id: 'user-guest-1',
    email: 'guest@hotel.com',
    name: 'Guest User',
    role: 'GUEST',
    hotelId: 'hotel-1',
  },
}
```

---

## 6. Test Categories & Coverage

### Unit Tests (600 total)

#### API Routes (150 tests)
- Authentication (login, logout, refresh, magic-link) - 20 tests
- Bookings (create, read, update, cancel) - 20 tests
- Rooms (list, availability, status) - 15 tests
- Staff (CRUD, roles, activity) - 20 tests
- Housekeeping (tasks, assignments) - 15 tests
- Payments (process, refund, status) - 20 tests
- Analytics (aggregation, filtering) - 20 tests
- Widget/QR endpoints - 15 tests

#### Services (150 tests)
- Auth service (password, magic-link, tokens) - 30 tests
- Email service (templates, sending, queuing) - 25 tests
- Payment service (gateway integration, retry) - 25 tests
- Export service (CSV, JSON, PDF) - 20 tests
- Sync engine (queue, retry, conflict) - 25 tests
- Analytics service (calculations, trends) - 25 tests

#### Components (200 tests)
- Auth forms (login, signup, password reset) - 30 tests
- Dashboard widgets (summary cards, charts) - 30 tests
- Tables/data grids (pagination, sorting, filters) - 40 tests
- Forms (validation, submission, error) - 40 tests
- Navigation (routing, active states) - 20 tests
- Modals/dialogs (open, close, actions) - 20 tests

#### Utilities (100 tests)
- Validation (email, phone, booking rules) - 20 tests
- Formatting (dates, currency, numbers) - 15 tests
- Calculations (pricing, occupancy, revenue) - 20 tests
- Transformers (DB to UI, API responses) - 20 tests
- RBAC checks (permissions, roles) - 15 tests
- Helpers (array, object, string utils) - 10 tests

### Integration Tests (300 total)

#### Auth Flows (50 tests)
- Email + password login - 10 tests
- Magic-link authentication - 10 tests
- Token refresh + expiry - 10 tests
- Session management - 10 tests
- Logout flow - 10 tests

#### Booking Flows (60 tests)
- Create booking → confirm → payment - 15 tests
- Booking modifications - 10 tests
- Cancellation with refunds - 10 tests
- Payment → invoice → email - 15 tests
- Multi-room bookings - 10 tests

#### Staff Management (40 tests)
- Staff CRUD operations - 10 tests
- Role assignments - 10 tests
- Activity tracking - 10 tests
- Performance reporting - 10 tests

#### Housekeeping (50 tests)
- Task creation → assignment → completion - 15 tests
- Room status transitions - 15 tests
- Maintenance requests - 10 tests
- Cleaning schedules - 10 tests

#### Payments (50 tests)
- Payment processing + webhook - 15 tests
- Refund processing - 10 tests
- Reconciliation - 10 tests
- Invoice generation + email - 15 tests

#### Database (50 tests)
- Transaction integrity - 15 tests
- Data consistency checks - 15 tests
- Relationship constraints - 10 tests
- Multi-tenant isolation - 10 tests

### E2E Tests (70 total)

#### Critical User Journeys (70 tests)
- Guest booking flow (check-in to check-out) - 15 tests
- Staff management panel - 12 tests
- Admin dashboard operations - 12 tests
- Hotel manager reporting - 12 tests
- Payment processing - 10 tests
- Mobile app flows - 9 tests

---

## 7. Test Helpers & Utilities

### React Testing Library Setup

```typescript
// tests/helpers/testUtils.ts
import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

### API Testing Helpers

```typescript
// tests/helpers/apiHelpers.ts
export async function makeAuthenticatedRequest(
  method: string,
  path: string,
  body?: object,
  token?: string
) {
  return fetch(`http://localhost:3000${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || 'test-token'}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function getUser(email: string) {
  const res = await fetch(`http://localhost:3000/api/users/by-email?email=${email}`)
  return res.json()
}
```

### Database Helpers

```typescript
// tests/helpers/dbHelpers.ts
export async function createTestUser(userData: Partial<User> = {}) {
  return prisma.user.create({
    data: {
      email: userData.email || 'test@example.com',
      name: userData.name || 'Test User',
      role: userData.role || 'GUEST',
      hotelId: userData.hotelId || 'test-hotel',
      ...userData,
    },
  })
}

export async function createTestBooking(bookingData: Partial<Booking> = {}) {
  const user = await createTestUser()
  return prisma.booking.create({
    data: {
      guestId: bookingData.guestId || user.id,
      hotelId: bookingData.hotelId || 'test-hotel',
      checkInDate: bookingData.checkInDate || new Date(),
      checkOutDate: bookingData.checkOutDate || new Date(),
      status: bookingData.status || 'PENDING',
      ...bookingData,
    },
  })
}

export async function cleanupDatabase() {
  const tables = [
    'booking',
    'room',
    'user',
    'housekeepingTask',
    'payment',
    // ... all tables
  ]
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
}
```

### Authentication Helpers

```typescript
// tests/helpers/authHelpers.ts
export function createMockSession(overrides: Partial<Session> = {}) {
  return {
    user: {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STAFF',
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

export function createMockJWT(claims: Partial<JWTClaims> = {}) {
  return sign({
    sub: 'test-user-1',
    email: 'test@example.com',
    role: 'STAFF',
    hotelId: 'test-hotel',
    ...claims,
  }, process.env.NEXTAUTH_SECRET || 'test-secret')
}
```

---

## 8. Mocking Strategy

### Mock Service Worker

MSW is used for mocking HTTP requests at the network layer:
- Transparent to application code
- Works with fetch, axios, etc.
- Easy to override per test
- Browser and Node.js compatible

### Prisma Mocking

For unit tests, Prisma is mocked to isolate business logic:
- Database calls are mocked
- Integration tests use real database

### External Services

External APIs (payment, email) are mocked:
- Payment provider API responses
- Email service responses
- SMS service (future)

---

## 9. Test Execution Strategy

### Running Tests

```bash
# Run all unit tests
npm test -- tests/unit

# Run integration tests
npm test -- tests/integration

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/auth.test.ts

# Watch mode (development)
npm test -- --watch

# Debug mode
npm test -- --inspect-brk
```

### CI/CD Execution

```bash
# In GitHub Actions workflow
npm run lint
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

---

## 10. Coverage Requirements

### Target Coverage by Module

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| Auth | 95% | 90% | 95% | 95% |
| Bookings | 90% | 85% | 90% | 90% |
| Payments | 95% | 90% | 95% | 95% |
| Housekeeping | 85% | 80% | 85% | 85% |
| Staff | 80% | 75% | 80% | 80% |
| Analytics | 85% | 80% | 85% | 85% |
| Components | 85% | 80% | 85% | 85% |
| **Overall** | **85%** | **80%** | **85%** | **85%** |

---

## 11. Implementation Timeline

### Phase 1: Foundation (Week 1)
- [ ] Set up Jest + Vitest configuration
- [ ] Create test folder structure
- [ ] Implement test helpers + mocks
- [ ] Set up MSW
- [ ] Write 150 unit tests (API routes)

### Phase 2: Core Services (Week 2)
- [ ] Write 150 service unit tests
- [ ] Write 200 component tests
- [ ] Write 100 utility tests
- [ ] Create integration test framework
- [ ] Write 100 integration tests

### Phase 3: Integration & E2E (Week 2-3)
- [ ] Complete integration tests (200 total)
- [ ] Set up Playwright
- [ ] Write 70 E2E tests
- [ ] Generate coverage reports
- [ ] Implement CI/CD

---

## 12. Continuous Integration

All tests run on:
- **Pull Requests**: Lint + unit + integration
- **Before Merge**: E2E + coverage check
- **On Release**: Full suite + performance tests

---

## 13. Best Practices

### DO ✅
- Test behavior, not implementation
- Use data-testid for complex selections
- Mock external dependencies
- Keep tests focused and isolated
- Use descriptive test names
- Arrange-Act-Assert pattern
- Test error cases
- Use factories for test data

### DON'T ❌
- Test framework implementation details
- Use setTimeout in tests
- Skip flaky tests without fixing
- Test multiple concerns per test
- Use `test.only()` in commits
- Mock everything (test real integrations)
- Ignore test failures
- Create interdependent tests

---

## 14. Debugging Tests

### Debug Mode

```bash
# Run with Node inspector
npm test -- --inspect-brk --no-coverage

# In Chrome: chrome://inspect
```

### Playwright Debug

```bash
# Run with Playwright Inspector
npx playwright test --debug

# Generate test trace
npx playwright test --trace on
```

### Test Output

```bash
# Verbose output
npm test -- --verbose

# Show tests as they run
npm test -- --reporter=verbose
```

---

## Next Steps

1. Review and approve this plan
2. Generate all test files (Section 15-20)
3. Implement CI/CD pipelines
4. Create production readiness checklist
5. Deploy to staging environment

---

**This comprehensive plan ensures:**
- ✅ Complete test coverage of all modules
- ✅ Isolated unit tests for fast feedback
- ✅ Integration tests for feature workflows
- ✅ E2E tests for user journeys
- ✅ CI/CD automation for safety
- ✅ Production-ready code quality
- ✅ High confidence in deployments
