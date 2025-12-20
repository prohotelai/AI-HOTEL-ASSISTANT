# PMS ADAPTER LAYER - COMPLETE DOCUMENTATION

## 🎯 Overview

The PMS Adapter Layer is a **fully isolated**, **plugin-style** integration system that allows hotels to connect external Property Management Systems (PMS) without modifying any existing core logic, schemas, or APIs.

### Key Features

- ✅ **Fully Isolated** - Zero impact on existing codebase
- 🔒 **Disabled by Default** - Requires explicit enablement
- 🔐 **Secure** - Encrypted credentials, multi-tenant isolation
- 🤖 **AI-Assisted** - Smart mapping suggestions (non-executing)
- 📊 **Audit Trail** - Complete sync history and logging
- 🔄 **Flexible Sync** - PULL, PUSH, or BIDIRECTIONAL
- 🎚️ **Feature-Flagged** - Global on/off switch

---

## 📁 Project Structure

```
/workspaces/AI-HOTEL-ASSISTANT/
├── modules/pms-adapter/              # ← NEW MODULE (ISOLATED)
│   ├── services/
│   │   ├── pmsAdapter.service.ts     # Core orchestration
│   │   ├── pmsConnectionTester.ts    # Connection testing
│   │   ├── pmsMappingEngine.ts       # Field mapping & transformation
│   │   └── pmsSyncEngine.ts          # Sync execution
│   ├── api/
│   │   └── pms.routes.ts             # Route handlers
│   ├── ai/
│   │   └── pmsIntegrationAssistant.prompt.ts  # AI prompts
│   ├── jobs/
│   │   └── pmsSync.job.ts            # Background sync jobs
│   └── types/
│       └── pms.types.ts              # Type definitions
│
├── app/api/pms-adapter/              # ← NEW API ROUTES
│   ├── connect/route.ts              # POST - Create integration
│   ├── test/route.ts                 # POST - Test connection
│   ├── map/route.ts                  # POST - Save mappings
│   ├── enable/route.ts               # POST - Enable/disable
│   ├── status/route.ts               # GET - Get status
│   ├── sync/route.ts                 # POST - Manual sync
│   └── history/route.ts              # GET - Sync history
│
└── prisma/
    └── schema-pms-adapter.prisma     # ← NEW SCHEMA (ISOLATED)
```

---

## 🗃️ Database Schema

### New Tables (5 total)

#### 1. `PMSIntegration`
Stores PMS connection configuration per hotel.

```prisma
model PMSIntegration {
  id                    String   @id @default(cuid())
  hotelId               String   @unique
  pmsName               String
  pmsType               String   # CLOUD | ON_PREMISE | LEGACY
  version               String?
  baseUrl               String?
  authType              String   # API_KEY | OAUTH | BASIC | CUSTOM
  credentialsEncrypted  String   # Encrypted JSON
  mode                  String   # SAAS_ONLY | EXTERNAL_ONLY | HYBRID
  enabled               Boolean  @default(false)  # ⚠️ OFF BY DEFAULT
  autoSyncEnabled       Boolean  @default(false)
  syncIntervalMinutes   Int?     @default(15)
  lastTestAt            DateTime?
  lastTestStatus        String?
  lastTestError         String?
  metadata              Json?
  config                PMSAdapterConfig?
  syncLogs              PMSSyncLog[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

#### 2. `PMSAdapterConfig`
Stores entity mappings and sync configuration.

```prisma
model PMSAdapterConfig {
  id                   String  @id @default(cuid())
  integrationId        String  @unique
  entityMappings       Json    # Field mappings per entity
  syncDirection        String  # PULL_ONLY | PUSH_ONLY | BIDIRECTIONAL
  conflictStrategy     String  # EXTERNAL_WINS | INTERNAL_WINS | MANUAL
  supportedModules     Json    # Array of enabled entities
  fieldTransformations Json?
  validationRules      Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

#### 3. `PMSSyncLog`
Audit trail of all sync operations.

#### 4. `PMSSyncQueue`
Background job queue for scheduled syncs.

#### 5. `PMSFieldMapping`
Detailed field mapping cache/reference.

### Adding to Production Schema

**⚠️ IMPORTANT**: These schemas are currently in `/prisma/schema-pms-adapter.prisma` (isolated).

To activate:
1. Copy contents to the END of `/prisma/schema.prisma`
2. Add `Hotel` relation: `pmsIntegrations PMSIntegration[]`
3. Run: `npx prisma migrate dev --name add_pms_adapter`

---

## 🔌 API Endpoints

All endpoints require `ADMIN_MANAGE` or `ADMIN_VIEW` permission.

### POST `/api/pms-adapter/connect`
Create or update PMS integration.

**Request:**
```json
{
  "pmsName": "Opera PMS",
  "pmsType": "CLOUD",
  "version": "5.6",
  "baseUrl": "https://opera-api.example.com",
  "authType": "API_KEY",
  "credentials": {
    "apiKey": "your-api-key",
    "apiSecret": "your-secret"
  },
  "mode": "HYBRID",
  "syncIntervalMinutes": 15
}
```

**Response:**
```json
{
  "success": true,
  "integrationId": "clxxx...",
  "message": "Integration created successfully (disabled by default)"
}
```

### POST `/api/pms-adapter/test`
Test connection to external PMS.

**Request:**
```json
{
  "pmsName": "Opera PMS",
  "baseUrl": "https://opera-api.example.com",
  "authType": "API_KEY",
  "credentials": {
    "apiKey": "test-key"
  },
  "testEndpoint": "/api/health"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "details": {
    "responseTime": 234,
    "apiVersion": "v5.6",
    "supportedModules": ["rooms", "bookings", "guests"]
  }
}
```

### POST `/api/pms-adapter/map`
Save entity mapping configuration.

**Request:**
```json
{
  "integrationId": "clxxx...",
  "entityMappings": {
    "rooms": {
      "entity": "rooms",
      "enabled": true,
      "mappings": {
        "number": {
          "externalField": "RoomNumber",
          "internalField": "number",
          "transformType": "DIRECT",
          "isRequired": true
        }
      }
    }
  },
  "syncDirection": "PULL_ONLY",
  "conflictStrategy": "EXTERNAL_WINS",
  "supportedModules": ["rooms", "bookings"]
}
```

### POST `/api/pms-adapter/enable`
Enable PMS integration (explicit action required).

### GET `/api/pms-adapter/status`
Get integration status and recent sync history.

### POST `/api/pms-adapter/sync`
Trigger manual sync operation.

**Request:**
```json
{
  "entity": "rooms",
  "direction": "PULL",
  "dryRun": true
}
```

### GET `/api/pms-adapter/history`
Get sync history with filters.

---

## 🚀 Usage Flow

### 1. Admin Setup (First Time)

```javascript
// 1. Test connection
const testResult = await fetch('/api/pms-adapter/test', {
  method: 'POST',
  body: JSON.stringify({
    pmsName: 'Opera PMS',
    baseUrl: 'https://api.opera.com',
    authType: 'API_KEY',
    credentials: { apiKey: 'xxx' }
  })
})

// 2. Create integration (if test passes)
const integration = await fetch('/api/pms-adapter/connect', {
  method: 'POST',
  body: JSON.stringify({
    pmsName: 'Opera PMS',
    pmsType: 'CLOUD',
    mode: 'HYBRID',
    // ... full config
  })
})

// 3. Configure mappings
await fetch('/api/pms-adapter/map', {
  method: 'POST',
  body: JSON.stringify({
    integrationId: integration.integrationId,
    entityMappings: { /* AI-suggested or manual */ },
    syncDirection: 'PULL_ONLY',
    supportedModules: ['rooms', 'bookings']
  })
})

// 4. Test sync (dry run)
const dryRun = await fetch('/api/pms-adapter/sync', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'rooms',
    direction: 'PULL',
    dryRun: true
  })
})

// 5. Enable integration
await fetch('/api/pms-adapter/enable', {
  method: 'POST'
})
```

### 2. Ongoing Usage

```javascript
// Manual sync
await fetch('/api/pms-adapter/sync', {
  method: 'POST',
  body: JSON.stringify({
    entity: 'bookings',
    direction: 'PULL'
  })
})

// Check status
const status = await fetch('/api/pms-adapter/status')

// View history
const history = await fetch('/api/pms-adapter/history?entity=rooms&limit=20')
```

---

## 🔐 Security

### Encryption
- All credentials encrypted using AES-256-CBC
- Encryption key from `PMS_ENCRYPTION_KEY` env var
- Never stored in plain text

### Multi-Tenancy
- All operations scoped by `hotelId`
- RBAC enforcement on all endpoints
- Sync logs tied to hotel

### Rate Limiting
- API calls to external PMS rate-limited
- Configurable sync intervals (min 5 minutes)
- Queue-based execution to prevent overload

---

## 🎛️ Feature Flags

### Global Feature Flag
```env
FEATURE_PMS_ADAPTER=true  # Must be set to enable module
```

### Per-Hotel Flags
- `enabled` - Integration active for hotel
- `autoSyncEnabled` - Background sync enabled

**Default State**: Both `false` - explicit enablement required

---

## 🤖 AI Assistant

The AI assistant (`pmsIntegrationAssistant.prompt.ts`) provides:

1. **Schema Analysis** - Compare external vs internal schemas
2. **Mapping Suggestions** - AI-generated field mappings
3. **Conflict Detection** - Identify issues before sync
4. **Strategy Recommendations** - Best practices advice
5. **Troubleshooting** - Error diagnosis and solutions

**⚠️ CRITICAL**: AI only SUGGESTS, never EXECUTES. All changes require human approval.

---

## 🔄 Sync Modes

### SAAS_ONLY
- No external PMS integration
- All data managed in our system
- Integration layer inactive

### EXTERNAL_ONLY
- Read from external PMS only
- No writes to PMS
- PULL_ONLY sync direction

### HYBRID
- Full bidirectional sync
- Conflict resolution required
- Requires careful testing

---

## 🧪 Testing

### Unit Tests
```bash
npm test modules/pms-adapter/
```

### Manual Testing
```bash
# 1. Test connection
curl -X POST http://localhost:3000/api/pms-adapter/test \
  -H "Content-Type: application/json" \
  -d '{"pmsName":"Test PMS","authType":"API_KEY","credentials":{}}'

# 2. Check status
curl http://localhost:3000/api/pms-adapter/status
```

### Dry Run
Always test with `dryRun: true` before production sync.

---

## 📊 Monitoring

### Sync Logs
```sql
SELECT * FROM "PMSSyncLog" 
WHERE "hotelId" = 'xxx' 
ORDER BY "timestamp" DESC 
LIMIT 50;
```

### Failed Syncs
```sql
SELECT * FROM "PMSSyncLog" 
WHERE "status" = 'FAILED' 
AND "timestamp" > NOW() - INTERVAL '24 hours';
```

### Queue Status
```sql
SELECT * FROM "PMSSyncQueue" 
WHERE "status" = 'PENDING';
```

---

## 🚨 Safety Checklist

See `PMS_ADAPTER_SAFETY_CHECKLIST.md`

---

## 🔧 Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=xxx

# PMS Adapter
FEATURE_PMS_ADAPTER=true              # Enable feature
PMS_ENCRYPTION_KEY=your-secure-key    # Credential encryption
```

---

## 📚 Additional Resources

- **Type Definitions**: `/modules/pms-adapter/types/pms.types.ts`
- **Schema**: `/prisma/schema-pms-adapter.prisma`
- **Services**: `/modules/pms-adapter/services/`
- **API Routes**: `/app/api/pms-adapter/`

---

## 🆘 Support

For issues or questions:
1. Check sync logs in database
2. Review error details in API responses
3. Use AI assistant for troubleshooting
4. Check connection test results

---

**Version**: 1.0.0  
**Status**: Ready for Deployment  
**Last Updated**: December 13, 2025
