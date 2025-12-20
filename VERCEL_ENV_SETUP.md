# Vercel Environment Variables Setup

## Critical - Set Before Deployment

Configure these environment variables in your Vercel project settings:

### Required for All Environments

```bash
# Database (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require&connection_limit=10&pool_timeout=10"

# Authentication
NEXTAUTH_SECRET="<generate-with: openssl rand -base64 32>"
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"

# Mobile Authentication
MOBILE_MAGIC_LINK_SHARED_SECRET="<your-mobile-shared-secret>"
```

### Optional - AI & Integrations

```bash
# OpenAI (for AI chat & embeddings)
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-large"

# Pinecone (vector database for knowledge base)
PINECONE_API_KEY="pcsk_..."
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX="hotel-knowledge"

# Redis (Upstash for queues & cache)
REDIS_URL="redis://:password@host:port"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# Payments (Stripe)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Setup Instructions

### 1. Vercel Dashboard
1. Go to your project → Settings → Environment Variables
2. Add each variable above
3. Select environments: Production, Preview, Development

### 2. Command Line (Vercel CLI)
```bash
# Set production variable
vercel env add NEXTAUTH_SECRET production

# Set for all environments
vercel env add NEXT_PUBLIC_APP_URL production preview development

# Pull env vars locally (for testing)
vercel env pull .env.local
```

### 3. Important Notes

- **NEXT_PUBLIC_APP_URL**: Must match your Vercel domain
- **NEXTAUTH_URL**: Should match NEXT_PUBLIC_APP_URL in production
- **NEXTAUTH_SECRET**: Generate unique secret, never reuse
- **DATABASE_URL**: Use Neon serverless with connection pooling
- **Redis**: Recommended Upstash for serverless compatibility

### 4. Verify Deployment

After setting env vars, trigger a new deployment:
```bash
git push origin main
# or
vercel --prod
```

Check logs for:
- ✅ Build succeeds without env errors
- ✅ Prisma generates successfully
- ✅ All routes compile

### 5. Common Issues

**Build fails with "Missing required environment variables"**
- Ensure NEXTAUTH_SECRET, DATABASE_URL, NEXTAUTH_URL are set
- NEXT_PUBLIC_APP_URL fallback to NEXTAUTH_URL if missing

**Database connection fails**
- Verify DATABASE_URL includes sslmode=require for Neon
- Check connection pooling parameters
- Ensure Neon project is not paused

**AI features not working**
- Optional services gracefully degrade if not configured
- Check service status at /api/health endpoint
- Verify API keys are valid and have credits

## Security Checklist

- [ ] NEXTAUTH_SECRET is cryptographically random (32+ bytes)
- [ ] All API keys are production-ready (not test keys)
- [ ] Stripe webhook secret matches webhook endpoint
- [ ] NEXT_PUBLIC_* vars don't contain secrets (they're exposed to browser)
- [ ] Redis URL uses TLS (rediss://) if available
- [ ] Database URL includes SSL mode for production

## Testing

After deployment, verify:
```bash
# Check health endpoint
curl https://your-domain.vercel.app/api/health

# Expected: {"status": "ok", "services": {...}}
```

See [.env.example](.env.example) for detailed configuration options.
