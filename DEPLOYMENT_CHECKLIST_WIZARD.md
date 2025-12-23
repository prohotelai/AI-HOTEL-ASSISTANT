# Deployment Checklist – AI Setup Wizard

## Pre-Deployment

### Code Review
- [ ] All TypeScript types are correct
- [ ] No console.logs left in production code
- [ ] Error messages are user-friendly
- [ ] API endpoints follow REST conventions
- [ ] UI is mobile-responsive

### Testing
- [ ] Unit tests pass: `npm test`
- [ ] Integration tests pass for API endpoints
- [ ] Manual test flow completed (see WIZARD_IMPLEMENTATION_COMPLETE.md)
- [ ] No TypeScript compilation errors: `npm run build`
- [ ] Linting passes: `npm run lint`

### Database
- [ ] Prisma schema is valid: `npx prisma validate`
- [ ] Migration file created: `prisma/migrations/[timestamp]_add_wizard_fields/migration.sql`
- [ ] No foreign key conflicts
- [ ] Indexes are appropriate for queries

### Documentation
- [ ] WIZARD_IMPLEMENTATION_COMPLETE.md is complete
- [ ] WIZARD_QUICK_REFERENCE.md is complete
- [ ] This checklist is complete
- [ ] API documentation is accurate

---

## Deployment Steps

### Step 1: Deploy Code (Vercel Auto-Deploy)
```bash
git add .
git commit -m "Feature: New AI Setup Wizard (4-step simplified flow)

- Add wizard fields to User + Hotel models
- Create new /admin/setup-wizard page
- Implement 4-step wizard (hotel info → web scan → KB review → test AI)
- Add wizard progress API endpoints
- Add guard logic for resume/redirect
- Include data migration script

Replaces old complex 9-step onboarding with focused 4-minute wizard."
git push origin main
```
- [ ] Code pushed to main
- [ ] Vercel deployment triggered
- [ ] All CI checks passing (see Vercel logs)

### Step 2: Apply Database Migration
```bash
# SSH into production database or use Vercel integrated database tools
npx prisma migrate deploy

# Verify schema:
npx prisma db execute --file scripts/verify-schema.sql

# Expected: All 6 new columns exist with NULL values
```
- [ ] Migration runs successfully
- [ ] No errors in logs
- [ ] New columns exist in database

### Step 3: Run Data Migration
```bash
# From local or production environment
npx ts-node scripts/migrate-onboarding-to-wizard.ts

# Expected output:
# 🔄 Starting migration: onboardingCompleted → wizardStatus
# Found X users with completed onboarding
# ✅ Migrated: Y
# ⚠️  Skipped: Z
# ✅ Migration complete!
```
- [ ] Migration script runs without errors
- [ ] All existing users migrated
- [ ] Check migration logs for any failures

### Step 4: Verify Deployment

#### On Staging
```bash
# 1. Sign up new hotel
POST /admin/register
  - Email: testhotel@example.com
  - Password: TestPassword123!
  - Hotel: "Test Hotel Staging"
  ✓ Should redirect to /admin/login

# 2. Log in
POST /api/auth/signin (testhotel@example.com)
  ✓ Should see setup-wizard page

# 3. Complete wizard
GET /admin/setup-wizard
  ✓ Should load step 1

POST /api/wizard/progress (complete step 1)
  ✓ Should advance to step 2

... repeat for steps 2, 3, 4 ...

POST /api/wizard/progress (complete step 4)
  ✓ Should redirect to /admin/dashboard

# 4. Verify lock
GET /admin/setup-wizard (after completion)
  ✓ Should redirect to /admin/dashboard

# 5. Verify persistence
Refresh /admin/dashboard
  ✓ Should stay on dashboard (not wizard)

# 6. Check database
SELECT wizardStatus, wizardStep, wizardCompletedAt FROM "User" WHERE email = 'testhotel@example.com'
  ✓ Should show: COMPLETED, NULL, <timestamp>
```
- [ ] New signup works
- [ ] Wizard loads correctly
- [ ] All 4 steps complete
- [ ] Redirect to dashboard works
- [ ] Dashboard refresh stays on dashboard
- [ ] Manual /admin/setup-wizard visit redirects
- [ ] Database shows COMPLETED status

#### On Production
```bash
# Repeat same flow on production
# Use real email address or test email
# Verify in production database
```
- [ ] Production signup works
- [ ] Production wizard works
- [ ] Production database updated

### Step 5: Monitor & Rollback

#### Monitor
```bash
# Watch logs for errors
tail -f logs/api.log | grep wizard
tail -f logs/auth.log | grep setup

# Check error tracking service (Sentry, etc.)
# Look for wizard-related errors in last hour

# Check analytics
# Track wizard start/completion rates
```
- [ ] No errors in application logs
- [ ] No errors in error tracking service
- [ ] Wizard completion rate > 80%

#### Rollback (if needed)
```bash
# 1. Revert code
git revert <commit-hash>
git push origin main
# Vercel auto-deploys reverted code

# 2. Reset database (keep schema)
UPDATE "User" SET "wizardStatus" = NULL, "wizardStep" = NULL, "wizardCompletedAt" = NULL;
UPDATE "Hotel" SET "wizardStatus" = NULL, "wizardStep" = NULL, "wizardCompletedAt" = NULL;

# 3. Verify revert
GET /admin/setup-wizard (should 404 or redirect)
GET /admin/onboarding (old wizard should still work)
```

---

## Post-Deployment

### Documentation
- [ ] Update README.md with new wizard information
- [ ] Update onboarding docs in wiki/help
- [ ] Update API documentation
- [ ] Notify team in Slack/Discord

### User Communication
- [ ] Email to existing hotels about new faster wizard
- [ ] Update help/support documentation
- [ ] Create FAQ for common wizard questions
- [ ] Add wizard guide to onboarding email

### Monitoring (24-48 hours post-deploy)
- [ ] Check wizard completion rate
- [ ] Monitor API error rates
- [ ] Watch for support tickets
- [ ] Monitor database performance
- [ ] Check user feedback

### Phase 2 Planning
- [ ] Schedule cleanup of old wizard code (1-2 weeks)
- [ ] Plan web scanning implementation (Step 2)
- [ ] Plan file upload support (Step 3)
- [ ] Plan dashboard locking UI
- [ ] Plan analytics dashboard

---

## Rollback Checklist

If problems occur:

### Immediate Actions
1. [ ] Assess severity (critical vs minor)
2. [ ] Check error logs for patterns
3. [ ] Check user impact (how many affected)
4. [ ] Decide: Fix forward or rollback

### If Rollback Needed
1. [ ] Notify team immediately
2. [ ] Revert code: `git revert <commit>`
3. [ ] Deploy: `git push origin main` (auto-deploys)
4. [ ] Reset DB: Run rollback SQL
5. [ ] Verify: Test old wizard still works
6. [ ] Communicate: Post mortem to team

### If Fixing Forward
1. [ ] Identify root cause
2. [ ] Create hotfix branch: `git checkout -b hotfix/wizard-issue`
3. [ ] Apply fix + test
4. [ ] Create PR + merge to main
5. [ ] Deploy fix
6. [ ] Verify in production
7. [ ] Document in incident report

---

## Sign-Off

### Development Team
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Local testing complete
- Approved by: __________________ Date: __________

### QA/Testing Team
- [ ] Staging testing complete
- [ ] All test cases passed
- [ ] Performance acceptable
- [ ] No regressions found
- Approved by: __________________ Date: __________

### DevOps/Infrastructure
- [ ] Database migrations validated
- [ ] Backup created before migration
- [ ] Monitoring configured
- [ ] Rollback plan tested
- Approved by: __________________ Date: __________

### Product Team
- [ ] Feature meets requirements
- [ ] User experience verified
- [ ] Documentation complete
- [ ] Go/no-go decision made
- Approved by: __________________ Date: __________

---

## Post-Deployment Verification (48 Hours)

- [ ] Wizard completion rate ≥ 80%
- [ ] No critical errors in logs
- [ ] API response time ≤ 200ms
- [ ] Database query time ≤ 100ms
- [ ] Zero support tickets about wizard crashes
- [ ] User feedback is positive
- [ ] Existing hotels' status correctly migrated
- [ ] New signups complete wizard successfully

---

## Success Criteria

✅ **DEPLOYMENT SUCCESSFUL** when:

1. ✓ Code deployed to production
2. ✓ Database migrations applied
3. ✓ Data migration completed
4. ✓ No critical errors in logs
5. ✓ Staging tests passed
6. ✓ Production signup → wizard → dashboard flow works
7. ✓ Wizard completion rate ≥ 80%
8. ✓ Zero user-facing regressions
9. ✓ Existing users' status preserved

---

## Notes

- Keep old OnboardingProgress model until Phase 2 (safe to delete later)
- Keep registrationStatus/registrationStep on User (separate from wizard)
- Monitor wizard drop-off rates by step (Step 2 should be fastest)
- Plan web scanning implementation for next sprint
- Consider A/B testing different UI/copy for Step 1

---

**Deployment Date:** _________________
**Deployed By:** _________________
**Verified By:** _________________

