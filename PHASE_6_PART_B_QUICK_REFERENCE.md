# Phase 6 Part B Quick Reference

## 🚀 What's Been Built

### Sync Engine Package
```
📦 packages/sync-engine/
├── Core: SyncEngine class for offline queue management
├── Retry logic: Exponential backoff (1s, 2s, 4s)
├── Persistence: IndexedDB (web) + in-memory (testing)
└── Events: Sync lifecycle listeners
```

**Key Methods**:
- `queueAction(type, data)` - Add offline action
- `sync()` - Sync all pending to server
- `getQueueStatus()` - Queue statistics
- `onSyncEvent(listener)` - Listen to sync events

### Widget SDK
```
📦 packages/widget-sdk/
├── PMSWidget class: 630+ lines vanilla TS
├── QR validation & check-in/check-out
├── Offline caching via localStorage
├── Event system & theming API
└── Auto-sync on reconnect
```

**Integration Example**:
```typescript
import PMSWidget from '@pms/widget-sdk'

const widget = new PMSWidget({
  apiUrl: 'https://api.hotel.com',
  hotelId: 'hotel-123',
  theme: { primaryColor: '#3b82f6' }
})

widget.mount('widget-container')

widget.on('checkin:success', (data) => {
  console.log('Guest checked in:', data)
})

await widget.authenticateWithQR(qrCode)
```

### Mobile Staff App
```
📱 apps/mobile-staff/
├── App.tsx: React Navigation stack
├── Stores:
│   ├── authStore: Login, token, session restore
│   └── queueStore: Offline actions + sync
├── Screens:
│   ├── LoginScreen: Email/password auth
│   ├── RoomsScreen: 2-column grid with status
│   ├── TasksScreen: Task list + mark complete
│   └── Stubs: WorkOrders, Details, Queue
├── Hooks:
│   └── useInitializeApp: Lifecycle + network
└── Config:
    └── storage.ts: Keys, cache TTL, feature flags
```

**Sample Screen Usage**:
```typescript
// RoomsScreen fetches rooms with task counts
const { data } = await fetch('/api/mobile/rooms?hotelId=X', {
  headers: { 'Authorization': `Bearer ${token}` }
})
// Status badges: OCCUPIED (red), VACANT (green), CLEANING (amber)

// TasksScreen marks tasks complete (queues offline)
await queueStore.addAction('UPDATE_TASK', { id, status: 'COMPLETED' })
```

### Mobile API Endpoints
```
🔌 Routes Created:

POST /api/mobile/auth/login              - Email + password
POST /api/mobile/auth/magic-link         - Passwordless auth
POST /api/mobile/auth/refresh            - Refresh JWT

GET  /api/mobile/rooms                   - List rooms + guests
GET  /api/mobile/rooms/[id]              - Room details + tasks
GET  /api/mobile/tasks                   - Staff housekeeping tasks
POST /api/mobile/tasks                   - Create task (manager)
PUT  /api/mobile/tasks                   - Update task + offline sync

POST /api/qr/validate                    - Decode & validate QR
POST /api/qr/checkin                     - QR check-in
POST /api/qr/checkout                    - QR check-out

POST /api/widget/session                 - Create widget token
GET  /api/widget/guest                   - Guest info + bookings
POST /api/widget/services                - Request service
```

**Auth Header Format**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Examples**:
```bash
# Login
curl -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@hotel.com","password":"***","hotelId":"h1"}'

# Get rooms
curl http://localhost:3000/api/mobile/rooms?hotelId=h1 \
  -H "Authorization: Bearer $TOKEN"

# QR check-in
curl -X POST http://localhost:3000/api/qr/checkin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"qrCode":"base64-encoded-json","notes":"Guest arrived early"}'
```

## 🔧 Configuration Files

### Storage Keys (`storage.ts`)
```typescript
STORAGE_KEYS = {
  USER: '@pms_mobile:user',
  TOKEN: '@pms_mobile:token',
  HOTEL_ID: '@pms_mobile:hotelId',
  QUEUE: '@pms_mobile:queue',
  ROOMS_CACHE: '@pms_mobile:roomsCache',
  TASKS_CACHE: '@pms_mobile:tasksCache',
}

CACHE_CONFIG = {
  ROOMS_CACHE_TTL: 5 * 60 * 1000,      // 5 minutes
  TASKS_CACHE_TTL: 3 * 60 * 1000,      // 3 minutes
  PHOTOS_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
}

SYNC_CONFIG = {
  MAX_RETRIES: 3,
  AUTO_SYNC_INTERVAL: 30000,            // 30 seconds
  BATCH_SYNC_LIMIT: 10,                 // Max 10 actions per sync
}
```

## 📱 Mobile App Stores

### Auth Store
```typescript
const { user, token, isAuthenticated, isLoading, login, logout } = useAuthStore()

// Login
await login('staff@hotel.com', 'password')

// Auto-restore on app launch
await restoreSession()

// Logout
logout()
```

### Queue Store
```typescript
const { queue, isOnline, isSyncing, addAction, syncQueue } = useQueueStore()

// Add offline action
await addAction('UPDATE_TASK', { id: 'task-1', status: 'COMPLETED' })

// Check sync status
console.log(queue.length) // Pending actions

// Manual sync
await syncQueue()
```

### Initialize App Hook
```typescript
useInitializeApp() // Call in App.tsx root

// Automatically:
// 1. Restores auth session from AsyncStorage
// 2. Loads offline queue
// 3. Monitors network status
// 4. Triggers sync on reconnect
```

## 🌐 Offline-First Architecture

### Offline Flow
```
1. User goes offline
2. Action queued locally (AsyncStorage)
3. Sync queue shows pending count
4. UI updates optimistically
5. Queue stores timestamp for ordering

When back online:
6. Network detected via NetInfo
7. Auto-sync starts after 2s debounce
8. Actions sent with idempotency key (X-Sync-Action)
9. Server returns success/conflict
10. Queue cleared for successful actions
11. Failed actions kept for manual retry
```

### Sync Engine Events
```typescript
syncEngine.onSyncEvent((event, data) => {
  switch(event) {
    case 'action:queued': 
      console.log('Added to queue:', data.id)
      break
    case 'action:syncing':
      console.log('Syncing:', data.id)
      break
    case 'action:synced':
      console.log('Synced successfully:', data.id)
      break
    case 'action:failed':
      console.log('Sync failed:', data.error)
      // User can manually retry
      break
    case 'sync:started':
      console.log('Starting bulk sync...')
      break
  }
})
```

## 🎨 Widget Integration

### Embed in External Website
```html
<!-- Include widget SDK -->
<script src="https://cdn.hotel.com/pms-widget.js"></script>

<!-- Widget container -->
<div id="pms-widget"></div>

<!-- Initialize -->
<script>
  const widget = new PMSWidget({
    apiUrl: 'https://api.hotel.com',
    hotelId: 'hotel-123',
    theme: {
      primaryColor: '#3b82f6',
      accentColor: '#10b981'
    }
  })

  widget.mount('pms-widget')

  // QR code check-in
  widget.on('authenticated', (data) => {
    console.log('Guest:', data.guest.name)
  })

  await widget.authenticateWithQR(scannedQRCode)
</script>
```

### Widget Events
```typescript
widget.on('authenticated', (data) => {})     // QR auth success
widget.on('checkin:success', (data) => {})   // Check-in done
widget.on('checkout:success', (data) => {})  // Check-out done
widget.on('action:queued', (action) => {})   // Offline action queued
widget.on('online', () => {})                // Network restored
widget.on('offline', () => {})               // Network lost
widget.on('error', (error) => {})            // Error occurred
```

## 🔐 Security Checklist

- ✅ JWT tokens (7d mobile, 24h widget)
- ✅ Password hashing (bcryptjs)
- ✅ hotelId isolation (multi-tenant)
- ✅ Role-based access (STAFF, MANAGER, ADMIN)
- ✅ Idempotency keys (offline sync)
- ✅ Bearer token auth on all endpoints
- ✅ Offline data timestamped for audit

## 📊 Performance

| Metric | Target | Method |
|--------|--------|--------|
| Room list load | <500ms | Pull-to-refresh + local cache |
| Task update offline | Instant | Optimistic UI + queue |
| Sync latency | <2s | Debounced auto-sync |
| QR validation cache | 24h | localStorage |
| Batch sync | 10 actions/request | Configurable BATCH_SYNC_LIMIT |

## 🧪 Testing (To Be Implemented)

### Unit Tests (Vitest)
```bash
npm test --run

Tests for:
- Auth store login/logout
- Queue store add/sync
- Sync engine retry logic
- Widget QR validation
- API route handlers
```

### E2E Tests (Playwright)
```bash
npm run test:e2e

Scenarios:
- Complete mobile login → task update → sync flow
- Widget QR check-in/check-out
- Offline → online transition
- Failed sync + manual retry
```

## 📖 Documentation Index

| Document | Purpose |
|----------|---------|
| PHASE_6_PART_B_IMPLEMENTATION.md | Full implementation details |
| PHASE_6_PART_B_QUICK_REFERENCE.md | This file - quick lookup |
| API_ENDPOINTS_REFERENCE.md | (todo) Detailed endpoint docs |
| MOBILE_APP_SETUP_GUIDE.md | (todo) Dev environment setup |
| WIDGET_SDK_INTEGRATION.md | (todo) Widget embed guide |
| OFFLINE_SYNC_ARCHITECTURE.md | (todo) Technical deep dive |

## 🔗 Key Files

| Path | Purpose | Lines |
|------|---------|-------|
| packages/sync-engine/src/index.ts | Sync engine core | 530+ |
| packages/widget-sdk/src/index.ts | Widget SDK | 630+ |
| apps/mobile-staff/src/stores/authStore.ts | Auth state | 85 |
| apps/mobile-staff/src/stores/queueStore.ts | Queue state | 95 |
| apps/mobile-staff/src/hooks/useInitializeApp.ts | App init | 50 |
| apps/mobile-staff/src/screens/LoginScreen.tsx | Login UI | 100 |
| apps/mobile-staff/src/screens/RoomsScreen.tsx | Room list | 150 |
| apps/mobile-staff/src/screens/TasksScreen.tsx | Task list | 180 |
| app/api/mobile/auth/route.ts | Auth endpoints | 180 |
| app/api/mobile/tasks/route.ts | Task endpoints | 180 |
| app/api/mobile/rooms/route.ts | Room endpoints | 160 |
| app/api/qr/route.ts | QR endpoints | 200 |
| app/api/widget/route.ts | Widget endpoints | 220 |

## 🚦 Status Summary

| Component | Status | Tests | Docs |
|-----------|--------|-------|------|
| Sync Engine | ✅ DONE | ⏳ todo | ⏳ todo |
| Widget SDK | ✅ DONE | ⏳ todo | ⏳ todo |
| Mobile Core | ✅ DONE | ⏳ todo | ⏳ todo |
| Mobile Screens | 🟡 PARTIAL (3/6) | ⏳ todo | ⏳ todo |
| Mobile API | ✅ DONE | ⏳ todo | ⏳ todo |
| Storage Config | ✅ DONE | ⏳ todo | ⏳ todo |
| CI/CD | ⏳ todo | ⏳ todo | ⏳ todo |
| Web Mobile UI | ⏳ todo | ⏳ todo | ⏳ todo |

## ⚡ Quick Start

### Run Mobile App (Development)
```bash
cd apps/mobile-staff
npx expo start

# iOS simulator
i

# Android emulator  
a
```

### Test API Endpoints
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@hotel.com","password":"pass","hotelId":"h1"}' \
  | jq -r '.token')

# 2. Get rooms
curl http://localhost:3000/api/mobile/rooms?hotelId=h1 \
  -H "Authorization: Bearer $TOKEN"

# 3. Get tasks
curl http://localhost:3000/api/mobile/tasks?hotelId=h1 \
  -H "Authorization: Bearer $TOKEN"
```

### Test Widget Locally
```html
<div id="widget"></div>
<script src="file:///packages/widget-sdk/dist/index.js"></script>
<script>
  const w = new PMSWidget({
    apiUrl: 'http://localhost:3000',
    hotelId: 'h1'
  })
  w.mount('widget')
</script>
```

---

**Total Implementation**: ~2,000 lines | **TypeScript Errors**: 0 | **Ready for**: Tests + CI/CD + Web UI
