# Hotel QR Code System - Permanent Identity Architecture

## 🎯 Overview

The hotel QR code system has been **completely refactored** to use **ONE permanent QR code per hotel** that serves as the hotel's digital identity. This QR code is generated **once** during hotel creation and **cannot be regenerated** by users.

---

## 🏗️ Architecture Changes

### Before (Dynamic QR System)
- ❌ Multiple QR codes per hotel
- ❌ QR codes could be regenerated anytime
- ❌ Different QR codes for booking, room, guest, etc.
- ❌ Complex QR lifecycle management
- ❌ Security concerns with QR proliferation

### After (Permanent Identity System)
- ✅ **ONE QR code per hotel (permanent)**
- ✅ Generated **ONCE** on hotel creation
- ✅ Stored in `Hotel.qrCode` and `Hotel.qrPayload`
- ✅ System behavior determined **after** QR scan
- ✅ Simple, secure, scalable

---

## 📊 Database Schema

### Hotel Model (Updated)

```prisma
model Hotel {
  id        String   @id
  name      String
  slug      String   @unique
  
  // Permanent QR Identity (NEW)
  qrCode    String?  @unique  // 40-char hex token
  qrPayload String?           // JSON: { "hotelId": "...", "type": "hotel_entry" }
  
  // ... other fields
}
```

### QR Payload Structure

```json
{
  "hotelId": "<HOTEL_ID>",
  "type": "hotel_entry"
}
```

**Static, minimal, and immutable.**

---

## 🔧 Core Service Functions

### 1. `getHotelQr(hotelId)` - PRIMARY FUNCTION

```typescript
import { getHotelQr } from '@/lib/services/hotelQrService'

const qrData = await getHotelQr('hotel-123')
// Returns: { qrCode, qrPayload, qrUrl, hotelName } | null
```

**Use this everywhere you need hotel QR information.**

### 2. `validateHotelQr(qrCode)` - PUBLIC VALIDATION

```typescript
import { validateHotelQr } from '@/lib/services/hotelQrService'

const hotelInfo = await validateHotelQr('abc123...')
// Returns: { hotelId, hotelName, payload } | null
```

**Used by `/access` page when QR is scanned.**

### 3. `hotelHasQr(hotelId)` - QUICK CHECK

```typescript
import { hotelHasQr } from '@/lib/services/hotelQrService'

const hasQr = await hotelHasQr('hotel-123')
// Returns: boolean
```

### 4. `generatePermanentHotelQR(hotelId)` - INTERNAL ONLY

```typescript
// ⚠️ ONLY used during hotel creation
// DO NOT call this manually

const { qrCode, qrPayload } = await generatePermanentHotelQR('hotel-123')
```

---

## 🔐 Security & Restrictions

### QR Code Generation Rules

1. ✅ QR generated **ONCE** on hotel creation
2. ❌ Users **CANNOT** regenerate QR codes
3. ❌ No "Generate QR" button in UI
4. ❌ No dynamic QR endpoints available
5. ✅ System-level regeneration only (emergency)

### Regeneration (Emergency Only)

```typescript
import { regenerateHotelQr } from '@/lib/services/hotelQrService'

// Requires system-level permissions + audit logging
await regenerateHotelQr(
  hotelId,
  adminUserId,
  'Security incident - QR compromised'
)
```

**Use case:** Security breach, QR code compromise

---

## 🌐 API Endpoints

### 1. GET `/api/qr/[hotelId]` - Get Hotel QR (Admin)

**Authorization:** Hotel admin/owner

**Response:**
```json
{
  "success": true,
  "qrCode": "abc123def456...",
  "qrUrl": "https://app.com/access?qr=abc123...",
  "hotelName": "Sunset Hotel",
  "payload": {
    "hotelId": "hotel-123",
    "type": "hotel_entry"
  },
  "message": "This is your hotel's permanent QR code"
}
```

### 2. POST `/api/qr/validate` - Validate QR (Public)

**Authorization:** None required

**Request:**
```json
{
  "qrCode": "abc123def456..."
}
```

**Response:**
```json
{
  "success": true,
  "hotelId": "hotel-123",
  "hotelName": "Sunset Hotel",
  "payload": {
    "hotelId": "hotel-123",
    "type": "hotel_entry"
  }
}
```

### 3. POST `/api/qr/[hotelId]` - DEPRECATED ❌

**Status:** `410 Gone`

```json
{
  "error": "QR code generation is no longer available",
  "deprecated": true
}
```

### 4. POST `/api/qr/generate` - DEPRECATED ❌

**Status:** `410 Gone`

```json
{
  "error": "QR code generation is no longer available",
  "deprecated": true
}
```

---

## 🎨 Admin Dashboard

### Hotel QR Page: `/dashboard/admin/hotel-qr`

**Features:**
- 📷 Display permanent QR code
- 📋 Copy QR URL to clipboard
- 💾 Download QR as PNG (512x512)
- 🖨️ Print QR with hotel name
- ⚠️ Warning: Cannot be regenerated

**Actions:**
- **Copy URL** - Copies QR URL to clipboard
- **Download PNG** - Downloads high-res QR image
- **Print** - Print-friendly layout with hotel branding

**UI Elements:**
```tsx
<HotelQRCodePage />
// Located at: app/dashboard/admin/hotel-qr/page.tsx
```

---

## 🔄 Hotel Creation Flow

### Admin Signup Service (Updated)

```typescript
// lib/services/adminSignupService.ts

import { generatePermanentHotelQR } from './hotelQrService'

async function createHotelAndOwner(input) {
  await prisma.$transaction(async (tx) => {
    // 1. Generate permanent QR ONCE
    const { qrCode, qrPayload } = await generatePermanentHotelQR(hotelId)

    // 2. Create hotel with QR
    const hotel = await tx.hotel.create({
      data: {
        id: hotelId,
        name: input.hotelName,
        qrCode,      // ← Permanent QR
        qrPayload,   // ← Static payload
        // ... other fields
      }
    })

    // 3. Create owner user
    const user = await tx.user.create({ /* ... */ })

    return { hotel, user }
  })
}
```

---

## 🔁 Backward Compatibility

### Legacy QR Support

The system supports **legacy QR codes** with deprecation warnings:

**Old Format:**
```
/access?hotelId=hotel-123
```

**New Format:**
```
/access?qr=abc123def456...
```

### Access Page (Updated)

```tsx
// app/access/client.tsx

// Checks both formats:
const qrCode = searchParams.get('qr')         // NEW
const legacyHotelId = searchParams.get('hotelId')  // LEGACY

// Shows warning for legacy QR:
{isLegacyQr && (
  <div className="bg-yellow-50">
    ⚠️ Legacy QR Code Detected
    Please update to new permanent QR
  </div>
)}
```

### Logging

```typescript
console.warn('⚠️ Legacy QR format detected (hotelId)')
// Logged to console when old format is used
```

---

## 📝 Migration Guide

### For Existing Hotels

Run the migration script to add QR codes to existing hotels:

```bash
npx ts-node scripts/migrate-hotel-qr-codes.ts
```

**What it does:**
1. Finds all hotels without `qrCode`
2. Generates permanent QR for each
3. Updates `Hotel.qrCode` and `Hotel.qrPayload`
4. Logs success/failure

**Example Output:**
```
🔄 Starting hotel QR code migration...
📊 Found 15 hotels without QR codes

Processing: Sunset Beach Hotel (hotel-123)
  ✓ Generated QR: abc123def4...

Processing: Mountain View Inn (hotel-456)
  ✓ Generated QR: xyz789abc1...

✅ Migration Complete!
   Success: 15
   Errors: 0
```

---

## 🧪 Testing

### Unit Tests

```bash
npm run test -- tests/unit/hotel-qr-service.test.ts
```

**Coverage:**
- ✅ `getHotelQr()` returns correct data
- ✅ `validateHotelQr()` validates correctly
- ✅ `hotelHasQr()` checks existence
- ✅ QR uniqueness enforcement
- ✅ Payload structure validation

### Integration Tests

```bash
npm run test -- tests/integration/hotel-qr-api.test.ts
```

**Coverage:**
- ✅ GET `/api/qr/[hotelId]` returns QR
- ✅ POST `/api/qr/validate` validates QR
- ✅ Deprecated endpoints return 410
- ✅ Legacy token parameter support
- ✅ One QR per hotel rule

---

## 📋 Checklist for Developers

### When Creating a Hotel
- ✅ Call `generatePermanentHotelQR(hotelId)`
- ✅ Store `qrCode` and `qrPayload` in Hotel model
- ✅ Never skip QR generation

### When Using QR Data
- ✅ Use `getHotelQr(hotelId)` to retrieve QR
- ✅ **Never** call generation functions manually
- ✅ Check if hotel has QR with `hotelHasQr()`

### When Building UI
- ✅ Display QR as **permanent** (no "Regenerate" button)
- ✅ Show Copy/Download/Print actions only
- ✅ Educate users: "This is your hotel's identity"

### When Handling QR Scans
- ✅ Use `validateHotelQr(qrCode)` for validation
- ✅ Support legacy `?hotelId=` format
- ✅ Show deprecation warning for old QRs

---

## 🚨 Common Issues & Solutions

### Issue: Hotel has no QR code
**Solution:** Run migration script or recreate hotel

### Issue: QR code not working
**Solution:** Validate with `validateHotelQr()` function

### Issue: Need to change QR code
**Solution:** QR codes are permanent by design. Only system admins can regenerate in emergencies.

### Issue: Legacy QR still in use
**Solution:** Show deprecation warning but keep supporting it

---

## 📚 Related Files

### Core Files
- `lib/services/hotelQrService.ts` - Main service
- `lib/services/adminSignupService.ts` - Hotel creation
- `prisma/schema.prisma` - Database schema

### API Endpoints
- `app/api/qr/[hotelId]/route.ts` - Get QR (admin)
- `app/api/qr/validate/route.ts` - Validate QR (public)
- `app/api/qr/generate/route.ts` - DEPRECATED

### UI Components
- `app/dashboard/admin/hotel-qr/page.tsx` - QR display page
- `app/access/client.tsx` - QR scan landing page

### Scripts
- `scripts/migrate-hotel-qr-codes.ts` - Migration script

### Tests
- `tests/unit/hotel-qr-service.test.ts` - Unit tests
- `tests/integration/hotel-qr-api.test.ts` - API tests

---

## 🎯 Key Principles

1. **ONE QR PER HOTEL** - Permanent identity
2. **GENERATED ONCE** - On hotel creation only
3. **NOT REGENERABLE** - By design (security + simplicity)
4. **BEHAVIOR AFTER SCAN** - QR is just identity, not action
5. **BACKWARD COMPATIBLE** - Support legacy format with warnings

---

## 📞 Support

For questions or issues:
- Check this documentation first
- Review service function signatures
- Run tests to verify behavior
- Contact system administrator for emergency QR regeneration

---

**✨ The QR code is now a permanent identity of the hotel, not a feature.**
