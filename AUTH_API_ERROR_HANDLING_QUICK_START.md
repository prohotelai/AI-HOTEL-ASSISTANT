# Defensive Error Handling - Quick Reference

**Status:** ✅ COMPLETE  
**Build:** PASSING  
**Coverage:** 9 auth endpoints, 6 error codes, structured logging

---

## Key Changes

### New Utility
**`lib/api/errorHandler.ts`** - Error handling functions

```typescript
import { badRequest, unauthorized, forbidden, notFound, conflict, internalError } from '@/lib/api/errorHandler'

// Use in handlers
return badRequest('message', { endpoint, hotelId, userId, ... })
return internalError(error, context, 'User-friendly message')
```

---

## Error Response Codes

| Code | Use Case | Example |
|------|----------|---------|
| **400** | Invalid input | Missing fields, bad format, validation error |
| **401** | Not authenticated | Missing token, invalid session |
| **403** | No permission | Insufficient role, account suspended |
| **404** | Not found | Resource doesn't exist |
| **409** | Conflict | Email already exists, invalid status |
| **500** | System error | Database error (never raw, always safe) |

---

## Updated Endpoints

### Quick Checklist
- ✅ POST /api/register - Hotel admin signup
- ✅ POST /api/guest/validate - Validate guest identity
- ✅ POST /api/guest/session/create - Create guest session
- ✅ POST /api/staff - Create staff record
- ✅ GET /api/staff - List staff
- ✅ POST /api/staff/activate/validate - Validate staff activation
- ✅ POST /api/auth/staff/change-password - Change password
- ✅ POST /api/auth/guest/qr-token - Generate QR token
- ✅ GET /api/session/me - Get session info

---

## Error Logging Format

All errors include structured context:

```typescript
{
  timestamp: ISO string,
  level: "AUTH-ERROR",
  message: "Clear message",
  endpoint: "/api/...",
  method: "GET|POST|PUT|DELETE",
  hotelId: "H-...",
  userId: "user-...",
  role: "owner|manager|staff|guest",
  errorCode: "400|401|403|404|409|500",
  ...customContext
}
```

---

## Pattern: API Error Handling

```typescript
import { badRequest, internalError } from '@/lib/api/errorHandler'

export async function POST(req: NextRequest) {
  try {
    // 1. Parse input (wrap JSON parsing)
    let body = {}
    try {
      body = await req.json()
    } catch {
      return badRequest('Invalid JSON', { endpoint, method: 'POST' })
    }

    // 2. Validate (return 400 for invalid)
    if (!body.email) {
      return badRequest('Email required', { endpoint, hotelId, ... })
    }

    // 3. Permission check (return 403 if denied)
    if (!hasPermission(role, Permission.ADMIN)) {
      return forbidden('Permission denied', { endpoint, role, ... })
    }

    // 4. DB operation (wrapped in try)
    const result = await service.create(body)

    // 5. Success response
    return NextResponse.json({ success: true })

  } catch (error: any) {
    // 6. Catch ALL errors safely
    return internalError(error, 
      { endpoint, hotelId, userId, method: 'POST' },
      'Operation failed. Please try again.'
    )
  }
}
```

---

## Input Validation Checklist

Before returning data, validate:

- [ ] JSON parsing (wrap in try/catch)
- [ ] Required fields present
- [ ] Format correct (email, URL, etc.)
- [ ] Length constraints met
- [ ] Enum values valid
- [ ] Permission level sufficient
- [ ] Resource exists before operation
- [ ] No conflicts with existing data

---

## Common Error Responses

### Invalid Email
```json
{
  "error": "Bad Request",
  "message": "Invalid email format"
}
```

### Missing Field
```json
{
  "error": "Bad Request",
  "message": "Missing required fields: email, password",
  "details": { "missing": ["email", "password"] }
}
```

### Duplicate Email
```json
{
  "error": "Conflict",
  "message": "Staff record with this email already exists"
}
```

### No Permission
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to create staff records"
}
```

### Not Authenticated
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Not Found
```json
{
  "error": "Not Found",
  "message": "Staff record not found"
}
```

### Server Error (Safe)
```json
{
  "error": "Internal Server Error",
  "message": "Operation failed. Please try again."
}
```

---

## Testing

### Test Invalid Input
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{}'
# Returns: 400 with clear error message
```

### Test Permission Denied
```bash
# With insufficient role
curl -X POST http://localhost:3000/api/staff \
  -H "Authorization: Bearer token"
# Returns: 403 with "Permission denied"
```

### Test Not Found
```bash
curl -X POST http://localhost:3000/api/guest/validate \
  -H "Content-Type: application/json" \
  -d '{"hotelId": "H-123", "documentType": "passport", "documentNumber": "INVALID"}'
# Returns: 404 with "Guest not found"
```

---

## Key Benefits

✅ **No Silent Failures** - All errors logged with context  
✅ **No Leaks** - Error details never exposed in production  
✅ **Clear Codes** - HTTP status codes always correct  
✅ **Traceable** - hotelId, userId, role, endpoint in all errors  
✅ **Safe** - /api/register cannot crash middleware  
✅ **Testable** - All error paths verified  

---

## Debugging Errors

1. **Check logs** - Look for `[AUTH-ERROR]` with endpoint and errorCode
2. **Verify hotelId** - All requests should have hotelId in context
3. **Check role** - Verify user has required permission
4. **Validate input** - Confirm all required fields present
5. **Test endpoint** - Use curl with sample data

---

## Files Changed

- `lib/api/errorHandler.ts` - NEW - Error handling utility
- `app/api/register/route.ts` - Enhanced error handling
- `app/api/guest/validate/route.ts` - Enhanced error handling
- `app/api/guest/session/create/route.ts` - Enhanced error handling
- `app/api/staff/route.ts` - Enhanced error handling (POST + GET)
- `app/api/staff/activate/route.ts` - Enhanced error handling
- `app/api/auth/staff/change-password/route.ts` - Enhanced error handling
- `app/api/auth/guest/qr-token/route.ts` - Enhanced error handling
- `app/api/session/me/route.ts` - Enhanced error handling
