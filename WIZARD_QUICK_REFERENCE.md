# AI Setup Wizard – Developer Quick Reference

## What Changed?

**OLD:** 9-step complex onboarding (hotel details, room config, services, etc.)
**NEW:** 4-step focused wizard (hotel info, web scan, knowledge review, test AI)

---

## Key Files

### To Use
- `lib/services/wizard/aiSetupWizardService.ts` - Wizard business logic
- `app/api/wizard/progress/route.ts` - Wizard API endpoints
- `app/admin/setup-wizard/page.tsx` - Wizard UI
- `lib/wizard/wizardGuard.ts` - Helper functions for checks

### To Delete (Phase 2)
- `app/dashboard/onboarding/` - Old wizard pages
- `app/api/onboarding/` - Old wizard API
- `components/onboarding/` - Old wizard components
- `lib/services/onboarding/` - Old onboarding service

---

## Database Fields

### Hotel Model
```typescript
wizardStatus: string | null        // "IN_PROGRESS" | "COMPLETED"
wizardStep: number | null          // 1 | 2 | 3 | 4
wizardCompletedAt: Date | null     // When completed
city: string | null                // Hotel city (NEW)
country: string | null             // Hotel country (NEW)
hotelType: string | null           // Hotel type (NEW)
```

### User Model
```typescript
wizardStatus: string | null        // Mirror of Hotel
wizardStep: number | null          // Mirror of Hotel
wizardCompletedAt: Date | null     // Mirror of Hotel
```

---

## Common Operations

### Load Wizard Progress
```typescript
import { getWizardState, resumeWizard } from '@/lib/services/wizard/aiSetupWizardService'

// Get current state
const state = await getWizardState(hotelId)

// Get current or initialize
const state = await resumeWizard(hotelId)
```

### Complete a Step
```typescript
import { completeStep1, completeStep2, completeStep3, completeStep4 } from '@/lib/services/wizard/aiSetupWizardService'

// Complete step 1
const nextState = await completeStep1(hotelId, {
  hotelName: 'My Hotel',
  country: 'US',
  city: 'NYC',
  hotelType: 'Hotel',
  websiteUrl: 'https://example.com'
})

// Complete step 4 (marks as COMPLETED)
const finalState = await completeStep4(hotelId, {
  testQuestions: 5,
  feedbackGiven: 2
})
```

### Check if Wizard is Complete
```typescript
import { canAccessDashboard, getWizardGuardStatus } from '@/lib/wizard/wizardGuard'

// Simple check
const isComplete = await canAccessDashboard(hotelId)

// Get full status
const guard = await getWizardGuardStatus(hotelId)
console.log(guard.isCompleted, guard.currentStep)
```

---

## API Endpoints

### GET /api/wizard/progress
Get current wizard state.

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/wizard/progress
```

**Response:**
```json
{
  "status": "IN_PROGRESS",
  "step": 2,
  "completedAt": null
}
```

### POST /api/wizard/progress
Complete a step or resume wizard.

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "complete_step",
    "step": 1,
    "data": {
      "hotelName": "My Hotel",
      "country": "US",
      "city": "NYC",
      "hotelType": "Hotel"
    }
  }' \
  http://localhost:3000/api/wizard/progress
```

---

## Routes

### Public (No Auth Required)
- `/admin/register` - Signup (initializes wizard)
- `/admin/login` - Login

### Protected (Auth Required)
- `/admin/setup-wizard` - Main wizard page
  - Redirects to dashboard if completed
  - Resumes from current step if in progress
  - Initializes if never started
- `/admin/dashboard` - Dashboard (locked until wizard completed)
- `/api/wizard/progress` - Wizard API

---

## Wizard Flow in Code

```typescript
// 1. User signs up
POST /api/register
  → Creates User with wizardStatus='IN_PROGRESS', wizardStep=1
  → Creates Hotel with wizardStatus='IN_PROGRESS', wizardStep=1
  → Redirects to /admin/login

// 2. User logs in
POST /api/auth/signin
  → Checks middleware
  → Allows access to /admin/setup-wizard

// 3. User loads wizard
GET /admin/setup-wizard
  → Fetches GET /api/wizard/progress
  → If COMPLETED → redirect to /admin/dashboard
  → If IN_PROGRESS → shows current step
  → If null → initializes step 1

// 4. User completes step
POST /api/wizard/progress
  → Validates step data
  → Updates Hotel + User
  → Returns next step

// 5. User completes final step
POST /api/wizard/progress (step 4)
  → Sets wizardStatus='COMPLETED', wizardStep=null
  → Response triggers redirect to /admin/dashboard

// 6. User accesses dashboard
GET /admin/dashboard
  → Checks wizardStatus
  → If COMPLETED → full access
  → If IN_PROGRESS → show banner + lock
```

---

## Testing Checklist

- [ ] Sign up → Wizard page loads at step 1
- [ ] Complete step 1 → Advances to step 2
- [ ] Refresh at step 2 → Resumes at step 2
- [ ] Complete step 4 → Redirects to dashboard
- [ ] Dashboard refresh → Stays on dashboard (no wizard)
- [ ] Manually visit /admin/setup-wizard → Redirects to dashboard
- [ ] Dashboard shows no lock/banner when completed
- [ ] Migration script runs without errors
- [ ] Existing users' status migrated correctly

---

## Troubleshooting

### Wizard keeps restarting
- Check: `User.wizardStatus` and `Hotel.wizardStatus` are in sync
- Check: `getWizardState()` returns non-null
- Check: Session has correct `hotelId`

### Can't access dashboard
- Check: `User.wizardStatus === 'COMPLETED'`
- Check: Middleware is not blocking route
- Try: Refresh page or clear cookies

### Migration didn't work
- Check: Migration script logs
- Check: Database has new columns (wizardStatus, wizardStep, wizardCompletedAt)
- Check: Old field `onboardingCompleted` still exists (should be kept)
- Try: Run migration with `--verbose` flag

### Data out of sync between User and Hotel
- Check: `syncWizardStateToUser()` is being called
- Check: Both User and Hotel have same wizardStatus/wizardStep
- Fix: Manually update User record to match Hotel

---

## Environment Setup

### Local Development
```bash
# Install dependencies
npm install

# Create/update database
npx prisma migrate dev

# Run migration script
npx ts-node scripts/migrate-onboarding-to-wizard.ts

# Start development server
npm run dev

# Open browser
open http://localhost:3000/admin/register
```

### Staging/Production
```bash
# Deploy code to Vercel (auto-deploys on git push)
git push origin main

# Run migrations on deployed database
npx prisma migrate deploy

# Run data migration
npx ts-node scripts/migrate-onboarding-to-wizard.ts
```

---

## Performance Notes

- Wizard state is loaded on every page load (small query)
- Consider adding cache if performance is concern
- Step completion immediately syncs to database (no buffering)
- API validates all step data before saving

---

## Security Notes

- All endpoints require authentication
- `hotelId` is extracted from session (not request body)
- No wizard state exposed in frontend cookies
- Step data is validated server-side
- User can only access their own hotel's wizard

---

## Future Improvements

1. **Web Scanning (Step 2)**
   - Actually scan website
   - Extract amenities, FAQs, services
   - Use AI to identify tone/style

2. **File Upload (Step 3)**
   - Support PDF/DOC/TXT
   - Parse and chunk documents
   - Embed into knowledge base

3. **Dashboard Locking**
   - Block access to configuration pages
   - Show "Complete wizard" banner
   - Offer progress widget

4. **Analytics**
   - Track completion rate
   - Time per step
   - Dropout points
   - Feature usage correlation

5. **Wizard Variants**
   - Different flows for different hotel types
   - Localization (multi-language)
   - Mobile app variant

