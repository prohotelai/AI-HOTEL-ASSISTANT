# 🚀 PMS ADAPTER - QUICK START GUIDE

## 📦 Installation & Setup

### Step 1: Install Dependencies

```bash
npm install axios
# or
yarn add axios
```

### Step 2: Add Environment Variables

Add to `.env`:

```env
# PMS Adapter Feature Flag (OFF by default)
FEATURE_PMS_ADAPTER=false

# Encryption key for PMS credentials (generate a secure random string)
PMS_ENCRYPTION_KEY=your-very-secure-encryption-key-change-this

# Database (already exists)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
```

### Step 3: Apply Database Schema (Optional - Can be done later)

**⚠️ IMPORTANT**: This step is OPTIONAL and can be done when you're ready to use the feature.

1. Open `/prisma/schema.prisma`

2. Add to `Hotel` model:
```prisma
model Hotel {
  // ... existing fields ...
  
  // PMS Adapter (NEW)
  pmsIntegrations PMSIntegration[]
}
```

3. Add all models from `/prisma/schema-pms-adapter.prisma` to the END of `schema.prisma`

4. Run migration:
```bash
npx prisma migrate dev --name add_pms_adapter
npx prisma generate
```

### Step 4: Verify Installation

```bash
# Check TypeScript compilation
npm run build

# Run dev server
npm run dev
```

### Step 5: Test API (Feature Disabled State)

```bash
# Should return 403 with feature disabled message
curl http://localhost:3000/api/pms-adapter/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "error": "PMS Adapter feature is not enabled",
  "message": "Set FEATURE_PMS_ADAPTER=true in environment variables to enable"
}
```

---

## 🎯 Usage Example

### 1. Enable Feature (When Ready)

Update `.env`:
```env
FEATURE_PMS_ADAPTER=true
```

Restart server.

### 2. Test Connection

```typescript
const response = await fetch('/api/pms-adapter/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    pmsName: 'Opera PMS',
    baseUrl: 'https://api.opera.com',
    authType: 'API_KEY',
    credentials: {
      apiKey: 'your-api-key',
      apiSecret: 'your-secret'
    }
  })
})

const result = await response.json()
console.log(result)
// {
//   "success": true,
//   "message": "Connection successful",
//   "details": { "responseTime": 234, "apiVersion": "v5.6" }
// }
```

### 3. Create Integration

```typescript
const integration = await fetch('/api/pms-adapter/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    pmsName: 'Opera PMS',
    pmsType: 'CLOUD',
    version: '5.6',
    baseUrl: 'https://api.opera.com',
    authType: 'API_KEY',
    credentials: {
      apiKey: 'your-api-key',
      apiSecret: 'your-secret'
    },
    mode: 'HYBRID',
    syncIntervalMinutes: 15
  })
})

const { integrationId } = await integration.json()
```

### 4. Configure Mappings

```typescript
await fetch('/api/pms-adapter/map', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    integrationId,
    entityMappings: {
      rooms: {
        entity: 'rooms',
        enabled: true,
        mappings: {
          number: {
            externalField: 'RoomNumber',
            internalField: 'number',
            transformType: 'DIRECT',
            isRequired: true
          },
          floor: {
            externalField: 'Floor',
            internalField: 'floor',
            transformType: 'DIRECT'
          },
          status: {
            externalField: 'RoomStatus',
            internalField: 'status',
            transformType: 'CUSTOM',
            transformCode: 'return value.toUpperCase()'
          }
        }
      }
    },
    syncDirection: 'PULL_ONLY',
    conflictStrategy: 'EXTERNAL_WINS',
    supportedModules: ['rooms', 'bookings']
  })
})
```

### 5. Test Sync (Dry Run)

```typescript
const dryRun = await fetch('/api/pms-adapter/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    entity: 'rooms',
    direction: 'PULL',
    dryRun: true  // ⚠️ Test mode - doesn't commit data
  })
})

const result = await dryRun.json()
console.log(result)
// {
//   "status": "SUCCESS",
//   "recordsProcessed": 50,
//   "recordsSuccess": 50,
//   "recordsFailed": 0,
//   "durationMs": 1234
// }
```

### 6. Enable Integration

```typescript
await fetch('/api/pms-adapter/enable', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
```

### 7. Run Real Sync

```typescript
const sync = await fetch('/api/pms-adapter/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    entity: 'rooms',
    direction: 'PULL'
  })
})
```

### 8. Check Status & History

```typescript
// Get current status
const status = await fetch('/api/pms-adapter/status', {
  headers: { 'Authorization': 'Bearer ' + token }
})

// Get sync history
const history = await fetch('/api/pms-adapter/history?entity=rooms&limit=20', {
  headers: { 'Authorization': 'Bearer ' + token }
})
```

---

## 🔒 Security Checklist

Before enabling in production:

- [ ] Set strong `PMS_ENCRYPTION_KEY` (32+ random characters)
- [ ] Verify RBAC permissions are working (`ADMIN_MANAGE` required)
- [ ] Test with dry-run mode first
- [ ] Review sync logs before enabling auto-sync
- [ ] Set appropriate `syncIntervalMinutes` (recommend 15-30 min)
- [ ] Test connection to external PMS successfully
- [ ] Verify field mappings are correct
- [ ] Enable for one hotel first (pilot testing)

---

## 🐛 Troubleshooting

### TypeScript Errors

**Issue**: `Property 'pMSIntegration' does not exist`

**Solution**: Schema not yet applied. Either:
1. Apply schema (Step 3 above)
2. Or ignore - code is designed to work with feature flag OFF

### Connection Test Fails

**Issue**: `Connection refused` or `Timeout`

**Solutions**:
- Check PMS baseUrl is correct
- Verify PMS API is accessible from your server
- Check credentials are valid
- Review firewall/network settings

### Sync Fails

**Issue**: Sync returns `FAILED` status

**Solutions**:
1. Check sync history: `GET /api/pms-adapter/history`
2. Review error details in response
3. Verify field mappings match PMS schema
4. Test with dry-run first
5. Check PMS API rate limits

### Feature Not Enabling

**Issue**: Endpoints return 403

**Solutions**:
- Verify `FEATURE_PMS_ADAPTER=true` in .env
- Restart server after changing env vars
- Check user has `ADMIN_MANAGE` permission
- Verify authentication token is valid

---

## 📚 API Reference

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pms-adapter/connect` | POST | Create integration |
| `/api/pms-adapter/test` | POST | Test connection |
| `/api/pms-adapter/map` | POST | Save mappings |
| `/api/pms-adapter/enable` | POST | Enable integration |
| `/api/pms-adapter/status` | GET | Get status |
| `/api/pms-adapter/sync` | POST | Manual sync |
| `/api/pms-adapter/history` | GET | Sync history |

All endpoints require:
- Valid authentication token
- `ADMIN_MANAGE` permission (write) or `ADMIN_VIEW` (read)
- `FEATURE_PMS_ADAPTER=true` environment variable

---

## 🎯 Best Practices

1. **Always test with dry-run first**
   ```typescript
   { dryRun: true }
   ```

2. **Start with PULL_ONLY mode**
   - Safer than BIDIRECTIONAL
   - Test thoroughly before enabling PUSH

3. **Use reasonable sync intervals**
   - Minimum: 5 minutes
   - Recommended: 15-30 minutes
   - Consider PMS API rate limits

4. **Monitor sync logs**
   - Check for errors regularly
   - Review failed syncs
   - Adjust mappings as needed

5. **Gradual rollout**
   - Test with one hotel first
   - Monitor for 1-2 weeks
   - Then expand to others

6. **Keep credentials secure**
   - Never log credentials
   - Rotate keys periodically
   - Use strong encryption key

---

## 🆘 Support

**Documentation**:
- `/modules/pms-adapter/README.md` - Full documentation
- `/modules/pms-adapter/SAFETY_CHECKLIST.md` - Safety verification

**Code**:
- Types: `/modules/pms-adapter/types/pms.types.ts`
- Services: `/modules/pms-adapter/services/`
- API: `/app/api/pms-adapter/`

**Database**:
- Schema: `/prisma/schema-pms-adapter.prisma`
- Query logs: `SELECT * FROM "PMSSyncLog"`

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: December 13, 2025
