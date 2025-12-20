# 🔐 SECURE API INTEGRATION GUIDE

**Last Updated**: December 13, 2025  
**Version**: 1.0.0  
**Status**: Production-Ready

---

## ⚠️ SECURITY ALERT - IMMEDIATE ACTION REQUIRED

If you provided **any API keys in code, documentation, or chat**:

### 1. **IMMEDIATELY ROTATE ALL KEYS**

The following keys must be rotated if they were visible:
- OpenAI API Key → https://platform.openai.com/api-keys
- Pinecone API Key → https://app.pinecone.io/
- Resend API Key → https://resend.com/api-keys
- Stripe Secret Key → https://dashboard.stripe.com/apikeys
- Redis/Upstash URL → https://console.upstash.com/
- Vercel Token → https://vercel.com/account/tokens

### 2. **VERIFY FOR UNAUTHORIZED USAGE**
- Check OpenAI: https://platform.openai.com/account/usage
- Check Stripe: https://dashboard.stripe.com/logs
- Check Pinecone: Activity logs in console
- Check Resend: Email logs

### 3. **UPDATE `.env.local` WITH NEW KEYS**
```bash
# Never commit this file
# Add to .gitignore (already done)
echo ".env.local" >> .gitignore
```

---

## 🔑 ENVIRONMENT VARIABLES - SETUP

### **Step 1: Create `.env.local` (Local Development)**

```bash
# ✅ Copy from .env.example
cp .env.example .env.local

# ✅ Add your actual credentials
# NEVER commit this file
```

### **Step 2: Populate with Real Keys**

```bash
# Required - Get from your service dashboards
OPENAI_API_KEY="sk-proj-your-actual-key"
PINECONE_API_KEY="pcsk_your-actual-key"
RESEND_API_KEY="re_your-actual-key"
REDIS_URL="rediss://default:password@host:6379"
STRIPE_SECRET_KEY="sk_live_your-actual-key"
```

### **Step 3: Verify .gitignore**

```bash
# Already configured to ignore:
cat .gitignore | grep env
# Output:
# .env
# .env*.local
```

✅ **These files are NEVER committed to Git**

---

## 📋 CHECKLIST - INTEGRATION SETUP

### **OpenAI (Chat & Embeddings)**

- [ ] Get API key from https://platform.openai.com/api-keys
- [ ] Add `OPENAI_API_KEY` to `.env.local`
- [ ] Verify in code: `lib/ai/openai.ts` (uses `requireOpenAI()`)
- [ ] Check startup: `npm run dev` → should log "OpenAI initialized ✅"

**What it enables:**
- Real AI chat responses
- Vector embeddings for knowledge base
- Tool execution for workflows

**Test:**
```bash
# Use in route: /api/chat
# Should return real AI response
```

### **Pinecone (Vector Search)**

- [ ] Get credentials from https://app.pinecone.io/
- [ ] Add `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX`
- [ ] Verify: `lib/ai/vectorProvider.ts`
- [ ] Check startup: Should log "Pinecone initialized ✅"

**What it enables:**
- Semantic search in knowledge base
- Document similarity matching
- Context retrieval for AI

**Test:**
```bash
# Knowledge base search should return vector results
```

### **Redis/Upstash (Cache & Queues)**

- [ ] Get URL from https://console.upstash.com/
- [ ] Add `REDIS_URL` to `.env.local`
- [ ] Verify: `lib/redis.ts`
- [ ] Check startup: Should log "Redis connected ✅"

**What it enables:**
- Chat conversation caching
- Job queue for async tasks
- Rate limiting
- Real-time notifications

**Test:**
```bash
# Cache operations should work without errors
```

### **Resend (Email)**

- [ ] Get API key from https://resend.com/api-keys
- [ ] Add `RESEND_API_KEY` and `EMAIL_FROM`
- [ ] Verify: `lib/email.ts`
- [ ] Check startup: Should log "Resend initialized ✅"

**What it enables:**
- Welcome emails
- Password reset emails
- Invoice delivery
- Ticket notifications

**Test:**
```typescript
// In test route or script:
import { sendWelcomeEmail } from '@/lib/email'
await sendWelcomeEmail('test@example.com', 'Hotel Name', 'https://...')
// Should send email or log gracefully if not configured
```

### **Stripe (Payments)**

- [ ] Get keys from https://dashboard.stripe.com/apikeys
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Verify: `lib/payments/stripe.ts`
- [ ] Check startup: Should log "Stripe initialized ✅"

**What it enables:**
- Invoice payment processing
- Guest deposits for bookings
- Payment intents & confirmations
- Webhook event handling

**Test:**
```typescript
// Create test payment intent
import { createPaymentIntent } from '@/lib/payments/stripe'
const intent = await createPaymentIntent({
  amount: 10000, // $100.00
  customerId: 'cus_test',
  description: 'Test booking deposit'
})
// Should return clientSecret
```

---

## 🚀 STARTUP VERIFICATION

The system automatically verifies all API connections on startup:

```bash
npm run dev
```

**Output:**

```
═══════════════════════════════════════════════════
  API STARTUP VERIFICATION REPORT
═══════════════════════════════════════════════════

✅ CRITICAL SERVICES
  PostgreSQL                                   ✅

🔧 OPTIONAL SERVICES
  Redis (Upstash)                             ✅ (or ⚪ if not configured)
  Resend Email                                ✅ (or ⚪ if not configured)
  Stripe Payments                             ✅ (or ⚪ if not configured)

🤖 AI SERVICES
  OpenAI                                      ✅ (or ⚪ if not configured)
  Pinecone                                    ✅ (or ⚪ if not configured)

═══════════════════════════════════════════════════
Overall Status: ✅ READY
Duration: 245ms
═══════════════════════════════════════════════════
```

**Meaning:**
- ✅ Connected and working
- ⚪ Not configured (optional, features disabled)
- ❌ Error (check logs, may need key rotation)

---

## 💻 PRODUCTION DEPLOYMENT

### **Step 1: Secure Your Secrets**

```bash
# For Vercel:
# Set environment variables in Dashboard → Settings → Environment Variables

# Example command (using Vercel CLI):
vercel env add OPENAI_API_KEY
# Enter your production key when prompted

# Do NOT echo or log keys
# Do NOT put in git history
```

### **Step 2: Verify Production Setup**

```bash
# Test in production (get URL from Vercel)
curl https://your-app.vercel.app/api/startup-status

# Response should show all services
{
  "database": { "status": "connected" },
  "cache": { "status": "connected" },
  "email": { "status": "connected" },
  "payments": { "status": "connected" },
  "ai": [...]
}
```

### **Step 3: Monitor for Issues**

```bash
# Check Vercel logs
vercel logs <project-name>

# Look for:
# ✅ "All critical services healthy"
# ⚠️ "Non-critical services unavailable" (OK if optional)
# ❌ Any error messages related to API keys
```

---

## 🛡️ SECURITY BEST PRACTICES

### **1. Key Rotation Schedule**

| Service | Frequency | Action |
|---------|-----------|--------|
| OpenAI | Quarterly | Regenerate API key |
| Pinecone | Quarterly | Rotate API key |
| Resend | Quarterly | Rotate API key |
| Stripe | Annually | Rotate secret key |
| Redis | Bi-annual | Change password |

### **2. Access Control**

```typescript
// ✅ CORRECT - Use env variable
const apiKey = requireOpenAI() // throws if not configured

// ❌ WRONG - Never hardcode
const apiKey = "sk-proj-xxx"
```

### **3. Error Handling**

```typescript
// ✅ CORRECT - Don't expose sensitive info
logger.error('OpenAI error', { status: 500 })

// ❌ WRONG - Leaks information
logger.error('OpenAI error', { response: fullErrorWithAPIKey })
```

### **4. Logging**

All API integrations use secure logging:

```typescript
// Secrets are NEVER logged
logger.info('Email sent', { id: 'msg-123' }) // Good
logger.info('Email sent', { apiKey, recipient }) // Bad - never do this
```

### **5. Rate Limiting**

```typescript
import { checkRateLimit } from '@/lib/redis'

// Rate limit API routes
const limit = await checkRateLimit('user:123:chat', 100, 3600)
if (!limit.allowed) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
}
```

---

## 📊 USAGE LIMITS & COSTS

### **OpenAI**

- **Model**: gpt-4o-mini (cheaper than gpt-4)
- **Estimated Cost**: ~$0.001-0.01 per chat message
- **Monitor**: https://platform.openai.com/account/usage
- **Limit**: Set soft/hard limits in OpenAI dashboard

### **Pinecone**

- **Pricing**: Based on vector index size
- **Free Tier**: 1 pod free
- **Monitor**: https://app.pinecone.io/usage
- **Optimize**: Delete unused vectors, use appropriate dimensions

### **Redis/Upstash**

- **Free Tier**: 10,000 commands/day
- **Pricing**: $0.20 per 100,000 commands after free tier
- **Monitor**: https://console.upstash.com/
- **Optimize**: Set TTL on cache, clean old data

### **Resend**

- **Pricing**: 100 emails/day free, then $0.75 per 1000
- **Monitor**: https://resend.com/emails
- **Limit**: ~100 emails per action (welcome, password reset, etc.)

### **Stripe**

- **Pricing**: 2.2% + $0.30 per transaction
- **Monitor**: https://dashboard.stripe.com/
- **Protect**: Use webhook signing, validate amounts

---

## 🧪 TESTING

### **Unit Tests (Mocked APIs)**

```typescript
// tests/api/chat.test.ts
vi.mock('@/lib/ai/openai', () => ({
  createChatCompletion: vi.fn().mockResolvedValue({
    message: { content: 'Test response', role: 'assistant' }
  })
}))
```

### **Integration Tests (Real APIs)**

```bash
# Test with real credentials in .env.test.local
NODE_ENV=test npm run test:integration
```

### **E2E Tests (Playwright)**

```bash
# Test full flows with Playwright
npm run test:e2e
```

---

## 🆘 TROUBLESHOOTING

### **"OPENAI_API_KEY not configured"**

```bash
# Check .env.local has the key
grep OPENAI_API_KEY .env.local

# Verify it's not empty
echo $OPENAI_API_KEY

# Test connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

### **"Pinecone connection failed"**

```bash
# Verify credentials
grep PINECONE .env.local

# Check index exists in console
# https://app.pinecone.io/

# Verify environment matches
# (e.g., "us-east-1-aws" not "us-east-1")
```

### **"Redis connection timeout"**

```bash
# Test Redis URL
redis-cli -u "$REDIS_URL" ping
# Should return PONG

# Verify Upstash URL format:
# rediss://default:PASSWORD@HOST:PORT
# NOT: redis://... (must be rediss:// for TLS)
```

### **"Resend API key invalid"**

```bash
# Verify key format
echo $RESEND_API_KEY | grep -E '^re_[a-z0-9]+$'

# Test directly
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY"
```

### **"Stripe webhook signature verification failed"**

```bash
# Ensure STRIPE_WEBHOOK_SECRET is set (from Dashboard → Webhooks)
# NOT the API key

# Verify format
echo $STRIPE_WEBHOOK_SECRET | grep -E '^whsec_'
```

---

## 📝 AUDIT CHECKLIST

- [ ] All `.env.local` keys are real, not placeholders
- [ ] `.env.local` is in `.gitignore` (confirmed not committed)
- [ ] No API keys appear in code files
- [ ] No API keys in git history
- [ ] Startup verification passes with ✅ status
- [ ] Email sending tested
- [ ] Payment intent creation tested
- [ ] Chat API returns real OpenAI responses
- [ ] Knowledge base vector search works
- [ ] Redis cache operations functional
- [ ] All error messages hide sensitive data
- [ ] Rate limiting active on public endpoints
- [ ] Logs checked for leaked credentials
- [ ] Production environment variables set
- [ ] Key rotation schedule documented

---

## 📞 SUPPORT & RESOURCES

**OpenAI Support**: https://help.openai.com/  
**Pinecone Docs**: https://docs.pinecone.io/  
**Stripe Support**: https://support.stripe.com/  
**Resend Help**: https://resend.com/docs  
**Upstash Docs**: https://upstash.com/docs/  

---

## 🔄 KEY ROTATION SCHEDULE

Add to calendar:

```
Q1: Rotate OpenAI & Pinecone keys
Q2: Verify all keys still active
Q3: Rotate Resend key
Q4: Rotate Stripe secret key
```

**When rotating:**
1. Generate new key in dashboard
2. Update `.env.local`
3. Verify new key works
4. Revoke old key
5. Check logs for any old key usage

---

**✅ Security Setup Complete**

All external APIs are now securely integrated. No keys are hardcoded, and the system gracefully handles missing optional services.
