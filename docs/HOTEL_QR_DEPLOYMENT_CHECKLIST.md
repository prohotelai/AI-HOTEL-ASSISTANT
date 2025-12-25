# Hotel QR System - Deployment Checklist

## ✅ Pre-Deployment

### 1. Database Schema
- [ ] Run `npx prisma generate` to update Prisma client
- [ ] Review schema changes in `prisma/schema.prisma`
- [ ] Confirm `Hotel.qrCode` and `Hotel.qrPayload` fields added
- [ ] Confirm `Hotel.qrCode` has `@unique` constraint

### 2. Migrate Existing Data
- [ ] Backup database before migration
- [ ] Run migration script: `npx ts-node scripts/migrate-hotel-qr-codes.ts`
- [ ] Verify all hotels now have QR codes
- [ ] Check migration logs for errors

### 3. Code Review
- [ ] Review `lib/services/hotelQrService.ts`
- [ ] Verify hotel creation includes QR generation
- [ ] Confirm deprecated endpoints return 410
- [ ] Check backward compatibility in `/access` page

### 4. Testing
- [ ] Run unit tests: `npm run test -- tests/unit/hotel-qr-service.test.ts`
- [ ] Run API tests: `npm run test -- tests/integration/hotel-qr-api.test.ts`
- [ ] Manual test: Create new hotel → verify QR generated
- [ ] Manual test: Access admin QR page → verify display
- [ ] Manual test: Copy/Download/Print buttons work
- [ ] Manual test: Scan QR → verify validation works

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
# Production database
npx prisma migrate deploy

# Or if using direct push
npx prisma db push
```

### 2. Run QR Migration
```bash
# Migrate existing hotels
npx ts-node scripts/migrate-hotel-qr-codes.ts
```

### 3. Deploy Application
```bash
# Build
npm run build

# Deploy (Vercel/platform-specific)
vercel deploy --prod
```

### 4. Verify Deployment
- [ ] Check `/dashboard/admin/hotel-qr` page loads
- [ ] Verify QR code displays correctly
- [ ] Test Copy/Download/Print actions
- [ ] Scan QR code → verify `/access` page works
- [ ] Test legacy QR format → verify warning shows

---

## 🔍 Post-Deployment Verification

### 1. Admin Dashboard
```bash
# Navigate to admin dashboard
open https://your-app.com/dashboard/admin/hotel-qr
```
- [ ] QR code displays
- [ ] Copy button works
- [ ] Download button works
- [ ] Print layout correct
- [ ] No "Generate" or "Regenerate" buttons visible

### 2. API Endpoints
```bash
# Test validation endpoint
curl -X POST https://your-app.com/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{"qrCode":"test-qr-code"}'
```
- [ ] Returns hotel info for valid QR
- [ ] Returns 401 for invalid QR

```bash
# Test deprecated endpoints
curl -X POST https://your-app.com/api/qr/generate
```
- [ ] Returns 410 Gone
- [ ] Includes deprecation message

### 3. Database Verification
```sql
-- Check all hotels have QR codes
SELECT COUNT(*) FROM "Hotel" WHERE "qrCode" IS NULL;
-- Should return 0

-- Check QR uniqueness
SELECT "qrCode", COUNT(*) 
FROM "Hotel" 
WHERE "qrCode" IS NOT NULL 
GROUP BY "qrCode" 
HAVING COUNT(*) > 1;
-- Should return no rows

-- Verify payload structure
SELECT id, name, "qrPayload" 
FROM "Hotel" 
WHERE "qrCode" IS NOT NULL 
LIMIT 5;
-- Check payload format: {"hotelId":"...","type":"hotel_entry"}
```

### 4. End-to-End Test
1. [ ] Create new hotel → QR generated automatically
2. [ ] Navigate to `/dashboard/admin/hotel-qr`
3. [ ] Copy QR URL
4. [ ] Open URL in incognito browser
5. [ ] Verify `/access` page loads with hotel name
6. [ ] Select "Guest Access" or "Staff Access"
7. [ ] Verify redirect works

---

## 🔧 Rollback Plan

If issues arise:

### 1. Database Rollback
```sql
-- If needed, remove QR fields (NOT RECOMMENDED)
-- Better to fix forward than rollback

-- Check current state
SELECT id, name, "qrCode" FROM "Hotel" LIMIT 10;
```

### 2. Code Rollback
```bash
# Revert to previous deployment
vercel rollback
```

### 3. Emergency Fixes
- Legacy QR format still works (backward compatible)
- Old `HotelQRCode` table still exists (read-only)
- System can function without breaking

---

## 🚨 Known Issues & Solutions

### Issue: Hotels without QR
**Solution:** Run migration script again
```bash
npx ts-node scripts/migrate-hotel-qr-codes.ts
```

### Issue: QR not displaying in admin panel
**Solution:** Check browser console for errors, verify API response

### Issue: Print layout broken
**Solution:** Check CSS `@media print` rules

### Issue: Legacy QR not working
**Solution:** Verify `/access` page supports `?hotelId=` parameter

---

## 📊 Monitoring

### Metrics to Track
- [ ] Number of hotels with QR codes
- [ ] QR validation success rate
- [ ] Legacy QR usage (should decrease over time)
- [ ] API endpoint 410 responses (deprecated endpoints)

### Logs to Monitor
```javascript
// Look for these in production logs:
"⚠️ Legacy QR format detected (hotelId)"  // Legacy usage
"QR validation error"                      // Validation failures
"Failed to fetch hotel QR"                 // Admin panel errors
```

---

## 📞 Support & Escalation

### L1 Support (Help Desk)
- Direct users to `/dashboard/admin/hotel-qr`
- Verify QR code displays
- Guide through Copy/Download/Print

### L2 Support (Engineering)
- Check logs for validation errors
- Verify database QR data
- Run migration script if needed

### L3 Support (System Admin)
- Emergency QR regeneration (use `regenerateHotelQr()`)
- Database investigations
- Schema changes

---

## ✅ Final Checklist

- [ ] All tests passing
- [ ] Database migrated
- [ ] Existing hotels have QR codes
- [ ] Admin dashboard displays QR
- [ ] Copy/Download/Print work
- [ ] QR validation works
- [ ] Legacy QR format supported
- [ ] Deprecated endpoints return 410
- [ ] Documentation updated
- [ ] Team notified of changes

---

## 📝 Deployment Sign-Off

**Deployed by:** _________________  
**Date:** _________________  
**Version:** _________________  

**Verification:**
- [ ] Production database updated
- [ ] All hotels have QR codes
- [ ] Admin panel functional
- [ ] QR scanning works
- [ ] No breaking changes

**Notes:**
_________________________________
_________________________________
_________________________________

---

**🎉 Deployment Complete!**

The hotel QR system is now using permanent identity QR codes.
