# 🔐 SECURITY SETUP CHECKLIST

**Status**: Production-Ready Implementation  
**Date**: December 13, 2025

---

## ⚠️ PHASE 1: EMERGENCY KEY ROTATION

### **MUST DO IMMEDIATELY:**

- [ ] **OpenAI Keys**
  - [ ] Go to https://platform.openai.com/api-keys
  - [ ] Delete the exposed key
  - [ ] Generate new API key
  - [ ] Copy to secure location (password manager)
  - [ ] Check usage: https://platform.openai.com/account/usage

- [ ] **Pinecone Keys**
  - [ ] Go to https://app.pinecone.io/
  - [ ] Delete old API key
  - [ ] Generate new API key
  - [ ] Copy to secure location
  - [ ] Note environment and index name

- [ ] **Resend Email Keys**
  - [ ] Go to https://resend.com/api-keys
  - [ ] Delete old API key
  - [ ] Generate new API key
  - [ ] Verify sender domain
  - [ ] Copy to secure location

- [ ] **Redis/Upstash**
  - [ ] Go to https://console.upstash.com/
  - [ ] Delete exposed database OR reset password
  - [ ] Create new database if needed
  - [ ] Copy new connection URL
  - [ ] Verify it starts with `rediss://` (not `redis://`)

- [ ] **Stripe Keys**
  - [ ] Go to https://dashboard.stripe.com/apikeys
  - [ ] Restricted keys: delete old ones
  - [ ] Generate new restricted API key
  - [ ] Add to webhook signing secret
  - [ ] Copy secret key (sk_test_xxx or sk_live_xxx)

- [ ] **Vercel Token** (if applicable)
  - [ ] Go to https://vercel.com/account/tokens
  - [ ] Delete old token
  - [ ] Generate new token with scoped permissions
  - [ ] Copy to secure location

---

## ✅ PHASE 2: LOCAL SETUP

- [ ] **Create `.env.local` file**
  ```bash
  cp .env.local.template .env.local
  ```

- [ ] **Verify `.gitignore`**
  ```bash
  grep -E "^\.env|\.env\.\*\.local" .gitignore
  # Should output:
  # .env
  # .env*.local
  ```

- [ ] **Populate with NEW keys ONLY**
  - [ ] Copy each new API key from step 1
  - [ ] Set `DATABASE_URL` (keep existing)
  - [ ] Set `NEXTAUTH_SECRET` (keep existing)
  - [ ] Set `NEXTAUTH_URL` = http://localhost:3000
  - [ ] Set `NEXT_PUBLIC_APP_URL` = http://localhost:3000
  - [ ] Set `OPENAI_API_KEY` = sk-proj-xxx (NEW)
  - [ ] Set `PINECONE_API_KEY` = pcsk_xxx (NEW)
  - [ ] Set `PINECONE_ENVIRONMENT` = us-east-1-aws (or your region)
  - [ ] Set `PINECONE_INDEX` = hotel-knowledge
  - [ ] Set `REDIS_URL` = rediss://... (NEW)
  - [ ] Set `RESEND_API_KEY` = re_xxx (NEW)
  - [ ] Set `EMAIL_FROM` = noreply@yourdomain.com
  - [ ] Set `STRIPE_SECRET_KEY` = sk_test_xxx (NEW)
  - [ ] Set `STRIPE_PUBLISHABLE_KEY` = pk_test_xxx
  - [ ] Set `STRIPE_WEBHOOK_SECRET` = whsec_xxx (NEW)

- [ ] **Never commit these changes**
  ```bash
  # Verify no .env.local in git
  git status | grep "env.local"
  # Should show: nothing
  
  # Verify file is ignored
  git check-ignore .env.local
  # Should show: .env.local
  ```

---

## 🧪 PHASE 3: DEPENDENCY INSTALLATION

- [ ] **Install new packages**
  ```bash
  npm install resend stripe
  ```

- [ ] **Verify installations**
  ```bash
  npm list resend stripe
  # Should show both packages with versions
  ```

- [ ] **Check for security vulnerabilities**
  ```bash
  npm audit
  # Run: npm audit fix (if any issues)
  ```

---

## ✨ PHASE 4: STARTUP VERIFICATION

- [ ] **Start development server**
  ```bash
  npm run dev
  ```

- [ ] **Watch console for startup report**
  ```
  ═══════════════════════════════════════════════════
    API STARTUP VERIFICATION REPORT
  ═══════════════════════════════════════════════════
  
  ✅ CRITICAL SERVICES
    PostgreSQL                                   ✅
  
  🔧 OPTIONAL SERVICES
    Redis (Upstash)                             ✅
    Resend Email                                ✅
    Stripe Payments                             ✅
  
  🤖 AI SERVICES
    OpenAI                                      ✅
    Pinecone                                    ✅
  
  ═══════════════════════════════════════════════════
  Overall Status: ✅ READY
  Duration: 245ms
  ═══════════════════════════════════════════════════
  ```

- [ ] **Verify no errors in logs**
  - [ ] No "OPENAI_API_KEY is not configured"
  - [ ] No "Pinecone connection failed"
  - [ ] No "Redis connection timeout"
  - [ ] No "Resend not fully configured"

- [ ] **Test health endpoint**
  ```bash
  curl http://localhost:3000/api/health
  
  # Should return:
  # {
  #   "status": "healthy",
  #   "services": {
  #     "database": "connected",
  #     "cache": "connected",
  #     "email": "connected",
  #     "payments": "connected",
  #     "ai": [...]
  #   }
  # }
  ```

---

## 🧬 PHASE 5: INTEGRATION TESTING

### **Test OpenAI Integration**

- [ ] **Test chat endpoint**
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello AI", "hotelId": "test-hotel"}'
  ```

- [ ] **Verify response**
  - [ ] Status code: 200
  - [ ] Contains AI-generated message (not placeholder)
  - [ ] No API key in response

### **Test Email Integration**

- [ ] **Create test email endpoint (temporary)**
  ```typescript
  // app/api/test-send-email/route.ts
  import { sendWelcomeEmail } from '@/lib/email'
  
  export async function POST(req: Request) {
    const result = await sendWelcomeEmail(
      'your-test-email@gmail.com',
      'Test Hotel',
      'http://localhost:3000/login'
    )
    return Response.json(result)
  }
  ```

- [ ] **Test sending**
  ```bash
  curl -X POST http://localhost:3000/api/test-send-email
  # Should return: { "success": true }
  ```

- [ ] **Check email inbox**
  - [ ] Email received within 1 minute
  - [ ] Subject line correct
  - [ ] Links work
  - [ ] From address correct

### **Test Redis/Cache**

- [ ] **Test cache operations**
  ```typescript
  // In a test route or script
  import { setCached, getCached } from '@/lib/redis'
  
  await setCached('test-key', { data: 'test-value' }, 60)
  const result = await getCached('test-key')
  console.log(result) // Should output: { data: 'test-value' }
  ```

### **Test Stripe Integration**

- [ ] **Create test payment endpoint (temporary)**
  ```typescript
  // app/api/test-stripe/route.ts
  import { getOrCreateStripeCustomer, createPaymentIntent } from '@/lib/payments/stripe'
  
  export async function POST(req: Request) {
    const customer = await getOrCreateStripeCustomer(
      'test@example.com',
      'test-hotel-id',
      'Test User'
    )
    
    if (!customer) {
      return Response.json({ error: 'Stripe not configured' }, { status: 400 })
    }
    
    const intent = await createPaymentIntent({
      amount: 10000, // $100.00
      customerId: customer.customerId,
      description: 'Test payment intent'
    })
    
    return Response.json(intent)
  }
  ```

- [ ] **Test payment intent creation**
  ```bash
  curl -X POST http://localhost:3000/api/test-stripe
  # Should return: { "clientSecret": "...", "intentId": "..." }
  ```

### **Test Pinecone Integration**

- [ ] **Test vector storage and search**
  ```typescript
  import { upsertHotelVectors, queryHotelVectors, isVectorSearchEnabled } from '@/lib/ai/vectorProvider'
  
  // Check if configured
  if (!isVectorSearchEnabled()) {
    console.log('Pinecone not configured')
  }
  
  // Test upsert
  await upsertHotelVectors('test-hotel', [{
    id: 'test-doc-1',
    values: Array(3072).fill(0.1), // text-embedding-3-large dimension
    metadata: { text: 'Test content' }
  }])
  
  // Test query
  const results = await queryHotelVectors(
    'test-hotel',
    Array(3072).fill(0.1),
    topK: 5
  )
  console.log(results) // Should contain test-doc-1
  ```

---

## 🔍 PHASE 6: SECURITY AUDIT

- [ ] **Check git history for exposed keys**
  ```bash
  # Search for common patterns
  git log --all -p | grep -E "sk_|pcsk_|rediss_|re_|whsec_" | wc -l
  # Should output: 0 (no matches)
  ```

- [ ] **Verify no .env files committed**
  ```bash
  git ls-files | grep "\.env"
  # Should output: nothing (or only .env.example)
  ```

- [ ] **Check all log files for secrets**
  ```bash
  grep -r "sk_\|pcsk_\|rediss_\|re_" logs/ 2>/dev/null
  # Should output: nothing
  ```

- [ ] **Verify error messages don't leak keys**
  ```bash
  # Search source code
  grep -r "apiKey\|OPENAI_API\|PINECONE" lib/ | grep -v "// " | grep "error\|log\|console"
  # Should not show sensitive data in logs
  ```

- [ ] **Review .gitignore**
  ```bash
  cat .gitignore | grep -E "\.env|node_modules|\.next|coverage"
  # Should include all sensitive directories
  ```

---

## 🚀 PHASE 7: PRODUCTION SETUP

### **For Vercel Deployment:**

- [ ] **Set environment variables in Vercel**
  ```bash
  # Via Vercel Dashboard:
  # 1. Go to Project Settings → Environment Variables
  # 2. Add each variable (don't copy from local):
  #    - OPENAI_API_KEY
  #    - PINECONE_API_KEY
  #    - PINECONE_ENVIRONMENT
  #    - PINECONE_INDEX
  #    - REDIS_URL
  #    - RESEND_API_KEY
  #    - EMAIL_FROM
  #    - STRIPE_SECRET_KEY
  #    - STRIPE_WEBHOOK_SECRET
  # 3. Set for: Production, Preview, Development
  ```

  Or via CLI:
  ```bash
  vercel env add OPENAI_API_KEY
  # Enter key when prompted
  
  vercel env add PINECONE_API_KEY
  # ... repeat for each variable
  ```

- [ ] **Verify in Vercel Dashboard**
  - [ ] All variables show (without values)
  - [ ] Set for correct environments
  - [ ] No local `.env.local` pushed

### **For Other Hosting (Docker, Self-hosted):**

- [ ] **Set environment variables**
  ```bash
  # Docker: in docker-compose.yml or dockerfile
  # Kubernetes: in ConfigMap/Secret
  # Linux/Windows: export ENV_VAR="value"
  # Cloud: Provider's environment variable UI
  ```

- [ ] **Test in staging first**
  - [ ] Deploy to staging environment
  - [ ] Run health check: `/api/health`
  - [ ] Test each integration
  - [ ] Monitor logs for errors

---

## 📊 PHASE 8: MONITORING

### **Daily Checks:**

- [ ] **Health endpoint**
  ```bash
  curl https://your-app.vercel.app/api/health
  # Should show: "status": "healthy"
  ```

- [ ] **API usage**
  - [ ] OpenAI: https://platform.openai.com/account/usage
  - [ ] Stripe: https://dashboard.stripe.com/
  - [ ] Resend: https://resend.com/emails
  - [ ] Redis: https://console.upstash.com/

- [ ] **Error logs**
  - [ ] Check Vercel logs for errors
  - [ ] Look for "failed to connect" messages
  - [ ] Monitor for rate limit warnings

### **Weekly Checks:**

- [ ] **API key usage patterns**
  - [ ] Unexpected spikes in usage?
  - [ ] Any failed authentication attempts?
  - [ ] Any unusual geographic locations?

- [ ] **Email delivery**
  - [ ] Check Resend dashboard for bounce rate
  - [ ] Verify no emails going to spam

- [ ] **Payment processing**
  - [ ] Any failed transactions?
  - [ ] Any refund requests?
  - [ ] Webhook delivery status?

### **Monthly Checks:**

- [ ] **Cost analysis**
  - [ ] OpenAI spending vs. budget
  - [ ] Pinecone index size and cost
  - [ ] Redis commands vs. tier
  - [ ] Resend email volume

- [ ] **Security review**
  - [ ] Any unusual activity?
  - [ ] Any failed login attempts?
  - [ ] Any suspicious API usage?

---

## 🔄 PHASE 9: KEY ROTATION SCHEDULE

### **Create Calendar Reminders:**

- [ ] **Q1 (March)**
  - [ ] Rotate OpenAI API key
  - [ ] Rotate Pinecone API key

- [ ] **Q2 (June)**
  - [ ] Rotate Resend API key
  - [ ] Review all usage

- [ ] **Q3 (September)**
  - [ ] Rotate Redis password (Upstash)
  - [ ] Update documentation

- [ ] **Q4 (December)**
  - [ ] Rotate Stripe secret key
  - [ ] Full security audit
  - [ ] Plan next year's rotation

### **Rotation Procedure:**

```bash
# 1. Generate new key in service dashboard
# 2. Update .env.local with new key
# 3. Run: npm run dev
# 4. Verify startup shows ✅
# 5. Test integration (email, payment, etc.)
# 6. Deploy to production (if applicable)
# 7. Monitor logs for success
# 8. Delete old key in dashboard
# 9. Update rotation schedule
# 10. Document rotation in changelog
```

---

## 📝 DOCUMENTATION

### **Files to Review:**

- [ ] [SECURE_API_INTEGRATION_GUIDE.md](SECURE_API_INTEGRATION_GUIDE.md)
- [ ] [API_INTEGRATION_SUMMARY.md](API_INTEGRATION_SUMMARY.md)
- [ ] [.env.local.template](.env.local.template)
- [ ] [.env.example](.env.example)

### **Files to Keep Updated:**

- [ ] Key rotation schedule
- [ ] API usage documentation
- [ ] Team access permissions
- [ ] Incident response procedures

---

## ✅ FINAL VERIFICATION

- [ ] All keys rotated and new
- [ ] `.env.local` created and populated
- [ ] `.gitignore` verified
- [ ] Dependencies installed
- [ ] Startup verification passes
- [ ] All integrations tested
- [ ] No keys in git history
- [ ] Production environment variables set
- [ ] Health endpoint functional
- [ ] Team briefed on security practices
- [ ] Rotation schedule created
- [ ] Monitoring configured

---

## 🎉 SETUP COMPLETE!

Your AI Hotel Assistant is now securely integrated with all external APIs.

**Next Step**: Deploy to production and monitor health endpoint regularly.

---

**Last Updated**: December 13, 2025  
**Status**: Production-Ready  
**Version**: 1.0.0
