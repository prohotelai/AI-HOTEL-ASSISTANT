# Hotel QR Code System - Quick Reference

## 🚀 Quick Start

### Get Hotel QR Code
```typescript
import { getHotelQr } from '@/lib/services/hotelQrService'

const qrData = await getHotelQr(hotelId)
// { qrCode, qrPayload, qrUrl, hotelName } | null
```

### Validate QR Code (Public)
```typescript
import { validateHotelQr } from '@/lib/services/hotelQrService'

const hotelInfo = await validateHotelQr(qrCode)
// { hotelId, hotelName, payload } | null
```

---

## 📝 Key Rules

1. **ONE QR per hotel** - Permanent identity
2. **Generated ONCE** - On hotel creation
3. **NOT regenerable** - By users (system-level only)
4. **Use `getHotelQr()`** - For all QR needs

---

## 🔗 Admin Dashboard

**URL:** `/dashboard/admin/hotel-qr`

**Actions:**
- 📋 Copy URL
- 💾 Download PNG
- 🖨️ Print

**No regeneration button** - QR is permanent

---

## 🌐 API Endpoints

### GET `/api/qr/[hotelId]` - Get QR (Admin)
Returns permanent QR for hotel

### POST `/api/qr/validate` - Validate QR (Public)
Validates QR code and returns hotel info

### ❌ DEPRECATED
- `POST /api/qr/[hotelId]` → 410 Gone
- `POST /api/qr/generate` → 410 Gone

---

## 🔄 Migration

**Add QR to existing hotels:**
```bash
npx ts-node scripts/migrate-hotel-qr-codes.ts
```

---

## 🧪 Tests

```bash
# Unit tests
npm run test -- tests/unit/hotel-qr-service.test.ts

# API tests
npm run test -- tests/integration/hotel-qr-api.test.ts
```

---

## 📚 Full Documentation

See [HOTEL_QR_PERMANENT_SYSTEM.md](./HOTEL_QR_PERMANENT_SYSTEM.md) for complete details.
