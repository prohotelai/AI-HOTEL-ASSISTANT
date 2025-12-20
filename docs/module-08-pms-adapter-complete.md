# Module 8 — PMS Adapter Layer

## Overview

The **PMS Adapter Layer** provides seamless integration between the AI Hotel Assistant SaaS platform and external Property Management System (PMS) APIs. It enables automated synchronization of bookings, rooms, and guest profiles from multiple PMS providers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AI Hotel Assistant SaaS                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Admin Dashboard│  │API Endpoints │  │Background Jobs│     │
│  │   (UI)        │  │              │  │   (Queue)     │     │
│  └───────┬──────┘  └──────┬───────┘  └──────┬───────┘     │
│          │                 │                  │              │
│          └─────────────────┼──────────────────┘              │
│                            │                                  │
│          ┌─────────────────▼─────────────────┐               │
│          │     PMS Service Layer              │               │
│          │  - syncProviderBookings()          │               │
│          │  - syncProviderRooms()             │               │
│          │  - syncProviderGuests()            │               │
│          │  - ingestBookingWebhook()          │               │
│          └──────────┬────────────────────────┘               │
│                     │                                          │
│          ┌──────────▼──────────┐                              │
│          │  Provider Registry   │                              │
│          │  - Mock               │                              │
│          │  - Cloudbeds          │                              │
│          │  - Opera              │                              │
│          │  - Mews               │                              │
│          │  - Protel             │                              │
│          └──────────┬──────────┘                              │
│                     │                                          │
│       ┌─────────────┼─────────────┐                           │
│       │             │              │                           │
│  ┌────▼─────┐ ┌────▼─────┐ ┌─────▼──────┐                   │
│  │REST Adapter│ │GraphQL    │ │Webhook    │                   │
│  │ - Retry    │ │Adapter    │ │Handler    │                   │
│  │ - Backoff  │ │           │ │           │                   │
│  └────┬───────┘ └────┬─────┘ └─────┬─────┘                   │
│       │              │             │                           │
└───────┼──────────────┼─────────────┼───────────────────────┘
        │              │             │
        ▼              ▼             ▼
┌───────────────────────────────────────────────────────────┐
│           External PMS Providers                          │
│  (Cloudbeds, Opera, Mews, Protel, etc.)                  │
└───────────────────────────────────────────────────────────┘
```

## Features

### ✅ Implemented

1. **Multi-Provider Support**
   - Mock provider for development/testing
   - Extensible adapter pattern for real PMS integrations
   - Provider registry for easy addition of new providers

2. **Entity Synchronization**
   - **Bookings**: Status, guest info, room, dates, pricing
   - **Rooms**: Availability, status, cleaning status, amenities
   - **Guests**: Profiles, loyalty tiers, preferences, history

3. **Sync Methods**
   - **Manual**: Admin-triggered via dashboard
   - **Scheduled**: Cron-based automatic sync (via BullMQ queue)
   - **Webhook**: Real-time updates from PMS provider

4. **Adapters**
   - **REST**: Exponential backoff, retry logic, timeout handling
   - **GraphQL**: Query/mutation support for GraphQL-based PMS

5. **Admin Dashboard**
   - Provider configuration management
   - Manual sync triggers
   - Sync history and status tracking
   - Error logs and debugging info

6. **RBAC & Multi-Tenancy**
   - Hotel-level isolation (hotelId filtering)
   - Permission-based access (ADMIN_VIEW, ADMIN_EDIT)
   - Audit trail for all sync operations

## Database Schema

### Core Models

#### PMSRoom
Tracks room inventory synced from PMS.

```prisma
model PMSRoom {
  id              String   @id @default(cuid())
  hotelId         String
  provider        String
  externalId      String
  roomNumber      String
  roomType        String?
  floor           Int?
  status          PMSRoomStatus
  cleaningStatus  PMSCleaningStatus
  occupancy       Int?
  maxOccupancy    Int?
  rateCents       Int?
  currency        String?
  amenities       Json?
  metadata        Json?
  externalUpdatedAt DateTime?
  lastSyncedAt    DateTime?
  syncStatus      PMSSyncStatus
  syncError       String?
  
  @@unique([hotelId, provider, externalId])
  @@index([hotelId, status])
}
```

#### PMSGuest
Tracks guest profiles synced from PMS.

```prisma
model PMSGuest {
  id              String   @id @default(cuid())
  hotelId         String
  provider        String
  externalId      String
  firstName       String
  lastName        String
  email           String?
  phone           String?
  country         String?
  dateOfBirth     DateTime?
  loyaltyTier     String?
  totalStays      Int?
  totalSpent      Int?
  preferences     Json?
  metadata        Json?
  externalUpdatedAt DateTime?
  lastSyncedAt    DateTime?
  syncStatus      PMSSyncStatus
  syncError       String?
  
  @@unique([hotelId, provider, externalId])
  @@index([hotelId, email])
}
```

#### PMSSyncLog
Audit trail for sync operations.

```prisma
model PMSSyncLog {
  id              String   @id @default(cuid())
  hotelId         String
  provider        String
  entityType      PMSEntityType
  operation       PMSSyncOperation
  triggeredBy     String?
  status          PMSSyncLogStatus
  itemsProcessed  Int
  itemsFailed     Int
  startedAt       DateTime
  completedAt     DateTime?
  duration        Int?
  errorSummary    Json?
  metadata        Json?
  
  @@index([hotelId, provider, entityType])
  @@index([createdAt])
}
```

#### PMSConfiguration
Per-hotel PMS provider settings.

```prisma
model PMSConfiguration {
  id              String   @id @default(cuid())
  hotelId         String
  provider        String
  enabled         Boolean
  credentials     Json?
  webhookSecret   String?
  syncSchedule    String?
  lastSyncAt      DateTime?
  settings        Json?
  
  @@unique([hotelId, provider])
}
```

### Migration

```bash
npx prisma migrate dev --name add-pms-models
npx prisma generate
```

## API Endpoints

### Sync Bookings

**POST** `/api/pms/sync/bookings`

Manually trigger booking sync from PMS provider.

**Request:**
```json
{
  "provider": "mock",
  "since": "2025-01-01T00:00:00Z",
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "syncLogId": "log_123",
  "summary": {
    "processed": 25,
    "failed": 2,
    "duration": 3450
  }
}
```

**Permissions:** `ADMIN_EDIT`

---

### Sync Rooms

**POST** `/api/pms/sync/rooms`

Manually trigger room inventory sync.

**Request:**
```json
{
  "provider": "mock",
  "limit": 500
}
```

**Response:**
```json
{
  "success": true,
  "syncLogId": "log_124",
  "summary": {
    "processed": 48,
    "failed": 0,
    "duration": 1250
  }
}
```

**Permissions:** `ADMIN_EDIT`

---

### Webhook Endpoint

**POST** `/api/pms/[provider]/bookings`

Receives real-time booking updates from PMS provider.

**Headers:**
- `x-provider-token`: Authentication token
- `x-hotel-slug`: Hotel identifier
- `x-correlation-id`: Optional tracking ID

**Request:**
```json
{
  "booking": {
    "id": "ext-123",
    "status": "confirmed",
    "guest": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "stay": {
      "checkIn": "2025-12-15",
      "checkOut": "2025-12-18",
      "room": "205"
    },
    "totals": {
      "amount": 450.00,
      "currency": "USD"
    }
  }
}
```

**Response:**
```json
{
  "bookingId": "booking_456",
  "status": "synced"
}
```

**Authentication:** Provider-specific token via environment variable (`PMS_MOCK_TOKEN` or `PMS_WEBHOOK_TOKEN`)

## Code Structure

```
lib/pms/
├── types.ts                      # TypeScript interfaces
├── errors.ts                     # PMSIntegrationError class
├── registry.ts                   # Provider adapter registry
├── mappers.ts                    # Entity mapping functions
├── adapters/
│   ├── rest.ts                   # REST adapter with retry logic
│   └── graphql.ts                # GraphQL client adapter
└── providers/
    ├── mockProvider.ts           # Mock PMS for testing
    ├── cloudbedsProvider.ts      # Cloudbeds adapter (TODO)
    ├── operaProvider.ts          # Opera PMS adapter (TODO)
    ├── mewsProvider.ts           # Mews adapter (TODO)
    └── protelProvider.ts         # Protel adapter (TODO)

lib/services/
└── pmsService.ts                 # Core sync orchestration

lib/queues/
└── pmsQueue.ts                   # Background sync jobs (BullMQ)

app/api/pms/
├── sync/
│   ├── bookings/route.ts         # POST /api/pms/sync/bookings
│   └── rooms/route.ts            # POST /api/pms/sync/rooms
└── [provider]/
    └── bookings/route.ts         # POST /api/pms/[provider]/bookings

apps/dashboard/app/(admin)/pms/
├── page.tsx                      # PMS dashboard (server component)
└── PMSClient.tsx                 # Manual sync UI (client component)
```

## Usage Examples

### Adding a New Provider

1. **Create Provider Adapter**

```typescript
// lib/pms/providers/cloudbedsProvider.ts
import { PMSProviderAdapter, NormalizedBooking } from '../types'
import { CloudbedsRESTAdapter } from '../adapters/rest'

class CloudbedsProviderAdapter implements PMSProviderAdapter {
  readonly key = 'cloudbeds'
  private client: CloudbedsRESTAdapter

  constructor(apiKey: string) {
    this.client = new CloudbedsRESTAdapter(apiKey)
  }

  async fetchBookings(hotel, options) {
    const rawBookings = await this.client.getReservations(
      hotel.externalHotelId!,
      options?.since
    )
    return rawBookings.map(this.normalizeBooking)
  }

  normalizeBooking(payload: any): NormalizedBooking {
    return {
      externalId: payload.reservationID,
      status: this.mapStatus(payload.status),
      source: 'OTA',
      guestName: `${payload.guestFirstName} ${payload.guestLastName}`,
      guestEmail: payload.guestEmail,
      roomNumber: payload.roomName,
      checkIn: new Date(payload.startDate),
      checkOut: new Date(payload.endDate),
      totalAmountCents: Math.round(payload.balance * 100),
      currency: payload.currencyCode,
      externalUpdatedAt: new Date(payload.modified),
    }
  }

  private mapStatus(status: string): BookingStatus {
    const map = {
      confirmed: 'CONFIRMED',
      checkedIn: 'CHECKED_IN',
      checkedOut: 'CHECKED_OUT',
      canceled: 'CANCELLED',
    }
    return map[status] || 'PENDING'
  }
}

export const cloudbedsProviderAdapter = new CloudbedsProviderAdapter(
  process.env.CLOUDBEDS_API_KEY!
)
```

2. **Register Provider**

```typescript
// lib/pms/registry.ts
import { cloudbedsProviderAdapter } from './providers/cloudbedsProvider'

export function getProviderAdapter(key: string): PMSProviderAdapter {
  const adapters = {
    mock: mockProviderAdapter,
    cloudbeds: cloudbedsProviderAdapter,
    // Add more providers here
  }

  if (!adapters[key]) {
    throw new PMSIntegrationError(`Unknown PMS provider: ${key}`, {
      statusCode: 400,
      code: 'UNKNOWN_PROVIDER',
    })
  }

  return adapters[key]
}
```

3. **Configure in Database**

```typescript
await prisma.pMSConfiguration.create({
  data: {
    hotelId: 'hotel_123',
    provider: 'cloudbeds',
    enabled: true,
    credentials: {
      apiKey: 'encrypted_key',
      propertyId: 'prop_456',
    },
    webhookSecret: 'webhook_secret',
    syncSchedule: '0 */6 * * *', // Every 6 hours
  },
})
```

### Manual Sync from Code

```typescript
import { syncProviderBookings } from '@/lib/services/pmsService'

// Sync bookings
const summary = await syncProviderBookings('hotel_123', 'mock', {
  since: new Date('2025-01-01'),
  limit: 100,
})

console.log(`Processed: ${summary.processed}, Failed: ${summary.failed}`)
```

### Scheduled Background Jobs

```typescript
// lib/queues/pmsQueue.ts
import { Queue, Worker } from 'bullmq'

export const pmsQueue = new Queue('pms-sync', {
  connection: { host: 'localhost', port: 6379 },
})

// Schedule recurring sync
await pmsQueue.add(
  'sync-bookings',
  { hotelId: 'hotel_123', provider: 'mock' },
  {
    repeat: { cron: '0 */6 * * *' }, // Every 6 hours
  }
)

// Worker
const worker = new Worker(
  'pms-sync',
  async (job) => {
    const { hotelId, provider } = job.data
    await syncProviderBookings(hotelId, provider)
  },
  { connection: { host: 'localhost', port: 6379 } }
)
```

## Testing

### Unit Tests

```typescript
// tests/pms/pmsService.test.ts
import { describe, it, expect, vi } from 'vitest'
import { syncProviderBookings } from '@/lib/services/pmsService'

vi.mock('@/lib/pms/registry', () => ({
  getProviderAdapter: vi.fn(() => ({
    key: 'mock',
    fetchBookings: vi.fn(async () => [
      {
        externalId: 'test-1',
        status: 'CONFIRMED',
        guestName: 'Test Guest',
        checkIn: new Date(),
        checkOut: new Date(),
      },
    ]),
  })),
}))

describe('syncProviderBookings', () => {
  it('should sync bookings successfully', async () => {
    const summary = await syncProviderBookings('hotel_123', 'mock')

    expect(summary.processed).toBe(1)
    expect(summary.failed).toBe(0)
    expect(summary.bookings).toHaveLength(1)
  })
})
```

### Integration Tests

```typescript
// tests/pms/api.test.ts
import { describe, it, expect } from 'vitest'

describe('POST /api/pms/sync/bookings', () => {
  it('should require authentication', async () => {
    const res = await fetch('/api/pms/sync/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'mock' }),
    })

    expect(res.status).toBe(401)
  })

  it('should sync bookings with valid session', async () => {
    // Mock session, make request
    // Verify sync log created
    // Verify bookings upserted
  })
})
```

## Error Handling

### Retry Logic

The REST adapter automatically retries failed requests with exponential backoff:

- **Initial delay**: 1 second
- **Max retries**: 3
- **Backoff multiplier**: 2x (1s → 2s → 4s)
- **Max delay**: 30 seconds
- **Retryable status codes**: 429, 500, 502, 503, 504

### Error Types

```typescript
try {
  await syncProviderBookings(hotelId, provider)
} catch (error) {
  if (error instanceof PMSIntegrationError) {
    console.error(`PMS Error [${error.code}]:`, error.message)
    console.error('Status:', error.statusCode)
  }
}
```

### Sync Failure Handling

- Failed items are logged in `PMSSyncLog.errorSummary`
- Individual booking failures don't halt the entire sync
- Sync continues to next item and reports summary at end

## Security

### Webhook Authentication

Webhooks require provider-specific tokens set via environment variables:

```env
PMS_MOCK_TOKEN=secret_token_123
PMS_CLOUDBEDS_TOKEN=cloudbeds_token_456
PMS_WEBHOOK_TOKEN=fallback_token  # Default if provider-specific not set
```

### Credential Encryption

Store PMS API keys encrypted in `PMSConfiguration.credentials`:

```typescript
import { encrypt, decrypt } from '@/lib/encryption'

const config = await prisma.pMSConfiguration.create({
  data: {
    hotelId,
    provider: 'cloudbeds',
    credentials: {
      apiKey: encrypt(apiKey),
      propertyId: propertyId,
    },
  },
})

// Later, decrypt when needed
const decryptedKey = decrypt(config.credentials.apiKey)
```

### RBAC

- **Sync endpoints**: Require `ADMIN_EDIT` permission
- **Dashboard**: Requires `ADMIN_VIEW` permission
- All operations are hotel-scoped (multi-tenancy isolation)

## Monitoring & Observability

### Metrics to Track

1. **Sync Performance**
   - Sync duration (p50, p95, p99)
   - Items processed per sync
   - Failure rate per provider

2. **Data Quality**
   - Mapping errors (invalid dates, missing fields)
   - Duplicate detection rate
   - Sync lag (time between PMS update and our DB)

3. **Provider Health**
   - API response times
   - Rate limit hits (429 errors)
   - Downtime incidents

### Logging

All sync operations emit structured logs:

```json
{
  "event": "pms.sync.completed",
  "hotelId": "hotel_123",
  "provider": "mock",
  "syncId": "uuid",
  "processed": 25,
  "failed": 2,
  "startedAt": "2025-12-11T10:00:00Z",
  "completedAt": "2025-12-11T10:00:03Z"
}
```

### Event Bus

Emit events for downstream processing:

```typescript
eventBus.emit('pms.booking.synced', {
  bookingId: 'booking_123',
  hotelId: 'hotel_456',
  provider: 'mock',
  externalId: 'ext-789',
  syncedAt: new Date(),
})
```

## Roadmap

### Phase 2
- [ ] Guest sync endpoint (`POST /api/pms/sync/guests`)
- [ ] Housekeeping status sync
- [ ] Maintenance requests sync
- [ ] Rate and availability sync (for OTA distribution)

### Phase 3
- [ ] Real-time WebSocket sync (alternative to webhooks)
- [ ] Conflict resolution UI (handle divergent data)
- [ ] Bi-directional sync (update PMS from our platform)
- [ ] Bulk operations (mass booking updates)

### Phase 4
- [ ] AI-powered mapping suggestions
- [ ] Anomaly detection (unusual sync patterns)
- [ ] Predictive sync scheduling (sync more during peak times)

## Support

### Supported PMS Providers

| Provider   | Status | REST | GraphQL | Webhook |
|------------|--------|------|---------|---------|
| Mock       | ✅ Production | ✅ | N/A | ✅ |
| Cloudbeds  | 🚧 Planned | 🚧 | N/A | 🚧 |
| Opera      | 🚧 Planned | 🚧 | N/A | 🚧 |
| Mews       | 🚧 Planned | N/A | 🚧 | 🚧 |
| Protel     | 🚧 Planned | N/A | 🚧 | 🚧 |

### Adding Support for New Provider

See **Usage Examples → Adding a New Provider** above.

For assistance, contact the development team or open an issue in the repository.

---

**Module Status**: ✅ **Complete**

**Last Updated**: December 11, 2025

**Maintainer**: AI Hotel Assistant Team
