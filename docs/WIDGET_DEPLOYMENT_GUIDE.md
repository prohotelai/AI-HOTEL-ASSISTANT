# Widget SDK & Staff Dashboard Deployment Guide

**Version**: 1.0  
**Last Updated**: December 12, 2025  
**Status**: Production Ready

---

## Pre-Deployment Checklist

### Infrastructure
- [ ] Database created (PostgreSQL 14+)
- [ ] Environment variables configured
- [ ] HTTPS certificates valid
- [ ] Redis cache available (optional)
- [ ] CDN configured for widget SDK

### Dependencies
- [ ] Node.js 18+ installed
- [ ] npm/yarn configured
- [ ] DATABASE_URL set correctly
- [ ] NEXTAUTH_SECRET generated and set

### Testing
- [ ] Unit tests passing (npm test)
- [ ] Integration tests passing
- [ ] Manual QR scanning tested
- [ ] Staff dashboard responsive tested
- [ ] Permission checks validated

---

## Step 1: Configure Environment

### Create `.env.local`

```bash
# Authentication
NEXTAUTH_SECRET=your-very-secret-key-here-min-32-chars
NEXTAUTH_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/prohotel_db

# QR Configuration
QR_TOKEN_EXPIRY=3600                    # 60 minutes
QR_REFRESH_TOKEN_EXPIRY=604800          # 7 days
QR_MAX_CONCURRENT_SESSIONS=5            # Per user

# Widget SDK
WIDGET_API_BASE_URL=https://yourdomain.com/api
WIDGET_CDN_URL=https://cdn.yourdomain.com/widget

# AI Modules
AI_MODULES_ENABLED=true
NIGHT_AUDIT_ENABLED=true
TASK_ROUTING_ENABLED=true
MAINTENANCE_PREDICTION_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_DATABASE_QUERIES=false

# Optional: Analytics
ANALYTICS_ENABLED=false
ANALYTICS_DATABASE_URL=postgresql://...
```

### Generate NEXTAUTH_SECRET

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Copy the output to NEXTAUTH_SECRET
```

---

## Step 2: Prepare Database

### Create Required Tables

```sql
-- Table for QR tokens (already exists from MODULE 11)
CREATE TABLE guest_staff_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id VARCHAR(255) NOT NULL,
  qr_code VARCHAR(255) NOT NULL UNIQUE,
  token_type VARCHAR(50) NOT NULL, -- 'guest' or 'staff'
  token TEXT NOT NULL,
  user_id VARCHAR(255),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_role VARCHAR(50), -- 'guest', 'staff', 'admin'
  permissions TEXT[], -- Array of permission strings
  created_by VARCHAR(255),
  revoked_by VARCHAR(255),
  is_revoked BOOLEAN DEFAULT false,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  metadata JSONB,
  INDEX idx_hotel_token (hotel_id, token),
  INDEX idx_expires (expires_at),
  INDEX idx_revoked (is_revoked)
);

-- Add indexes for performance
CREATE INDEX idx_qr_tokens_user ON guest_staff_qr_tokens(hotel_id, user_id);
CREATE INDEX idx_qr_tokens_email ON guest_staff_qr_tokens(hotel_id, user_email);
```

### Verify Tables

```bash
npm run prisma:validate
npm run prisma:migrate
```

---

## Step 3: Build Application

### Install Dependencies

```bash
npm install
cd widget-sdk
npm install
npm run build
cd ..
```

### Build Application

```bash
# Development
npm run dev

# Production build
npm run build

# Verify build
npm run type-check
npm run lint
```

---

## Step 4: Run Tests

### Unit Tests

```bash
# Widget SDK tests
cd widget-sdk
npm test -- qrAuth.test.ts
cd ..

# API tests
npm test -- api
```

### Integration Tests

```bash
npm test -- widget-staff-integration.test.ts
```

### E2E Tests (Optional)

```bash
npm run test:e2e
```

---

## Step 5: Deploy Application

### Option A: Docker Deployment

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t prohotel-app:latest .
docker run -p 3000:3000 \
  -e NEXTAUTH_SECRET=your-secret \
  -e DATABASE_URL=postgresql://... \
  prohotel-app:latest
```

### Option B: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXTAUTH_SECRET
vercel env add DATABASE_URL
vercel env add QR_TOKEN_EXPIRY

# Redeploy with env vars
vercel --prod
```

### Option C: Traditional Server

```bash
# On your server
cd /var/www/prohotel
git pull origin main
npm install
npm run build

# Create systemd service
sudo nano /etc/systemd/system/prohotel.service
```

```ini
[Unit]
Description=ProHotel AI Service
After=network.target

[Service]
Type=simple
User=prohotel
WorkingDirectory=/var/www/prohotel
ExecStart=/usr/bin/npm start
Restart=always
Environment="NODE_ENV=production"
EnvironmentFile=/var/www/prohotel/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable prohotel
sudo systemctl start prohotel
sudo systemctl status prohotel
```

---

## Step 6: Configure CDN (Optional)

### Deploy Widget SDK to CDN

```bash
# Build widget SDK
cd widget-sdk
npm run build

# Upload to CDN
# Copy dist/index.umd.js to CDN
# Make available at: https://cdn.yourdomain.com/widget/prohotel-ai.js
```

### Update Widget HTML

```html
<!-- In guest room displays -->
<script src="https://cdn.yourdomain.com/widget/prohotel-ai.js"></script>
<link rel="stylesheet" href="https://cdn.yourdomain.com/widget/prohotel-ai.css">

<script>
  window.addEventListener('load', () => {
    ProHotelAIWidget.createWidget({
      element: '#widget-container',
      hotelId: 'hotel-123',
      qrAuth: { enabled: true }
    })
  })
</script>

<div id="widget-container"></div>
```

---

## Step 7: Verify Deployment

### Health Checks

```bash
# Basic health
curl https://yourdomain.com/api/health

# Database connectivity
curl https://yourdomain.com/api/health/db

# Widget SDK availability
curl https://cdn.yourdomain.com/widget/prohotel-ai.js

# QR endpoints
curl -X POST https://yourdomain.com/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"test","hotelId":"hotel-123"}'
```

### Test QR Login Flow

1. **Generate Test Token**
   - Visit admin dashboard
   - Go to QR Management
   - Create test QR code
   - Copy token

2. **Test Guest Widget**
   - Visit guest room display page
   - Paste token (or scan QR)
   - Verify widget shows "Authenticated"
   - Test chat functionality

3. **Test Staff Dashboard**
   - Visit `/dashboard/staff/qr-login`
   - Create staff QR token in admin
   - Scan or paste token
   - Verify redirect to `/dashboard/staff`
   - Check KPIs display
   - Check AI modules list

4. **Test Permissions**
   - Create staff token with limited permissions
   - Verify only allowed modules show
   - Create token without AI permissions
   - Verify no AI modules visible

---

## Step 8: Monitor & Maintain

### Logging

```bash
# View logs
pm2 logs prohotel-app

# Or with journalctl
sudo journalctl -u prohotel -f
```

### Performance Monitoring

```typescript
// Add to app/api/health/route.ts
export async function GET() {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  }
  return Response.json(metrics)
}
```

### Database Cleanup

```bash
# Remove expired QR tokens daily (cron job)
0 2 * * * psql $DATABASE_URL -c "DELETE FROM guest_staff_qr_tokens WHERE expires_at < NOW()"
```

### Backup

```bash
# Database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated backup (daily)
0 3 * * * pg_dump $DATABASE_URL > /backups/prohotel-$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting Deployment

### Issue: NEXTAUTH_SECRET not set

```
Error: NEXTAUTH_SECRET is not provided
```

**Solution**:
```bash
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo $NEXTAUTH_SECRET
# Add to .env.local or deployment config
```

### Issue: Database connection fails

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Verify credentials and host
```

### Issue: Widget SDK not loading

```
Uncaught TypeError: ProHotelAIWidget is not defined
```

**Solution**:
```html
<!-- Verify CDN URL is correct -->
<script src="https://your-actual-cdn-url/widget-sdk.js"></script>

<!-- Check browser console for 404 errors -->
<!-- Verify script has integrity hash if using SRI -->
```

### Issue: QR validation returns 401

```
Error: Unauthorized
```

**Solution**:
- Verify NEXTAUTH_SECRET is set
- Check token hasn't expired
- Confirm hotelId matches
- Verify Authorization header format

---

## Performance Tuning

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_qr_tokens_hotel ON guest_staff_qr_tokens(hotel_id);
CREATE INDEX idx_qr_tokens_expiry ON guest_staff_qr_tokens(expires_at);
CREATE INDEX idx_qr_tokens_used ON guest_staff_qr_tokens(is_used);

-- VACUUM and ANALYZE
VACUUM ANALYZE guest_staff_qr_tokens;
```

### Application Optimization

```typescript
// Cache AI modules list
const modulesCacheKey = `ai:modules:${hotelId}`
const cached = await redis.get(modulesCacheKey)
if (cached) return JSON.parse(cached)

// Cache for 5 minutes
await redis.setex(modulesCacheKey, 300, JSON.stringify(modules))
```

### API Rate Limiting

```typescript
// Use rate limiting middleware
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
})

app.use('/api/', limiter)
```

---

## Rollback Plan

### If Issues Occur

```bash
# 1. Check logs
pm2 logs prohotel-app

# 2. Restore previous version
git revert HEAD
npm install
npm run build
npm start

# 3. Restore database
psql $DATABASE_URL < backup-latest.sql

# 4. Notify users
# Update status page with incident
```

---

## Maintenance Tasks

### Weekly

- [ ] Check error logs
- [ ] Verify all tests passing
- [ ] Monitor database size

### Monthly

- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Backup and test restore

### Quarterly

- [ ] Security audit
- [ ] Load testing
- [ ] Disaster recovery drill

---

## Support & Documentation

- **Deployment Issues**: See `docs/TROUBLESHOOTING.md`
- **Architecture Overview**: See `docs/ARCHITECTURE.md`
- **API Documentation**: See `docs/API.md`
- **Security Best Practices**: See `PRODUCTION_READINESS.md`

---

**Deployment Status**: ✅ Ready  
**Last Verified**: December 12, 2025

*For deployment support, contact DevOps team.*
