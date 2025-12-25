# AI Setup Wizard - Quick Start Testing Guide

## 🚀 Start the Application

```bash
cd /workspaces/AI-HOTEL-ASSISTANT
npm run dev
```

The app will start on: `http://localhost:3000`

---

## ✅ Test Flow: Fresh Hotel Admin Signup → Wizard → Dashboard

### Step 1: Register New Admin

1. Navigate to: `http://localhost:3000/admin/register`

2. Fill the form:
   - **Name**: John Doe
   - **Email**: `admin@testhotel.com`
   - **Password**: `Test1234!`
   - **Hotel Name**: Test Grand Hotel

3. Click **"Create Account"**

4. **Expected Result**:
   - ✅ Redirected to `/admin/setup-wizard`
   - ✅ Wizard shows Step 1 of 4

---

### Step 2: Complete AI Setup Wizard

#### **Step 1: Hotel Information**

**What you should see**:
- Form with fields: Hotel Name, Country, City, Hotel Type, Website URL
- Progress bar: "Step 1 of 4"

**Actions**:
1. Fill form:
   - Hotel Name: `Test Grand Hotel` (pre-filled)
   - Country: `United States`
   - City: `New York`
   - Hotel Type: `Hotel` (dropdown)
   - Website URL: `https://testhotel.com` (optional)

2. Click **"Continue"**

3. **Expected Result**:
   - ✅ Form submits successfully
   - ✅ Advances to Step 2
   - ✅ Progress bar shows "Step 2 of 4"

---

#### **Step 2: Website Scan**

**What you should see**:
- Description about website scanning
- Two buttons: "Start Scan" and "Skip for Now"

**Test A: Start Scan**
1. Click **"Start Scan"**
2. Watch loading spinner (2 seconds)
3. **Expected Result**:
   - ✅ Advances to Step 3 automatically
   - ❌ **NO 404 ERROR**

**Test B: Skip (Alternative)**
1. Click **"Skip for Now"**
2. **Expected Result**:
   - ✅ Advances to Step 3 immediately
   - ❌ **NO 404 ERROR**

---

#### **Step 3: Review Knowledge**

**What you should see**:
- Large textarea for knowledge base content
- "Confirm & Continue" button

**Actions**:
1. Add some text (optional):
   ```
   Check-in: 3 PM
   Check-out: 11 AM
   Pet-friendly: Yes
   Breakfast: Complimentary 7-10 AM
   ```

2. Click **"Confirm & Continue"**

3. **Expected Result**:
   - ✅ Advances to Step 4
   - ✅ Progress bar shows "Step 4 of 4"

---

#### **Step 4: Test AI**

**What you should see**:
- Chat interface (test area)
- Input field to ask AI questions
- Green "Complete & Go to Dashboard" button

**Actions**:
1. (Optional) Test chat:
   - Type: "What time is check-in?"
   - Click "Send"
   - See simulated AI response

2. Click **"Complete & Go to Dashboard"**

3. **Expected Result**:
   - ✅ Redirected to `/admin/dashboard`
   - ✅ Dashboard loads successfully
   - ✅ Admin header visible
   - ✅ Full dashboard access

---

### Step 3: Verify Guards Work

#### **Test A: Try to Return to Wizard (Should Block)**

1. Navigate to: `http://localhost:3000/admin/setup-wizard`

2. **Expected Result**:
   - ✅ Immediately redirected to `/admin/dashboard`
   - ✅ Cannot access wizard after completion

---

#### **Test B: Fresh User Access (Should Block Dashboard)**

1. Register a **new** admin account:
   - Email: `admin2@testhotel2.com`
   - Password: `Test1234!`
   - Hotel: Test Hotel 2

2. **After signup, try to manually navigate to**:
   - `http://localhost:3000/admin/dashboard`

3. **Expected Result**:
   - ✅ Redirected back to `/admin/setup-wizard`
   - ✅ Wizard loads (wizard incomplete)

---

### Step 4: Test Old Onboarding Routes (Should Redirect)

**Test these URLs** (all should redirect to wizard):

1. `http://localhost:3000/admin/onboarding`
   - **Expected**: Redirects to `/admin/setup-wizard`

2. `http://localhost:3000/onboarding`
   - **Expected**: Redirects to `/admin/setup-wizard`

3. `http://localhost:3000/dashboard/onboarding`
   - **Expected**: Redirects to `/admin/setup-wizard`

---

## ✅ Success Criteria

| Test | Expected Behavior | Pass/Fail |
|------|-------------------|-----------|
| Signup creates wizard | Redirects to `/admin/setup-wizard` | ☐ |
| Step 1 form submits | Advances to Step 2 | ☐ |
| Step 2 scan works | Advances to Step 3 (no 404) | ☐ |
| Step 2 skip works | Advances to Step 3 (no 404) | ☐ |
| Step 3 submits | Advances to Step 4 | ☐ |
| Step 4 completes | Redirects to `/admin/dashboard` | ☐ |
| Completed wizard blocks access | Can't return to wizard | ☐ |
| Incomplete wizard blocks dashboard | Redirects to wizard | ☐ |
| Old onboarding routes redirect | All go to wizard | ☐ |
| No 404 errors | Skip never causes 404 | ☐ |

---

## 🐛 Troubleshooting

### Issue: "Hotel context missing" error

**Cause**: Session not found or hotelId not in session

**Fix**:
1. Log out completely
2. Clear cookies
3. Register fresh account

---

### Issue: Wizard doesn't advance after form submit

**Check**:
1. Open browser DevTools → Console
2. Look for API errors
3. Check if `/api/wizard/progress` returns success

**Debug**:
```bash
# Check database state
npx prisma studio

# Look at OnboardingProgress table
# Verify: status = 'IN_PROGRESS', currentStep = 'stepX'
```

---

### Issue: Dashboard accessible before wizard completion

**Check**:
```bash
# Verify guard is working
# File: app/dashboard/admin/page.tsx

# Should have:
const wizardStatus = await getWizardGuardStatus(context.hotelId)
if (!wizardStatus.isCompleted) {
  redirect('/admin/setup-wizard')
}
```

---

## 📊 Database Check

View wizard state in database:

```bash
npx prisma studio
```

**Table**: `OnboardingProgress`

**Expected Records**:

| hotelId | status | currentStep | completedAt |
|---------|--------|-------------|-------------|
| hotel_abc | IN_PROGRESS | step2 | null |
| hotel_xyz | COMPLETED | null | 2025-12-25T10:30:00Z |

---

## 🔍 API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/wizard/progress` | GET | Fetch current wizard state |
| `/api/wizard/progress` | POST | Complete a step |
| `/api/wizard/skip` | POST | Skip current step |
| `/api/wizard/init` | POST | Initialize wizard |
| `/api/wizard/back` | POST | Go to previous step |

---

## 📝 Notes

- **Skip is disabled on Step 4** (final step must be completed)
- **Wizard state persists** across page refresh
- **Multiple tabs** will sync wizard state
- **Old onboarding routes** are deprecated but safe (redirect only)

---

## ✅ All Tests Pass?

If all tests pass, the wizard refactor is **production-ready**! 🎉

---

*Generated by Senior Next.js Architect & Refactor Agent*
