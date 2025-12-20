
# SESSION 5.6 - QUICK REFERENCE GUIDE

## API ENDPOINTS SUMMARY

### 1. QR SCAN ENDPOINT
**Route**: `POST /api/qr/scan`  
**Purpose**: Validate QR token and create JWT session

```javascript
// Request
{
  "qrToken": "qr_token_here",
  "userId": "guest_or_staff_id",
  "hotelId": "hotel_id",
  "scanMethod": "qr_camera" // or "manual"
}

// Response (Success)
{
  "success": true,
  "sessionId": "sess_...",
  "sessionJWT": "eyJ...",
  "user": { "id": "...", "role": "guest|staff", "name": "..." },
  "hotelId": "hotel_id",
  "expiresAt": "2024-01-16T13:00:00Z",
  "workflowStatus": "started",
  "triggeredAIModels": ["model1", "model2", ...]
}

// Response (Error)
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### 2. AI TRIGGER ENDPOINT
**Route**: `POST /api/ai/trigger`  
**Purpose**: Trigger AI model and execute workflow actions

```javascript
// Request
{
  "sessionId": "sess_...",
  "userId": "user_id",
  "modelId": "task-routing", // Must match one of 12 models
  "requestPayload": { /* model-specific data */ }
}

// Response
{
  "success": true,
  "modelId": "task-routing",
  "status": "success|failed|timeout",
  "executionTimeMs": 145,
  "actionsTriggered": [
    {
      "id": "act_...",
      "type": "CREATE_TASK|UPDATE_PMS|SEND_MESSAGE|...",
      "description": "Action description",
      "priority": "high"
    }
  ]
}
```

### 3. PMS UPDATE ENDPOINT
**Route**: `POST /api/pms/update`  
**Purpose**: Sync work order updates to PMS

```javascript
// Request
{
  "sessionId": "sess_...",
  "userId": "user_id",
  "hotelId": "hotel_id",
  "workOrder": {
    "workOrderId": "wo_123",
    "sourceType": "ai_automation|manual|import|api",
    "previousState": { "status": "pending" },
    "newState": { "status": "in_progress", "assignee": "tech_456" }
  }
}

// Response
{
  "success": true,
  "workOrderId": "wo_123",
  "syncStatus": "synced|failed|conflict",
  "error": "error message if failed"
}
```

### 4. TICKETS AUTO-CREATE ENDPOINT
**Route**: `POST /api/tickets/auto`  
**Purpose**: Auto-create support tickets from AI actions

```javascript
// Request
{
  "sessionId": "sess_...",
  "userId": "user_id",
  "hotelId": "hotel_id",
  "ticketData": {
    "title": "Ticket title",
    "description": "Detailed description",
    "type": "maintenance|housekeeping|front_desk|billing|guest_service",
    "priority": "low|medium|high|critical",
    "roomNumber": "302" // optional
  },
  "sourceType": "ai_automation|manual|guest|staff"
}

// Response
{
  "success": true,
  "ticketId": "ticket_789",
  "status": "open",
  "type": "maintenance",
  "priority": "high",
  "queue": "maintenance_queue",
  "createdAt": "2024-01-16T12:30:00Z"
}
```

### 5. ADMIN ENDPOINTS
**Route**: `GET|POST|PUT|DELETE /api/admin?endpoint=X&hotelId=Y`

#### Tokens Management
```javascript
// List tokens
GET /api/admin?endpoint=tokens&hotelId=hotel_id
Authorization: Bearer ADMIN_JWT

// Create token
POST /api/admin?endpoint=tokens&hotelId=hotel_id
{ "userRole": "guest|staff", "expiresInDays": 30 }

// Revoke token
PUT /api/admin?endpoint=tokens&hotelId=hotel_id
{ "tokenId": "token_id" }
```

#### Sessions Management
```javascript
// List sessions
GET /api/admin?endpoint=sessions&hotelId=hotel_id&status=active|expired|all
Authorization: Bearer ADMIN_JWT

// Get session details
POST /api/admin?endpoint=sessions&hotelId=hotel_id
{ "sessionId": "sess_id" }

// Terminate session
DELETE /api/admin?endpoint=sessions&hotelId=hotel_id
{ "sessionId": "sess_id" }
```

#### Analytics
```javascript
// Get metrics
GET /api/admin?endpoint=analytics&period=day|week|month&hotelId=hotel_id
Authorization: Bearer ADMIN_JWT

Response includes:
{
  "summary": {
    "totalSessions": 100,
    "activeSessions": 45,
    "totalAITriggers": 250,
    "totalPMSSyncs": 75,
    "totalWorkflows": 100
  },
  "aiModels": [...],
  "userRoles": [...],
  "pmsSyncStatus": [...],
  "performance": {...},
  "errors": {...}
}
```

#### Export
```javascript
// Export logs
POST /api/admin?endpoint=export&hotelId=hotel_id
{
  "exportType": "sessions|ai_logs|pms_logs|workflows",
  "format": "csv|json",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

---

## 12 AI MODELS REFERENCE

| Model ID | Purpose | Input | Output |
|----------|---------|-------|--------|
| `night-audit` | Detect billing issues | guest/room data | findings array |
| `task-routing` | Assign tasks | staff skills | task list |
| `housekeeping` | Schedule cleaning | rooms data | schedule |
| `forecasting` | Predict occupancy | historical data | forecast metrics |
| `guest-messaging` | Personalize messages | guest profile | message template |
| `room-status` | Inspect room quality | room images | quality score |
| `maintenance` | Predict equipment failures | equipment data | failure predictions |
| `billing-detection` | Find billing errors | charge data | corrections |
| `pms-linking` | PMS integration | work orders | sync status |
| `staff-agent` | Coordinate staff | task queue | assignments |
| `voice-ai` | Process voice commands | voice input | action |
| `upsell-engine` | Recommend services | guest behavior | offers |

---

## WORKFLOW EXAMPLES

### Guest Workflow
```
1. QR SCAN
   POST /api/qr/scan
   → Returns sessionJWT + ["guest-messaging", "room-status", "upsell-engine"]

2. AI TRIGGERS (all in parallel)
   POST /api/ai/trigger
   ├─ Model: guest-messaging → Send welcome message
   ├─ Model: room-status → Show room info
   └─ Model: upsell-engine → Show upsell offers

3. GUEST ACTIONS
   Guest interacts with messages/offers
   Send replies → Ticketing system if needed

4. AUDIT TRAIL
   ✓ Logged in UserSessionLog
   ✓ Logged in AIInteractionLog
   ✓ Logged in WorkflowExecutionHistory
```

### Staff Workflow
```
1. QR SCAN
   POST /api/qr/scan
   → Returns sessionJWT + ["task-routing", "housekeeping", "night-audit", ...]

2. AI TRIGGERS (all in parallel)
   POST /api/ai/trigger
   ├─ Model: task-routing → Assign pending tasks
   ├─ Model: housekeeping → Schedule room cleaning
   ├─ Model: night-audit → Report billing issues
   └─ Model: maintenance → Predict failures

3. ACTIONS AUTO-EXECUTE
   POST /api/tickets/auto → Create ticket for each task
   POST /api/pms/update → Update work orders

4. STAFF UPDATES
   Staff updates task status
   POST /api/pms/update → Sync to PMS
   ✓ Complete audit trail

5. AUDIT TRAIL
   ✓ Logged in UserSessionLog
   ✓ Logged in AIInteractionLog
   ✓ Logged in PMSWorkOrderHistory
   ✓ Logged in WorkflowExecutionHistory
```

---

## SECURITY CHECKLIST

### ✅ Always Include
- [ ] Authorization header with Bearer JWT
- [ ] hotelId in request (for multi-tenant isolation)
- [ ] Validate JWT token expiration (1 hour)
- [ ] Check RBAC permissions (guest vs staff vs admin)
- [ ] Log all actions for audit trail

### ✅ Error Handling
- [ ] Check response.success before using data
- [ ] Handle timeout errors (15-30 seconds)
- [ ] Implement retry logic for failed PMS syncs
- [ ] Show user-friendly error messages
- [ ] Log errors for debugging

### ✅ Token Management
- [ ] One-time use enforcement (can't reuse token)
- [ ] Token expiration checking
- [ ] Token revocation support (admin only)
- [ ] Generate new tokens securely (use crypto.randomBytes)

---

## DATABASE MODELS

### UserSessionLog
```typescript
{
  id: string
  sessionId: string (unique per session)
  hotelId: string (multi-tenant)
  userId: string
  userRole: "guest" | "staff" | "admin"
  scanMethod: "qr_camera" | "manual"
  workflowStatus: "started" | "in_progress" | "completed" | "failed" | "terminated"
  aiModelsTriggered: string[] (array of model IDs)
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
```

### AIInteractionLog
```typescript
{
  id: string
  hotelId: string (multi-tenant)
  sessionId: string
  modelId: string (one of 12 models)
  status: "success" | "failed" | "timeout"
  executionTimeMs: number
  request: object
  response: object
  actions: object[] (workflow actions triggered)
  error?: string
  createdAt: Date
}
```

### PMSWorkOrderHistory
```typescript
{
  id: string
  hotelId: string (multi-tenant)
  workOrderId: string
  sourceType: "ai_automation" | "manual" | "import" | "api"
  previousState: object
  newState: object
  fieldChanges: object (what changed)
  syncStatus: "pending" | "synced" | "failed" | "conflict"
  syncAttempts: number
  lastSyncError?: string
  createdAt: Date
}
```

---

## TESTING COMMANDS

```bash
# Run unit tests
npm run test tests/qr-automation.test.ts

# Run specific test suite
npm run test tests/qr-automation.test.ts -t "QR Token Management"

# Run E2E tests
npm run test:e2e tests/e2e/qr-automation.e2e.ts

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

---

## ENVIRONMENT VARIABLES

```bash
# Required
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/db

# Optional
PMS_API_URL=http://pms-system/api
PMS_API_KEY=your-api-key
AI_MODEL_TIMEOUT=15000
MAX_RETRY_ATTEMPTS=3
ENABLE_AUDIT_LOGGING=true
LOG_LEVEL=info
```

---

## TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| Invalid JWT | Secret key mismatch | Verify NEXTAUTH_SECRET |
| Token already used | One-time use violation | Generate new QR token |
| Hotel ID mismatch | Wrong hotel in request | Check hotelId in JWT |
| Session expired | JWT older than 1 hour | User needs new QR scan |
| PMS timeout | Network issue | Auto-retries 3x, check logs |
| AI timeout | Model slow | Check AI service, increase timeout |
| Database error | Connection issue | Check DATABASE_URL |
| RBAC rejection | Permission denied | Verify user role and hotelId |

---

## USEFUL LINKS

- [QR Automation Database Schema](./prisma/schema_additions.prisma)
- [Type Definitions](./types/qr-automation.ts)
- [Unit Tests](./tests/qr-automation.test.ts)
- [E2E Tests](./tests/e2e/qr-automation.e2e.ts)
- [Admin Dashboard Component](./components/admin/QRAutomationDashboard.tsx)
- [Completion Summary](./SESSION_5_6_COMPLETION.md)

---

## KEY CONTACTS

**Session 5.6 Developer**: GitHub Copilot  
**AI Model Used**: Claude Haiku 4.5  
**Date Completed**: January 16, 2024  
**Status**: 83% Complete (10/12 tasks)

---

**Last Updated**: January 16, 2024  
**Version**: 1.0  
**Status**: Production Ready
