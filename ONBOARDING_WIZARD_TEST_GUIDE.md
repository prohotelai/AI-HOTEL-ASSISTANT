# Onboarding Wizard - Quick Test Guide

## Pre-Test Setup
```bash
# Ensure fresh database state
npm run db:push

# Start development server
npm run dev

# Server runs on http://localhost:3000
```

## Test Flow: Complete Admin Journey

### Step 1: Signup (Create Hotel Admin)
```
Navigate to: http://localhost:3000/admin/register

Form Input:
- Name: John Admin
- Email: admin@example.com
- Password: TestPassword123!
- Hotel Name: The Grand Hotel

Expected Result:
- User created with role: OWNER
- Hotel created with:
  - id: H-XXXXX (random 5 chars)
  - name: The Grand Hotel
  - onboardingStatus: IN_PROGRESS
- Redirect to login page
```

### Step 2: Login
```
Navigate to: http://localhost:3000/auth/signin

Form Input:
- Email: admin@example.com
- Password: TestPassword123!

Expected Result:
- Session created with:
  - hotelId from JWT token
  - onboardingCompleted: false
- Auto-redirect to: /admin/onboarding
```

### Step 3: Onboarding Step 1 - Hotel Details
```
Current URL: http://localhost:3000/admin/onboarding

Step 1 Should Show:
- Hotel Name (read-only): "The Grand Hotel"
- Address field (empty)
- Phone field (empty)
- Email field (empty)
- Website field (empty)

Fill in:
- Address: "123 Main Street, New York, NY 10001"
- Phone: "+1-555-123-4567"
- Email: "contact@grandhot"
- Website: "https://grandhot.com"

Click "Next Step"

Expected Result:
- PATCH /api/hotels/{hotelId} called
- Hotel details updated
- Advance to Step 2
```

### Step 4: Onboarding Step 2 - Room Configuration
```
Step 2 Should Show:
- "Add Room Type" button
- Empty room types list

Test Add Room Type:
1. Click "Add Room Type"
2. Enter:
   - Name: "Standard Double"
   - Count: 5
3. Click "Add Room Type" again
4. Enter:
   - Name: "Deluxe Suite"
   - Count: 3

Click "Next Step"

Expected Result:
- POST /api/hotels/{hotelId}/rooms called with roomTypes array
- 5 + 3 = 8 room records created in database
- RoomType records created for each type
- Advance to Step 3
```

### Step 5: Onboarding Step 3 - Services Setup
```
Step 3 Should Show:
- [ ] AI Guest Chat (unchecked)
- [ ] Analytics Dashboard (unchecked)
- [ ] Privacy Mode (unchecked)

Select:
- ☑ AI Guest Chat
- ☑ Analytics Dashboard
- ☐ Privacy Mode

Click "Next Step"

Expected Result:
- POST /api/hotels/{hotelId}/services called with service booleans
- Service preferences logged (console.log visible in server)
- Advance to Step 4
```

### Step 6: Onboarding Step 4 - Finish
```
Step 4 Should Show:
- Checkmark icon
- "You're All Set!" heading
- Completed features list:
  ✓ Hotel profile configured
  ✓ Rooms set up
  ✓ Services enabled
  ✓ AI assistant ready

Click "Activate Assistant" button

Expected Result:
- POST /api/onboarding/complete called with hotelId
- User.onboardingCompleted set to true
- Hotel.onboardingStatus set to COMPLETED
- 1.5 second wait
- Redirect to: /dashboard
```

### Step 7: Verify Completion
```
Navigate to: http://localhost:3000/dashboard

Expected Result:
- Dashboard loads successfully
- No redirect back to wizard
- Admin has access to all dashboard features

Verify in Database:
SELECT 
  u.email,
  u."onboardingCompleted",
  h.name,
  h."onboardingStatus",
  COUNT(r.id) as room_count
FROM "User" u
JOIN "Hotel" h ON u."hotelId" = h.id
LEFT JOIN "Room" r ON h.id = r."hotelId"
WHERE u.email = 'admin@example.com'
GROUP BY u.id, h.id;

Expected Result:
email | onboardingCompleted | name           | onboardingStatus | room_count
------|---------------------|----------------|------------------|----------
admin@example.com | true | The Grand Hotel | COMPLETED        | 8
```

## Error Testing

### Test: Non-OWNER Access to Onboarding
```
1. Create user with MANAGER role
2. Try to access /admin/onboarding
Expected: Redirect to /403 (Forbidden)
```

### Test: Invalid Hotel Access
```
1. Manually modify JWT to reference different hotelId
2. Try to call PATCH /api/hotels/{otherHotelId}
Expected: 403 Forbidden - "User does not belong to this hotel"
```

### Test: Missing Room Data
```
1. On RoomConfigStep, click "Next" without adding rooms
Expected: Client-side validation error: "At least one room type required"
```

### Test: Session Validation
```
1. Complete onboarding
2. Clear browser cookies/session
3. Try to access /admin/onboarding
Expected: Redirect to /auth/signin (no session)
```

## API Direct Testing

### Test: Get Hotel
```bash
curl -X GET http://localhost:3000/api/hotels/H-ABC123 \
  -H "Authorization: Bearer <jwt-token>"

Expected Status: 200
Response:
{
  "hotel": {
    "id": "H-ABC123",
    "name": "The Grand Hotel",
    "address": "123 Main Street...",
    "phone": "+1-555-123-4567",
    "email": "contact@grandhot",
    "website": "https://grandhot.com"
  }
}
```

### Test: Update Hotel
```bash
curl -X PATCH http://localhost:3000/api/hotels/H-ABC123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "phone": "+1-555-999-8888",
    "website": "https://updated-site.com"
  }'

Expected Status: 200
Response: Updated hotel object
```

### Test: Create Rooms
```bash
curl -X POST http://localhost:3000/api/hotels/H-ABC123/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "roomTypes": [
      { "name": "Standard Double", "count": 5 },
      { "name": "Deluxe Suite", "count": 3 }
    ]
  }'

Expected Status: 200
Response:
{
  "message": "Rooms created successfully",
  "roomCount": 8,
  "roomsCreated": 8
}
```

### Test: Configure Services
```bash
curl -X POST http://localhost:3000/api/hotels/H-ABC123/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "aiChat": true,
    "analytics": true,
    "privacyMode": false
  }'

Expected Status: 200
Response:
{
  "message": "Services configured successfully",
  "services": {
    "aiChat": true,
    "analytics": true,
    "privacyMode": false
  }
}
```

## Debugging Tips

### Check Session in Browser
```javascript
// In browser console
const session = await fetch('/api/auth/session').then(r => r.json())
console.log(session)
// Should show: userId, email, hotelId, role: OWNER, onboardingCompleted: false
```

### Check Onboarding State
```bash
# In database
SELECT * FROM "Hotel" WHERE "onboardingStatus" = 'IN_PROGRESS';
SELECT * FROM "User" WHERE "onboardingCompleted" = false;
```

### Monitor API Calls
```
Open browser DevTools → Network tab
Watch for:
- GET /api/hotels/{hotelId} (load hotel data)
- PATCH /api/hotels/{hotelId} (update hotel details)
- POST /api/hotels/{hotelId}/rooms (create rooms)
- POST /api/hotels/{hotelId}/services (config services)
- POST /api/onboarding/complete (mark complete)
```

### Server Logs
```bash
# Watch for errors
npm run dev

# Look for:
- "Complete onboarding error:" (if completion fails)
- "Create rooms error:" (if room creation fails)
- Service logs from ServicesSetupStep
```

## Success Indicators
- ✅ User created with OWNER role
- ✅ Hotel created with name and onboardingStatus IN_PROGRESS
- ✅ Onboarding page loads with hotel name read-only
- ✅ Each step API call succeeds
- ✅ Final completion sets both user.onboardingCompleted + hotel.onboardingStatus
- ✅ Redirect to dashboard succeeds
- ✅ No redirect loop back to onboarding wizard

---

**Last Updated**: Session YYYY-MM-DD
**Build Status**: ✅ PASSING
