# 🚀 QR Code Login System - Deployment Runbook

**Module**: MODULE 11  
**Version**: 1.0  
**Date**: December 12, 2025  
**Status**: Production Ready ✅

---

## 📋 Pre-Deployment Checklist

### Code Quality (Mandatory)

- [ ] TypeScript compilation passes
  ```bash
  npm run build
  ```
- [ ] ESLint validation passes
  ```bash
  npm run lint
  ```
- [ ] All tests pass (unit, integration, E2E)
  ```bash
  npm run test:all
  npm run test:coverage
  ```
- [ ] Code review completed
- [ ] Security review completed
- [ ] No console errors/warnings
- [ ] No TypeScript errors

### Database (Mandatory)

- [ ] Database backup created
  ```bash
  pg_dump <database_name> > backup_$(date +%s).sql
  ```
- [ ] Migration script tested on staging
- [ ] Rollback plan documented
- [ ] Connection string verified
- [ ] Database credentials rotated (if applicable)

### Environment (Mandatory)

- [ ] .env.production configured
- [ ] NEXTAUTH_SECRET set
- [ ] QR_TOKEN_EXPIRY configured (default: 60)
- [ ] DATABASE_URL points to production database
- [ ] All required env vars present

### Security (Mandatory)

- [ ] JWT signing secret strength verified
- [ ] CORS headers configured
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF tokens configured

### Documentation (Mandatory)

- [ ] README-QR.md reviewed
- [ ] API documentation complete
- [ ] Troubleshooting guide ready
- [ ] Runbook documented
- [ ] Team trained on QR system

---

## 🔄 Deployment Process (6 Phases)

### Phase 1: Pre-Deployment Validation (30 minutes)

#### 1.1 Code Quality Check
```bash
# Navigate to project root
cd /workspaces/AI-HOTEL-ASSISTANT

# Run TypeScript compilation
npm run build
# Expected: ✓ Build successful

# Run ESLint
npm run lint
# Expected: ✓ No linting errors

# Verify TypeScript strict mode
npx tsc --noEmit
# Expected: ✓ No type errors
```

#### 1.2 Test Execution
```bash
# Run all tests with coverage
npm run test:coverage
# Expected: 
#   ✓ Unit tests: PASS (26+ tests)
#   ✓ Integration tests: PASS (15+ tests)
#   ✓ E2E tests: PASS (12+ tests)
#   ✓ Coverage: 85%+ achieved

# Specific test suites
npm run test:unit           # QR service + API tests
npm run test:integration    # Workflow tests
npm run test:e2e           # Dashboard tests
```

#### 1.3 Database Verification
```bash
# Verify database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
# Expected: (1 row)

# Check existing schema (backup first)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --schema-only > schema_backup.sql
```

#### 1.4 Environment Validation
```bash
# Create .env.production file
cat > .env.production << EOF
NEXTAUTH_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://user:pass@host:5432/db
QR_TOKEN_EXPIRY=60
SESSION_EXPIRY_HOURS=24
NODE_ENV=production
EOF

# Verify all env vars present
env | grep -E 'NEXTAUTH|DATABASE|QR|SESSION'
```

---

### Phase 2: Database Migration (45 minutes)

#### 2.1 Create Migration
```bash
# Generate migration for GuestStaffQRToken schema
npx prisma migrate dev --name add_guestStaffQRTokens

# This creates:
# - prisma/migrations/[timestamp]_add_guestStaffQRTokens/migration.sql
# - Updates prisma.db to latest

# Review generated SQL
cat prisma/migrations/*/migration.sql | head -100
```

#### 2.2 Test Migration (Staging)
```bash
# On staging database, test migration
DATABASE_URL=postgresql://staging_user:pass@staging:5432/db \
npx prisma migrate deploy

# Verify schema created
psql -h staging -U staging_user -d staging_db \
  -c "\dt public.GuestStaffQRToken"
# Expected: One table with proper columns

# Verify indexes created
psql -h staging -U staging_user -d staging_db \
  -c "\di public.*qr*"
# Expected: Indexes on hotelId, userId, expiresAt, isUsed
```

#### 2.3 Backup Production Database
```bash
# Create full backup before migration
pg_dump -h $PROD_HOST -U $PROD_USER -d $PROD_DB \
  > production_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
# Expected: SQL file > 100MB (should contain all tables)
ls -lh production_backup_*.sql

# Optional: Test backup restoration
pg_restore -h localhost -U test_user -d test_db \
  < production_backup_latest.sql
```

#### 2.4 Deploy Migration to Production
```bash
# Switch to production environment
export DATABASE_URL=postgresql://prod_user:$PROD_PASS@prod:5432/prod_db
export NODE_ENV=production

# Run migration (non-destructive)
npx prisma migrate deploy
# Expected: Migration executed successfully

# Verify GuestStaffQRToken table exists
psql -h prod -U prod_user -d prod_db \
  -c "SELECT COUNT(*) FROM GuestStaffQRToken;"
# Expected: (0 rows) - empty table, ready for data

# Verify schema matches schema.prisma
npx prisma db pull
# Expected: No changes (schema already matches)
```

---

### Phase 3: Data Seeding (20 minutes)

#### 3.1 Create Initial RBAC Permissions
```bash
# Create seed script (if not exists)
cat > prisma/seed-qr.ts << 'EOF'
import { prisma } from '@/lib/db';

const QR_PERMISSIONS = [
  {
    key: 'qr.tokens.generate',
    name: 'Generate QR Tokens',
    group: 'qr',
    resource: 'tokens',
    action: 'generate',
  },
  {
    key: 'qr.tokens.list',
    name: 'List QR Tokens',
    group: 'qr',
    resource: 'tokens',
    action: 'list',
  },
  {
    key: 'qr.tokens.revoke',
    name: 'Revoke QR Tokens',
    group: 'qr',
    resource: 'tokens',
    action: 'revoke',
  },
  {
    key: 'qr.tokens.validate',
    name: 'Validate QR Tokens',
    group: 'qr',
    resource: 'tokens',
    action: 'validate',
  },
];

async function main() {
  for (const perm of QR_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
    console.log(`✓ Created permission: ${perm.key}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
EOF

# Run seed
npx ts-node prisma/seed-qr.ts
# Expected: ✓ Created 4 permissions
```

#### 3.2 Assign Permissions to Admin Role
```bash
# Create assignment script
cat > scripts/assign-qr-permissions.ts << 'EOF'
import { prisma } from '@/lib/db';

async function main() {
  const adminRole = await prisma.role.findFirst({
    where: { key: 'admin' },
  });

  if (!adminRole) {
    console.error('Admin role not found!');
    process.exit(1);
  }

  const permissions = await prisma.permission.findMany({
    where: { key: { startsWith: 'qr.' } },
  });

  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
    console.log(`✓ Assigned ${perm.key} to admin`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
EOF

# Run assignment
npx ts-node scripts/assign-qr-permissions.ts
# Expected: ✓ Assigned 4 permissions to admin
```

#### 3.3 Verify Seeding
```bash
# Check permissions created
psql -h prod -U prod_user -d prod_db \
  -c "SELECT COUNT(*) FROM Permission WHERE \"group\" = 'qr';"
# Expected: (4 rows)

# Check role permissions assigned
psql -h prod -U prod_user -d prod_db \
  -c "SELECT COUNT(*) FROM RolePermission rp 
      JOIN Permission p ON rp.permissionId = p.id 
      WHERE p.\"group\" = 'qr';"
# Expected: (4 rows)
```

---

### Phase 4: Application Deployment (30 minutes)

#### 4.1 Build Application
```bash
# Clean previous build
rm -rf .next dist build

# Create production build
npm run build
# Expected: ✓ Build successful
# Expected: .next/ folder created with optimized code

# Verify build includes QR routes
grep -r "qr" .next | head -10
# Expected: Routes for /api/qr/* found
```

#### 4.2 Run Pre-Deployment Tests
```bash
# Run smoke tests
npm run test:smoke
# Expected: ✓ All smoke tests pass

# Performance tests
npm run test:perf
# Expected: ✓ Response times within SLA
```

#### 4.3 Deploy Build (Blue-Green Deployment)

```bash
# Option A: Docker Deployment
docker build -t hotel-assistant:latest .
docker tag hotel-assistant:latest hotel-assistant:v1.0-qr
docker push hotel-assistant:v1.0-qr

# Deploy new version
kubectl set image deployment/hotel-assistant \
  app=hotel-assistant:v1.0-qr \
  --record

# Option B: Vercel Deployment
vercel deploy --prod

# Option C: Traditional Server
# 1. Stop old server
systemctl stop hotel-assistant

# 2. Deploy new code
cp -r .next /var/www/hotel-assistant/
cp package*.json /var/www/hotel-assistant/

# 3. Install dependencies
cd /var/www/hotel-assistant
npm ci --production

# 4. Start new server
systemctl start hotel-assistant
```

#### 4.4 Verify Deployment
```bash
# Check service is running
systemctl status hotel-assistant
# Expected: ✓ Service is active and running

# Check logs
tail -f /var/log/hotel-assistant/app.log
# Expected: No errors in logs

# Health check
curl -X GET https://your-app.com/api/health
# Expected: HTTP 200, { "status": "ok" }
```

---

### Phase 5: Functional Testing (45 minutes)

#### 5.1 API Endpoint Tests
```bash
# Test Generate Endpoint
curl -X POST https://your-app/api/qr/generate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "hotel-test-1",
    "userId": "user-test-1",
    "role": "guest"
  }'
# Expected: HTTP 201, token object returned

# Test Validate Endpoint
curl -X POST https://your-app/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "jwt-token-here",
    "hotelId": "hotel-test-1"
  }'
# Expected: HTTP 200, session object with permissions

# Test List Tokens Endpoint
curl -X GET "https://your-app/api/qr/tokens?hotelId=hotel-test-1&stats=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: HTTP 200, token list with stats

# Test Revoke Endpoint
curl -X DELETE https://your-app/api/qr/tokens/$TOKEN_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: HTTP 200, success message
```

#### 5.2 Admin Dashboard Tests
```bash
# Access dashboard
curl https://your-app/dashboard/admin/qr \
  -H "Cookie: $SESSION_COOKIE"
# Expected: HTTP 200, QR management page loads

# Verify components load
# ✓ Statistics cards visible
# ✓ Generate button functional
# ✓ Token table displayed
# ✓ Pagination working
```

#### 5.3 End-to-End User Flow
```bash
# 1. Create test user
curl -X POST https://your-app/api/users/create \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"email": "test@example.com", "hotelId": "hotel-1"}'
# Expected: User created

# 2. Generate QR token
curl -X POST https://your-app/api/qr/generate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"userId": "user-xyz", "hotelId": "hotel-1", "role": "guest"}'
# Expected: Token generated, store in $QR_TOKEN

# 3. Validate token (user scans QR)
curl -X POST https://your-app/api/qr/validate \
  -d '{"token": "$QR_TOKEN", "hotelId": "hotel-1"}'
# Expected: Session token returned, store in $SESSION

# 4. Access protected route with session
curl https://your-app/api/chat \
  -H "Authorization: Bearer $SESSION"
# Expected: HTTP 200, chat accessible
```

#### 5.4 Verify Audit Trails
```bash
# Check audit logs created
psql -h prod -U prod_user -d prod_db \
  -c "SELECT * FROM GuestStaffQRToken 
      ORDER BY createdAt DESC LIMIT 5;"
# Expected: Tokens show with createdBy, timestamps

# Check revocation audit
psql -h prod -U prod_user -d prod_db \
  -c "SELECT * FROM GuestStaffQRToken 
      WHERE revokedAt IS NOT NULL LIMIT 5;"
# Expected: Revoked tokens show revokedBy, revokedAt
```

---

### Phase 6: Performance & Load Testing (30 minutes)

#### 6.1 Response Time Monitoring
```bash
# Monitor endpoint performance
for i in {1..100}; do
  curl -w "Time: %{time_total}s\n" \
    https://your-app/api/qr/tokens?hotelId=hotel-1 \
    -H "Authorization: Bearer $TOKEN" \
    -o /dev/null -s
done | awk '{sum+=$2; count++} END {print "Avg:", sum/count "s"}'
# Expected: Average response time < 500ms
```

#### 6.2 Load Test
```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 \
  https://your-app/api/qr/tokens?hotelId=hotel-1

# Expected:
# - Failed requests: 0
# - Requests per second: > 100
# - Mean time per request: < 100ms
```

#### 6.3 Database Performance
```bash
# Check slow queries
psql -h prod -U prod_user -d prod_db \
  -c "SELECT query, calls, mean_time 
      FROM pg_stat_statements 
      WHERE query LIKE '%GuestStaffQRToken%' 
      ORDER BY mean_time DESC;"
# Expected: All queries < 100ms average

# Check index usage
psql -h prod -U prod_user -d prod_db \
  -c "SELECT schemaname, tablename, indexname, idx_scan 
      FROM pg_stat_user_indexes 
      WHERE tablename = 'GuestStaffQRToken';"
# Expected: All indexes have idx_scan > 0
```

---

## ⚡ Rollback Procedures

### Quick Rollback (Application Only)

```bash
# If new deployment is unstable
# Redeploy previous version

# Docker
docker set image deployment/hotel-assistant \
  app=hotel-assistant:v0.9 \
  --record
kubectl rollout undo deployment/hotel-assistant

# Vercel
vercel rollback

# Traditional
systemctl stop hotel-assistant
cd /var/www/hotel-assistant
git checkout previous-tag
npm ci
systemctl start hotel-assistant
```

### Database Rollback

```bash
# If migration causes issues
# Restore from backup IMMEDIATELY

# 1. Stop application
systemctl stop hotel-assistant

# 2. Drop problematic table
psql -h prod -U prod_user -d prod_db \
  -c "DROP TABLE IF EXISTS GuestStaffQRToken CASCADE;"

# 3. Restore database from backup
psql -h prod -U prod_user -d prod_db < production_backup_latest.sql

# 4. Verify restoration
psql -h prod -U prod_user -d prod_db \
  -c "SELECT COUNT(*) FROM GuestStaffQRToken;"

# 5. Restart application
systemctl start hotel-assistant
```

### Full Rollback
```bash
# If complete rollback needed
# 1. Restore database backup
# 2. Redeploy previous version
# 3. Test thoroughly before resuming
```

---

## ✅ Post-Deployment Verification

### Health Checks (Automated)

```bash
#!/bin/bash
# save as healthcheck.sh

CHECKS_PASSED=0
CHECKS_FAILED=0

# Check 1: Application running
if curl -f https://your-app/api/health > /dev/null 2>&1; then
  echo "✓ Application is running"
  ((CHECKS_PASSED++))
else
  echo "✗ Application health check failed"
  ((CHECKS_FAILED++))
fi

# Check 2: Database connected
if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✓ Database connected"
  ((CHECKS_PASSED++))
else
  echo "✗ Database connection failed"
  ((CHECKS_FAILED++))
fi

# Check 3: QR tokens table exists
TABLES=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t \
  -c "SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name='GuestStaffQRToken';")

if [ "$TABLES" -eq 1 ]; then
  echo "✓ GuestStaffQRToken table exists"
  ((CHECKS_PASSED++))
else
  echo "✗ GuestStaffQRToken table not found"
  ((CHECKS_FAILED++))
fi

# Check 4: Admin can access QR dashboard
DASHBOARD=$(curl -s -H "Cookie: $SESSION" \
  https://your-app/dashboard/admin/qr | grep "QR Code Management")

if [ ! -z "$DASHBOARD" ]; then
  echo "✓ QR dashboard accessible"
  ((CHECKS_PASSED++))
else
  echo "✗ QR dashboard not accessible"
  ((CHECKS_FAILED++))
fi

echo ""
echo "Results: $CHECKS_PASSED passed, $CHECKS_FAILED failed"

if [ $CHECKS_FAILED -gt 0 ]; then
  exit 1
fi
```

### Monitoring Setup

```yaml
# prometheus.yml - Add QR metrics
scrape_configs:
  - job_name: 'qr-tokens'
    static_configs:
      - targets: ['localhost:9090']
    
# grafana-dashboard.json - Add dashboard
{
  "title": "QR Token Metrics",
  "panels": [
    {
      "title": "Active Tokens",
      "targets": [
        { "expr": "qr_tokens_active" }
      ]
    },
    {
      "title": "Token Generation Rate",
      "targets": [
        { "expr": "rate(qr_tokens_generated[5m])" }
      ]
    },
    {
      "title": "API Response Times",
      "targets": [
        { "expr": "histogram_quantile(0.95, qr_api_duration)" }
      ]
    }
  ]
}
```

---

## 🚨 Deployment Sign-Off

### Engineering Checklist
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Build successful
- [ ] Security scan passed
- [ ] Performance requirements met

**Signed by**: _______________  **Date**: ______________

### QA Checklist
- [ ] Functional tests passed
- [ ] End-to-end flows verified
- [ ] No regressions detected
- [ ] Performance acceptable

**Signed by**: _______________  **Date**: ______________

### Operations Checklist
- [ ] Database migration successful
- [ ] Application deployed and running
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Rollback plan ready

**Signed by**: _______________  **Date**: ______________

---

## 📊 Deployment Timeline

| Phase | Duration | Owner | Status |
|-------|----------|-------|--------|
| Pre-Deployment Validation | 30 min | Eng | ⏳ |
| Database Migration | 45 min | DevOps | ⏳ |
| Data Seeding | 20 min | DevOps | ⏳ |
| Application Deployment | 30 min | DevOps | ⏳ |
| Functional Testing | 45 min | QA | ⏳ |
| Performance Testing | 30 min | Perf | ⏳ |
| **Total** | **~3.5 hours** | — | — |

---

**Last Updated**: December 12, 2025  
**Status**: Production Ready ✅  
**Next Review**: 1 month post-deployment
