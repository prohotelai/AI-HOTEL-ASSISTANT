# Widget SDK & Staff Dashboard - Quick Reference

## Quick Start (5 minutes)

### For Guest Widget (In Room Display)

```typescript
// 1. Import widget
<script src="https://cdn.prohotel.ai/widget-sdk.js"></script>

// 2. Initialize with QR
const widget = ProHotelAIWidget.createWidget({
  element: '#container',
  hotelId: 'hotel-123',
  qrAuth: { enabled: true }
})

// 3. That's it! 🎉
// User scans QR → auto-logged in → can chat, create tickets
```

### For Staff Dashboard (Staff Access)

```typescript
// 1. Visit QR login page
// https://yourdomain.com/dashboard/staff/qr-login

// 2. Scan QR code OR paste token

// 3. Access dashboard
// https://yourdomain.com/dashboard/staff

// AI modules available based on permissions
```

---

## API Reference

### Validate QR Token

```bash
POST /api/qr/validate
Content-Type: application/json

{
  "token": "qr_token_here",
  "hotelId": "hotel-123"
}

# Response (200 OK)
{
  "sessionJWT": "eyJ...",
  "user": {
    "id": "user-123",
    "email": "guest@example.com",
    "name": "Guest Name",
    "role": "guest"
  },
  "permissions": ["chat", "tickets"],
  "hotelId": "hotel-123"
}
```

### Get Dashboard Stats

```bash
GET /api/dashboard/staff/stats?hotelId=hotel-123
Authorization: Bearer eyJ...

# Response (200 OK)
{
  "totalTasks": 24,
  "assignedToMe": 8,
  "completedToday": 5,
  "pendingRooms": 12,
  "maintenanceAlerts": 3,
  "forecastedOccupancy": 87
}
```

### Get AI Modules

```bash
GET /api/ai/modules/status
Authorization: Bearer eyJ...

# Response (200 OK)
[
  {
    "id": "night-audit",
    "name": "Night Audit",
    "description": "Automated financial reconciliation",
    "icon": "🌙",
    "status": "available",
    "lastUsed": "2024-01-15 23:30"
  },
  ...
]
```

---

## Code Snippets

### Check Authentication Status

```typescript
// In widget
if (widget.isQRAuthenticated?.()) {
  const session = widget.getQRSession?.()
  console.log(`User: ${session.user.name}`)
}
```

### Check Permissions

```typescript
// In widget
const hasChat = widget.controller?.qrAuth?.hasPermission('chat')
if (!hasChat) {
  console.log('Chat not available')
}
```

### Logout

```typescript
// In widget
widget.logoutQR?.()
// Clears session, redirects to login

// In staff dashboard
const logout = () => {
  localStorage.removeItem('qr_session_user')
  localStorage.removeItem('qr_session_jwt')
  router.push('/dashboard/staff/qr-login')
}
```

### Show/Hide Modules Based on Permissions

```typescript
// In React component
const [modules, setModules] = useState([])

useEffect(() => {
  const token = localStorage.getItem('qr_session_jwt')
  fetch('/api/ai/modules/status', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(setModules)
}, [])

return (
  <div>
    {modules.map(module => (
      <Module key={module.id} {...module} />
    ))}
  </div>
)
```

---

## Security Checklist

✅ Use HTTPS only (except localhost)  
✅ Set NEXTAUTH_SECRET environment variable  
✅ Store token in localStorage (not cookies for CORS)  
✅ Include Authorization header in all API calls  
✅ Verify token hasn't expired before use  
✅ Check user.role matches expected role  
✅ Validate hotelId on server side  

---

## Testing

### Manual Testing

```bash
# 1. Generate QR token (admin dashboard)
# Copy token from admin QR management page

# 2. Test guest login
curl -X POST http://localhost:3000/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"your-token","hotelId":"hotel-123"}'

# 3. Test staff dashboard
curl http://localhost:3000/api/dashboard/staff/stats \
  -H "Authorization: Bearer your-jwt"

# 4. Test AI modules
curl http://localhost:3000/api/ai/modules/status \
  -H "Authorization: Bearer your-jwt"
```

### Automated Testing

```bash
# Run test suite
npm test -- widget-staff-integration.test.ts

# Run with coverage
npm test -- --coverage widget-staff-integration.test.ts
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Token validation fails** | Check token not expired, NEXTAUTH_SECRET set |
| **Camera permission denied** | Use fallback manual entry, check HTTPS |
| **AI modules empty** | Check staff permissions array includes `ai:*` |
| **Cross-hotel access** | Verify hotelId in token matches request |
| **Session expires unexpectedly** | Check token TTL, refresh token if needed |

---

## Environment Variables

```bash
# Required
NEXTAUTH_SECRET=your-secret-key-here

# Optional
QR_TOKEN_EXPIRY=3600              # Seconds (default: 60 min)
QR_REFRESH_TOKEN_EXPIRY=604800    # Seconds (default: 7 days)
WIDGET_API_BASE_URL=https://api.prohotel.ai
```

---

## File Locations

```
widget-sdk/
└── src/
    ├── qrAuth.ts              # QR auth controller
    ├── types.ts               # QR types
    └── __tests__/
        └── qrAuth.test.ts     # Unit tests

app/
├── api/
│   ├── qr/validate/route.ts   # Token validation (existing)
│   ├── dashboard/staff/stats/  # KPI stats (NEW)
│   └── ai/modules/status/      # AI modules (NEW)
└── dashboard/staff/
    ├── qr-login/page.tsx      # Login page (NEW)
    └── page.tsx               # Main dashboard (NEW)

lib/auth/
└── qrAuth.ts                  # Session verification (NEW)

tests/integration/
└── widget-staff-integration.test.ts  # Integration tests (NEW)
```

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build          # Build for production
npm test               # Run all tests
npm test -- --watch   # Watch mode

# Widget SDK
cd widget-sdk
npm run build          # Build UMD bundle
npm run test           # Run widget tests

# Type checking
npm run type-check     # Run TypeScript compiler

# Deployment
npm run build && npm start
```

---

## Performance Tips

1. **Widget Loading**: Use async script tag to prevent blocking
2. **API Caching**: Cache stats/modules for 30-60 seconds
3. **Session Storage**: Check expiration before making requests
4. **AI Modules**: Lazy-load module implementations
5. **Images**: Use WebP with PNG fallback

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial release |

---

## Support

- 📧 Email: support@prohotel.ai
- 🐛 Issues: github.com/prohotel/issues
- 📚 Docs: https://docs.prohotel.ai

---

*Last updated: December 12, 2025*
