# 🚀 VERCEL DEPLOYMENT GUIDE

**Project**: AI Hotel Assistant  
**Status**: Ready for Vercel Deployment  
**Last Updated**: December 18, 2025

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Prerequisites Verified
- [x] Build passes locally (`npm run build` - GREEN ✅)
- [x] Prisma client generated
- [x] All dependencies installed
- [x] Environment variables documented
- [x] Next.js 14 configuration ready
- [x] Git repository clean

### 2. Database Ready
- [ ] **Neon PostgreSQL database created** (or other PostgreSQL provider)
- [ ] Connection URL obtained
- [ ] Database accessible from internet
- [ ] Connection pooling enabled (recommended)

### 3. External Services (Optional but Recommended)
- [ ] **OpenAI API key** obtained (for AI features)
- [ ] **Redis/Upstash** setup (for caching & queues)
- [ ] **Pinecone** account (for vector search)

---

## 📋 STEP-BY-STEP DEPLOYMENT

### Step 1: Prepare Database

#### Option A: Neon (Recommended - Free Tier Available)
```bash
# 1. Sign up at https://neon.tech
# 2. Create new project: "ai-hotel-assistant"
# 3. Copy connection string (will look like):
postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=10
```

#### Option B: Supabase
```bash
# 1. Sign up at https://supabase.com
# 2. Create new project
# 3. Get connection string from Settings > Database
# 4. Use "Connection Pooling" URL for better performance
```

#### Option C: Railway
```bash
# 1. Sign up at https://railway.app
# 2. New Project > Database > PostgreSQL
# 3. Copy DATABASE_URL from Variables tab
```

### Step 2: Push Database Schema

```bash
# From your local machine:

# 1. Set DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# 2. Push schema to production database
npm run db:push

# OR create a migration (recommended for production)
npx prisma migrate deploy

# 3. Verify tables created
npx prisma studio
```

### Step 3: Deploy to Vercel

#### Option A: Deploy via CLI (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy (will prompt for project setup)
vercel

# 4. Deploy to production
vercel --prod
```

#### Option B: Deploy via GitHub Integration

1. **Push to GitHub**:
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

2. **Connect to Vercel**:
   - Go to https://vercel.com/new
   - Import your repository: `prohotelai/AI-HOTEL-ASSISTANT`
   - Configure project (see settings below)

### Step 4: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

#### ✅ REQUIRED Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require&connection_limit=10&pool_timeout=10

# Authentication (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-generated-secret-min-32-chars
NEXTAUTH_URL=https://your-domain.vercel.app

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### 🔧 RECOMMENDED Variables (Enable AI Features)

```bash
# OpenAI (for AI assistant)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Redis/Upstash (for caching & background jobs)
REDIS_URL=rediss://default:password@host:6379
```

#### ⚡ OPTIONAL Variables (Advanced Features)

```bash
# Pinecone (for vector search)
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX=hotel-knowledge

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com

# Monitoring
SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### Step 5: Vercel Build Settings

In Vercel Dashboard → Project Settings → Build & Development:

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
Node Version: 18.x (or 20.x)
```

### Step 6: Domain Configuration

1. **Add Custom Domain** (Optional):
   - Go to Settings → Domains
   - Add: `yourdomain.com`
   - Update DNS records as instructed

2. **Update Environment Variables**:
```bash
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Automated Checks

Run these commands after deployment:

```bash
# 1. Check deployment status
vercel inspect your-deployment-url

# 2. Check build logs
vercel logs your-deployment-url

# 3. Test health endpoint
curl https://your-domain.vercel.app/health
```

### Manual Testing Checklist

Visit your deployed app and verify:

- [ ] **Homepage loads** (`/`)
- [ ] **Login works** (`/login`)
- [ ] **Register works** (`/register`)
- [ ] **Dashboard accessible** (`/dashboard`)
- [ ] **API routes respond** (check browser console)
- [ ] **Database connected** (try creating data)
- [ ] **Authentication persists** (refresh page)
- [ ] **Onboarding wizard loads** (`/dashboard/onboarding`)
- [ ] **No console errors** (check browser DevTools)
- [ ] **Mobile responsive** (test on phone)

### Health Checks

```bash
# Application health
curl https://your-domain.vercel.app/api/health

# Database health
curl https://your-domain.vercel.app/api/health/db

# Expected responses: 200 OK
```

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: Build Fails with "Cannot find module 'prisma'"

**Solution**:
```bash
# In package.json, ensure postinstall script exists:
"scripts": {
  "postinstall": "prisma generate"
}
```

### Issue 2: Database Connection Timeout

**Solution**:
```bash
# Update DATABASE_URL with connection pooling:
?connection_limit=10&pool_timeout=10&connect_timeout=20&sslmode=require
```

### Issue 3: NextAuth JWT Error

**Solution**:
```bash
# Ensure NEXTAUTH_SECRET is set and at least 32 characters
# Regenerate with:
openssl rand -base64 32
```

### Issue 4: API Routes Return 500 Error

**Check**:
1. Environment variables set correctly
2. Database is accessible
3. Check Vercel logs: `vercel logs`

### Issue 5: "Dynamic Server Error" Warnings

**Expected**: These warnings are normal for API routes using `headers()` or `cookies()`. They don't affect functionality.

### Issue 6: Prisma Client Not Generated

**Solution**:
```json
// Add to package.json
"scripts": {
  "postinstall": "prisma generate",
  "vercel-build": "prisma generate && next build"
}
```

---

## 📊 MONITORING & ANALYTICS

### Enable Vercel Analytics

```bash
# Install package
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Enable Vercel Speed Insights

```bash
npm install @vercel/speed-insights

# Add to app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
// Add <SpeedInsights /> in layout
```

---

## 🔐 SECURITY CHECKLIST

### Pre-Production Security

- [ ] **Environment variables set** (not hardcoded)
- [ ] **NEXTAUTH_SECRET generated** (32+ chars)
- [ ] **Database uses SSL** (`sslmode=require`)
- [ ] **HTTPS enforced** (Vercel does this automatically)
- [ ] **CORS configured properly** (check API routes)
- [ ] **Rate limiting enabled** (optional, via middleware)
- [ ] **Security headers active** (already in `next.config.js`)

### Post-Deployment

- [ ] **Test authentication flow**
- [ ] **Verify tenant isolation** (no cross-tenant data access)
- [ ] **Check RBAC enforcement**
- [ ] **Test widget key security**
- [ ] **Monitor error logs** (Vercel Dashboard)

---

## 🎯 PERFORMANCE OPTIMIZATION

### Vercel-Specific Optimizations

Already configured in `next.config.js`:
- ✅ React Strict Mode enabled
- ✅ Security headers configured
- ✅ Server actions with body size limit

### Additional Recommendations

```javascript
// next.config.js additions for production
const nextConfig = {
  // ... existing config
  
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Production source maps (optional, for debugging)
  productionBrowserSourceMaps: false,
}
```

---

## 📈 SCALING CONSIDERATIONS

### Database

- **Neon**: Auto-scales, no action needed
- **Connection Pooling**: Already configured in DATABASE_URL
- **Query Optimization**: Use Prisma indexes (already in schema)

### Redis/Caching

- **Upstash Redis**: Serverless, auto-scales
- **BullMQ Queues**: Works seamlessly on Vercel Edge

### Edge Functions

Consider converting API routes to Edge Runtime:
```typescript
export const runtime = 'edge' // Add to API routes for faster response
```

---

## 🔄 CI/CD PIPELINE

Vercel automatically deploys on:
- ✅ **Main branch push** → Production deployment
- ✅ **PR creation** → Preview deployment
- ✅ **Branch push** → Development deployment

### Custom Deployment Script

```bash
# scripts/deploy-vercel.sh
#!/bin/bash

echo "🚀 Deploying to Vercel..."

# 1. Run tests
npm test -- --run

# 2. Build locally to verify
npm run build

# 3. Deploy to Vercel
vercel --prod

echo "✅ Deployment complete!"
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### Vercel Resources

- **Dashboard**: https://vercel.com/dashboard
- **Logs**: Dashboard → Your Project → Deployments → Logs
- **Docs**: https://vercel.com/docs
- **Support**: https://vercel.com/support

### Project Documentation

- **Architecture**: `.github/copilot-instructions.md`
- **Operations**: `OPERATIONS_QUICK_START.md`
- **Onboarding**: `ONBOARDING_WIZARD_COMPLETE.md`

### Community

- **Vercel Discord**: https://vercel.com/discord
- **Next.js GitHub**: https://github.com/vercel/next.js

---

## ✅ DEPLOYMENT SUCCESS CRITERIA

Your deployment is successful when:

- ✅ Build completes without errors
- ✅ All environment variables set
- ✅ Database connected and migrations applied
- ✅ Homepage loads at production URL
- ✅ Authentication works (login/register)
- ✅ Dashboard accessible for authenticated users
- ✅ API endpoints respond correctly
- ✅ No console errors in browser
- ✅ Mobile responsive design works
- ✅ Performance metrics acceptable (check Vercel Analytics)

---

## 🎉 QUICK DEPLOYMENT (TL;DR)

For experienced developers:

```bash
# 1. Setup database (Neon/Supabase)
export DATABASE_URL="postgresql://..."

# 2. Push schema
npm run db:push

# 3. Deploy to Vercel
vercel login
vercel --prod

# 4. Set environment variables in Vercel Dashboard
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
# - NEXT_PUBLIC_APP_URL

# 5. Verify deployment
curl https://your-app.vercel.app/health
```

---

**Status**: ✅ **READY FOR DEPLOYMENT**

**Estimated Time**: 15-30 minutes  
**Difficulty**: Beginner-Friendly  
**Cost**: Free tier available on all platforms

---

*AI Hotel Assistant - Vercel Deployment Guide*  
*Version 1.0.0 - December 2025*

