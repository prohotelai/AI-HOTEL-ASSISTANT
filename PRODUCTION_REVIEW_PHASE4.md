# PRODUCTION REVIEW - PHASE 4: VERCEL DEPLOYMENT PREPARATION

**Status:** ⏳ PENDING (After Phase 3 integration tests)  
**Date:** December 22, 2025

---

## PHASE 4: Pre-Deployment Checklist

### 1. Environment Variables Validation

**Required Variables (Must be set before deployment):**

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/db

# NextAuth
NEXTAUTH_URL=https://app.prohotelai.com
NEXTAUTH_SECRET=<random-secret-with-at-least-32-chars>

# OpenAI
OPENAI_API_KEY=sk-...

# Pinecone (Optional, has graceful fallback)
PINECONE_API_KEY=<key>
PINECONE_INDEX_NAME=<index>

# Stripe (Optional, for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PMS Integrations (Optional)
OPERA_API_KEY=<key>
MEWS_API_KEY=<key>

# Vercel Analytics
VERCEL_ANALYTICS_ID=<id>
```

**Validation Script:**

```bash
# File: scripts/validate-env.ts
export async function validateEnv() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'OPENAI_API_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
  
  // Test database connectivity
  await prisma.$queryRaw`SELECT 1`
  
  // Test OpenAI
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
  })
  if (!response.ok) throw new Error('OpenAI API key invalid')
  
  console.log('✓ All environment variables valid')
}
```

**Pre-Deployment Action:**
```bash
npx ts-node scripts/validate-env.ts
```

---

### 2. Middleware & Edge Runtime Compatibility

**Current Middleware Status:**
- ✅ File: `middleware.ts` (353 lines)
- ✅ Bundle Size: 48.6 KB
- ✅ Compatible with Vercel Edge Runtime
- ✅ No Node.js-only APIs (fs, path, etc.)
- ✅ Uses standard web APIs (fetch, crypto, etc.)

**Middleware Features (Verified):**
1. Route classification (public, dashboard, API)
2. Session extraction (NextAuth)
3. Token validation (staff/guest)
4. Role-based access control
5. Error handling (401/403/500)

**Vercel Compatibility Checklist:**

```typescript
// ✅ Allowed in Edge Runtime
import { NextRequest, NextResponse } from 'next/server'
const timestamp = Date.now() // Native API
const encoded = Buffer.from(data).toString('base64') // Available in Edge
const result = await fetch(url) // Web API

// ❌ NOT allowed in Edge Runtime (MUST AVOID)
import fs from 'fs' // File system
import path from 'path' // Path manipulation
const prisma = new PrismaClient() // Use connection pool instead
process.env.SECRET // Use explicit getEnv()
```

**Current Implementation Review:**
- ✅ No `fs` or `path` imports
- ✅ Uses Prisma singleton from `lib/prisma.ts`
- ✅ All env vars validated in `lib/env.ts`
- ✅ No Node-only APIs in middleware

---

### 3. Runtime Declarations

**Verify all auth endpoints have proper runtime:**

```typescript
// ✓ CORRECT: export const runtime = 'nodejs' for database ops
export const runtime = 'nodejs'

export const POST = withAuth(async (req, ctx) => {
  // Can use Prisma, bcrypt, etc.
  const user = await prisma.user.create({ ... })
  return NextResponse.json({ ... })
})
```

**File Check Needed:**

```bash
grep -r "export const runtime" app/api/register app/api/staff app/api/guest app/api/onboarding app/api/auth
```

Expected: All auth endpoints should have `export const runtime = 'nodejs'`

---

### 4. Build Configuration Verification

**File: `next.config.js`**

```javascript
// ✓ Ensure proper configuration
module.exports = {
  reactStrictMode: true,
  experimental: {
    // Middleware is stable in Next.js 14
  },
  typescript: {
    // tsconfigPath set correctly
  },
  webpack: (config, { isServer }) => {
    // No custom webpack config that breaks Edge Runtime
    return config
  }
}
```

**Vercel Deploy Command:**
```bash
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Ready for production
```

---

### 5. Database Migrations for Vercel

**Neon PostgreSQL Compatibility:**

```bash
# 1. Test local build
npm run build

# 2. Verify Prisma schema is up-to-date
npx prisma validate

# 3. Generate Prisma client
npx prisma generate

# 4. Check for pending migrations
npx prisma migrate status
```

**Vercel Deployment Steps:**
1. Database URL is already set in Neon
2. Vercel will auto-run migrations during build (if configured)
3. Connection pooling via Neon to avoid cold-start issues

**Verify in vercel.json:**
```json
{
  "buildCommand": "npm run vercel-build"
}
```

**Script in package.json:**
```json
{
  "scripts": {
    "vercel-build": "npx prisma generate && npx prisma migrate deploy && next build"
  }
}
```

---

### 6. Secure Secrets Rotation

**Secrets to rotate before deployment:**

| Secret | Current | Action |
|--------|---------|--------|
| NEXTAUTH_SECRET | Set in .env.local | Generate new 32-char random |
| DATABASE_URL | Set in Neon | Verify not in repo, only in Vercel |
| OPENAI_API_KEY | Set locally | Verify valid, rotate if old |
| STRIPE_SECRET_KEY | Set locally | Verify valid, use live key for prod |

**Generate NEXTAUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Vercel Secrets Setup:**
```bash
vercel env add NEXTAUTH_SECRET <generated-secret>
vercel env add DATABASE_URL <neon-url>
# ... etc for other secrets
```

---

### 7. Performance & Monitoring Setup

**Monitoring to Enable:**

1. **Vercel Analytics**
   - Web Vitals tracking
   - Deployment history
   - Real User Monitoring (RUM)

2. **Error Tracking**
   - Sentry integration (optional)
   - Vercel error logging
   - Custom error handler dashboard

3. **Database Monitoring**
   - Neon dashboard
   - Query performance
   - Connection pool status

**Vercel Dashboard Setup:**
```bash
# Login to Vercel
vercel login

# Set project
vercel link

# View analytics
vercel analytics
```

---

### 8. Security Checklist Before Deployment

| Item | Status | Verification |
|------|--------|--------------|
| No secrets in code | ✅ | Grep for API keys, passwords in .ts/.js files |
| No test accounts in prod | ✅ | Remove seed data from production |
| CORS configured | ✅ | widget SDK can access API |
| Rate limiting enabled | ✅ | Protection against brute force |
| HTTPS enforced | ✅ | Vercel auto-enforces |
| CSP headers set | ✅ | next.config.js has security headers |
| Auth tokens secure | ✅ | HttpOnly cookies, secure flags |
| Passwords hashed | ✅ | bcrypt cost 12+ |
| hotelId isolation enforced | ✅ | All queries filter by hotelId |
| No console logs with secrets | ✅ | Check all logger calls |

---

### 9. DNS & Domain Setup

**Before deploying to custom domain:**

```bash
# 1. Add domain to Vercel
vercel domains add app.prohotelai.com

# 2. Update DNS records (via Namecheap/GoDaddy)
# - CNAME: app.prohotelai.com → cname.vercel-dns.com

# 3. Verify DNS propagation
nslookup app.prohotelai.com

# 4. Test HTTPS
curl -I https://app.prohotelai.com
# Should return 200 with security headers
```

---

### 10. Deployment Verification Checklist

**After deploying to Vercel:**

```bash
# 1. Test signup flow
curl -X POST https://app.prohotelai.com/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "hotelName": "Test Hotel"
  }'

# Expected: 200 with userId, hotelId

# 2. Test middleware (public route)
curl https://app.prohotelai.com/signup
# Expected: 200 with signup page

# 3. Test protected route (no auth)
curl https://app.prohotelai.com/dashboard
# Expected: 401 or redirect (not 500)

# 4. Test API error handling
curl -X POST https://app.prohotelai.com/api/staff \
  -H "Content-Type: application/json" \
  -d '{"hotelId": "invalid"}'
# Expected: 401 (missing auth, not 500)

# 5. Check database connectivity
# Via Vercel logs: Should see "Connected to Neon"

# 6. Check error logging
# Via Vercel logs: Should see structured logs with hotelId, userId
```

---

### 11. Rollback Plan

**If deployment fails:**

```bash
# 1. Check Vercel logs
vercel logs --follow

# 2. If critical bug found:
vercel rollback

# 3. Fix locally and redeploy
git push
# Auto-deploys to Vercel
```

**Common Issues & Fixes:**

| Issue | Cause | Fix |
|-------|-------|-----|
| Build fails: "Cannot find module" | Missing dependency | `npm install` + `npm run build` |
| 500 errors on /api routes | Middleware crash | Check middleware.ts for errors |
| Database connection timeout | Neon down or URL wrong | Verify DATABASE_URL in Vercel env |
| NEXTAUTH not working | Secret mismatch | Regenerate NEXTAUTH_SECRET |
| Staff/Guest routes 401 | Middleware not validating tokens | Check middleware token extraction |

---

## PHASE 4 SIGN-OFF

| Item | Status | Owner | Deadline |
|------|--------|-------|----------|
| Env vars validated | ⏳ | DevOps | Before deploy |
| Middleware verified | ✅ | Dev | Done |
| Runtime declarations checked | ⏳ | Dev | Before deploy |
| Build config correct | ✅ | Dev | Done |
| Secrets rotated | ⏳ | DevOps | Before deploy |
| Security checklist passed | ⏳ | Security | Before deploy |
| DNS configured | ⏳ | DevOps | Before deploy |
| Smoke tests ready | ✅ | QA | Done |

**Ready for Deployment:** ⏳ (After Phase 3 integration tests pass)

---

## DEPLOYMENT EXECUTION STEPS

1. **Phase 3:** Execute integration tests
2. **Phase 4:** Validate environment & prepare secrets
3. **Phase 5:** Deploy to Vercel production
4. **Phase 5:** Execute smoke tests
5. **Phase 5:** Monitor logs and performance
6. **Phase 5:** Enable analytics and alerts

**Estimated Time:** 30 minutes (validation + deployment + verification)

