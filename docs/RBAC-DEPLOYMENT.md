# RBAC System - Deployment Runbook

**Version**: 1.0.0  
**Last Updated**: December 12, 2025  
**Purpose**: Step-by-step guide for deploying RBAC system to production

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved (`npm run build`)
- [ ] All ESLint warnings fixed (`npm run lint`)
- [ ] All tests passing (`npm run test`)
- [ ] Test coverage ≥ 80% (`npm run test:coverage`)
- [ ] No console errors or warnings

### Database
- [ ] Backup production database
- [ ] Migration path verified
- [ ] RBAC schema migrations created
- [ ] Rollback plan documented

### Security
- [ ] All endpoints require authentication
- [ ] Multi-tenant isolation verified
- [ ] API rate limiting configured
- [ ] CORS policy reviewed
- [ ] JWT secret properly configured

### Documentation
- [ ] README-RBAC.md complete
- [ ] API documentation updated
- [ ] Deployment runbook reviewed
- [ ] Troubleshooting guide prepared

---

## 🚀 Deployment Steps

### Phase 1: Pre-Production Verification (30 minutes)

#### Step 1.1: Code Quality Check
```bash
# Build the application
npm run build

# Expected output:
# ✓ TypeScript compilation successful
# ✓ Build completed successfully

# Run all tests
npm run test

# Expected output:
# ✓ Unit tests: XX passed
# ✓ Integration tests: XX passed
# ✓ E2E tests: XX passed
# ✓ Coverage: XX%+
```

**If any tests fail**:
1. Review test output for specific failures
2. Check test logs in `tests/test-results.xml`
3. Run individual test file: `npm run test -- <test-file>`
4. Debug and fix failures
5. Retry until all pass

#### Step 1.2: Environment Configuration
```bash
# Verify environment variables
echo "Checking NEXTAUTH_SECRET..."
[ ! -z "$NEXTAUTH_SECRET" ] && echo "✓ Set" || echo "✗ Missing"

echo "Checking DATABASE_URL..."
[ ! -z "$DATABASE_URL" ] && echo "✓ Set" || echo "✗ Missing"

echo "Checking NEXT_PUBLIC_APP_URL..."
[ ! -z "$NEXT_PUBLIC_APP_URL" ] && echo "✓ Set" || echo "✗ Missing"
```

**Required Variables**:
- `NEXTAUTH_SECRET` - JWT signing key (min 32 chars)
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` - Application URL (e.g., https://app.example.com)

---

### Phase 2: Database Preparation (20 minutes)

#### Step 2.1: Database Backup
```bash
# Create backup before any changes
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > rbac-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh rbac-backup-*.sql

# Expected output:
# -rw-r--r-- 1 user group 2.5M Dec 12 10:00 rbac-backup-20241212-100000.sql
```

#### Step 2.2: Database Migrations
```bash
# Review pending migrations
npx prisma migrate status

# Expected output:
# Pending migrations:
# migration_20241212000000_add_rbac_schema

# Apply migrations
npx prisma migrate deploy

# Expected output:
# ✓ Applied migration: migration_20241212000000_add_rbac_schema in 1234ms
```

**If migration fails**:
1. Restore from backup: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME < rbac-backup-*.sql`
2. Review error in `npx prisma migrate resolve`
3. Fix and retry

#### Step 2.3: Verify Database Schema
```bash
# Connect to database and verify schema
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOF'
  -- Check RBAC tables exist
  \dt "Role"
  \dt "Permission"
  \dt "RolePermission"
  \dt "UserRole"
  
  -- Check record counts
  SELECT count(*) FROM "Role";
  SELECT count(*) FROM "Permission";
EOF

# Expected output:
# role_id | role_name | ...
# --------+-----------+----
#       4 | Role      | ...
```

---

### Phase 3: Data Seeding (15 minutes)

#### Step 3.1: Seed Default Data
```bash
# Run seeding script
node scripts/seed-rbac.js

# Expected output:
# 🏨 Hotel: Demo Grand Hotel
# 📝 Seeding permissions...
# 👤 Seeding roles...
# ✅ Database Status:
#   Hotels: 1
#   Users: 1
#   Roles: 4
#   Permissions: 5
#   ✅ RBAC system is ready!
```

#### Step 3.2: Verify Seeded Data
```bash
# Check permissions
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT count(*) as permission_count FROM \"Permission\";"

# Expected: permission_count = 42 (or more if custom added)

# Check roles
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT name, level, COUNT(*) FROM \"Role\" GROUP BY name, level;"

# Expected: At least Admin, Manager, Staff, Guest roles
```

---

### Phase 4: Application Deployment (30 minutes)

#### Step 4.1: Build Production Bundle
```bash
# Build optimized bundle
npm run build

# Expected output:
# ✓ compiled successfully
# ✓ 1234.5kB total bundle size
# ✓ Generated public/ files

# Verify .next directory exists
ls -la .next/ | head -10
```

#### Step 4.2: Start Application
```bash
# In staging/production environment
npm run start

# Expected output (after ~10 seconds):
# > ai-hotel-assistant@1.0.0 start
# > next start
# 
# > Ready in 1.234s
# > Listening on 0.0.0.0:3000

# Verify application is running
curl http://localhost:3000
# Expected: 200 OK with HTML content
```

#### Step 4.3: Verify RBAC Endpoints
```bash
# Get authentication token first
TOKEN=$(npm run get-token)  # Or login to get token

# Test /api/rbac/permissions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/rbac/permissions
# Expected: 200 OK with permissions array

# Test /api/rbac/roles
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/rbac/roles
# Expected: 200 OK with roles array

# Test /api/session/me
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/session/me
# Expected: 200 OK with user, roles, permissions

echo "✓ All RBAC endpoints responding"
```

---

### Phase 5: Functional Testing (30 minutes)

#### Step 5.1: Admin Dashboard Access
```bash
# Login as admin user
# Open browser to: http://localhost:3000/login
# Email: admin@demograndhotel.com
# Password: (as configured)

# Verify admin dashboard loads
# Navigate to: http://localhost:3000/dashboard/admin/rbac/roles

# Expected:
# ✓ Page loads without errors
# ✓ Role list displayed
# ✓ Search and filter work
# ✓ Create role button present
```

#### Step 5.2: Role Management
```bash
# In admin dashboard:
# 1. Click "New Role" button
# 2. Fill form:
#    - Name: "Test Role"
#    - Key: "test-role"
#    - Level: 2
#    - Description: "Test deployment"
# 3. Click "Create Role"
# 4. Verify role appears in list
# 5. Click permissions link
# 6. Add 3 permissions
# 7. Click "Save Changes"
# 8. Verify success message
```

#### Step 5.3: User Assignment
```bash
# Navigate to: /dashboard/admin/rbac/assignments
# 1. Click "Assign Role"
# 2. Select a user
# 3. Select the "Test Role" created above
# 4. Click "Assign Role"
# 5. Verify role appears next to user
# 6. Check audit trail for assignment
```

#### Step 5.4: Access Control Verification
```bash
# Test 1: Access denied for non-admin
# - Logout
# - Login as staff user (if available)
# - Try to access /dashboard/admin/rbac/roles
# - Expected: Redirect to /403 page

# Test 2: Route protection
# - As admin: Access /dashboard/admin/analytics
# - Expected: Allowed (admin can access)
# - As staff: Access /dashboard/admin/analytics
# - Expected: Redirect to /403

# Test 3: Permission enforcement
# - Create user with no 'pms:read' permission
# - Try to access /api/pms/... endpoint
# - Expected: 403 Forbidden response
```

---

### Phase 6: Load & Performance Testing (Optional, 30 minutes)

#### Step 6.1: API Performance
```bash
# Test endpoint response time
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/rbac/permissions

# Expected: < 100ms response time

# Load test (using Apache Bench)
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/rbac/permissions

# Expected:
# Requests per second: > 100
# Failures: 0
```

#### Step 6.2: Dashboard Performance
```bash
# Open browser DevTools (F12)
# Go to /dashboard/admin/rbac/roles
# Check Network tab:
# - Page load time: < 2 seconds
# - No failed requests (404, 500)
# - CSS/JS files served from cache (304 Not Modified)
```

---

## 🔄 Rollback Procedure

**If deployment fails**, follow these steps:

### Quick Rollback (< 5 minutes)

```bash
# 1. Stop the application
pkill -f "node.*server.js"
# or
docker stop app-container

# 2. Restore previous version
git checkout HEAD~1
npm install

# 3. Restore database from backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < rbac-backup-*.sql

# 4. Restart application
npm run start

# 5. Verify restoration
curl http://localhost:3000
```

### Database Rollback (if schema migration failed)

```bash
# If Prisma migration failed:
npx prisma migrate resolve --rolled-back migration_20241212000000_add_rbac_schema

# Verify rollback
npx prisma migrate status

# Manually restore from backup if needed
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < rbac-backup-*.sql
```

### Full Rollback to Previous Version

```bash
# 1. Identify previous stable version
git log --oneline | head -5

# 2. Checkout previous commit
git checkout abc123def456

# 3. Install previous dependencies
rm -rf node_modules package-lock.json
npm install

# 4. Restore database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < rbac-backup-*.sql

# 5. Build and restart
npm run build
npm run start

# 6. Verify
curl http://localhost:3000
```

---

## 📊 Post-Deployment Verification

### Health Check (5 minutes after deployment)

```bash
#!/bin/bash
# Health check script

echo "🔍 Post-Deployment Verification"
echo "================================"

# Test 1: Application responding
echo "Test 1: Application health..."
curl -s http://localhost:3000/ > /dev/null && echo "✓ App responding" || echo "✗ App not responding"

# Test 2: Database connection
echo "Test 2: Database connection..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/rbac/permissions | grep -q permissions && \
  echo "✓ Database accessible" || echo "✗ Database error"

# Test 3: RBAC endpoints
echo "Test 3: RBAC endpoints..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/rbac/roles | grep -q roles && \
  echo "✓ RBAC endpoints working" || echo "✗ RBAC endpoints failing"

# Test 4: Admin dashboard
echo "Test 4: Admin dashboard..."
curl -s http://localhost:3000/dashboard/admin/rbac/roles | grep -q "Role Management" && \
  echo "✓ Dashboard loading" || echo "✗ Dashboard error"

echo "================================"
echo "✅ Deployment verification complete"
```

### Monitoring Setup

```bash
# Monitor application logs
tail -f /var/log/app.log | grep -E "ERROR|RBAC"

# Monitor database connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'hotel_db';

# Monitor RBAC errors
SELECT count(*) FROM logs 
WHERE message LIKE '%RBAC%' AND level = 'ERROR'
AND created_at > NOW() - INTERVAL 1 HOUR;

# Alert if many 403 responses
SELECT path, count(*) as error_count FROM logs
WHERE status = 403 AND created_at > NOW() - INTERVAL 10 MINUTES
GROUP BY path;
```

---

## 📋 Deployment Sign-Off

### For Deployment Engineer

- [ ] Pre-deployment checklist completed
- [ ] Database backup successful
- [ ] All tests passed
- [ ] Code quality verified
- [ ] Build completed without errors

### For QA Team

- [ ] Functional tests passed
- [ ] Access control verified
- [ ] Role management working
- [ ] User assignment working
- [ ] Performance acceptable
- [ ] No critical bugs found

### For Operations Team

- [ ] Application deployed successfully
- [ ] RBAC endpoints responding
- [ ] Admin dashboard accessible
- [ ] Database stable
- [ ] Monitoring configured
- [ ] Rollback plan ready

---

## 🔗 Quick Reference

| Component | Status | URL/Command |
|-----------|--------|------------|
| Application | ✓ | http://localhost:3000 |
| Admin Dashboard | ✓ | /dashboard/admin/rbac/roles |
| API Health | ✓ | /api/rbac/permissions |
| Database | ✓ | $DATABASE_URL |
| Tests | ✓ | npm run test |
| Logs | ✓ | /var/log/app.log |

---

## 📞 Support & Escalation

**If issues occur during deployment**:

1. **Build Failures** → Check Node.js version, dependencies, environment variables
2. **Database Issues** → Check PostgreSQL version, connection string, backups
3. **Test Failures** → Run individual tests, check test logs, verify test database
4. **Performance Issues** → Check database indices, enable caching, optimize queries
5. **Permission Errors** → Verify role assignments, check seed data, review audit trail

**Contact**: DevOps Team / Development Team  
**Escalation**: Tech Lead / Engineering Manager

---

**Document Status**: ✅ Ready for Production  
**Last Review**: December 12, 2025  
**Next Review**: After first production deployment
