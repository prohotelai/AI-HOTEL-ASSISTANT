# Production Deployment & Migration Plan

**Status**: Ready for Execution  
**Target Deployment**: After Phase 7 completion  
**Estimated Duration**: 2-4 hours (with zero-downtime strategy)  
**Risk Level**: Low (comprehensive testing completed, rollback available)

---

## Executive Summary

This document outlines the step-by-step process for deploying the AI Hotel Assistant PMS v1.0.0 from staging to production with zero downtime. The plan includes pre-deployment verification, phased rollout, monitoring, and rollback procedures.

---

## Pre-Deployment Checklist (48 hours before)

### 1. Final Code Review
- [ ] All PRs reviewed and approved by 2+ engineers
- [ ] Code coverage remains >80%
- [ ] All security scans passing (Snyk, SonarQube, Gitleaks)
- [ ] No critical/high severity issues in SAST results
- [ ] TypeScript strict mode passes: `npm run type-check`
- [ ] All lint rules passing: `npm run lint`

### 2. Testing Verification
- [ ] Unit tests: `npm test` (100% pass rate)
- [ ] Integration tests: Pass on staging database
- [ ] E2E tests: All critical path tests passing
  - Auth flows (login, magic link, logout)
  - Booking creation and management
  - Payment processing (test payment)
  - Check-in/check-out workflows
  - Staff operations
  - Admin functions
- [ ] Performance tests: Load testing shows no degradation
- [ ] Security tests: Penetration testing completed, findings resolved

### 3. Database Preparation
- [ ] Schema migrations reviewed: `prisma/migrations/`
- [ ] Migration tested on staging: `npx prisma migrate deploy`
- [ ] Rollback script prepared and tested
- [ ] Backup of current production database created
- [ ] Data validation checks prepared (SQL scripts ready)

### 4. Infrastructure Readiness
- [ ] Production environment provisioned and verified
- [ ] All compute instances healthy
- [ ] Database replicas synchronized
- [ ] Load balancers configured
- [ ] CDN cache cleared (or configured)
- [ ] DNS records ready to switch
- [ ] SSL certificates valid for next 30+ days

### 5. Configuration Review
- [ ] All environment variables configured in secrets manager
  - Database URLs (connection strings validated)
  - API keys (OpenAI, Stripe, SendGrid)
  - JWT secret (>64 chars, unique to prod)
  - OAuth credentials (if applicable)
- [ ] Feature flags configured (critical features enabled)
- [ ] Email templates tested
- [ ] SMS templates tested (if applicable)
- [ ] Error message configurations reviewed

### 6. Monitoring & Alerting
- [ ] Monitoring dashboards created and tested
  - Application metrics (requests, errors, latency)
  - Infrastructure metrics (CPU, memory, disk)
  - Database metrics (queries, connections, replication lag)
- [ ] Alerting rules configured and tested
  - Error rate threshold: >1% in 5 minutes
  - Response time threshold: p99 >2000ms
  - Database replication lag: >5 seconds
  - Disk usage: >85%
- [ ] Logging aggregation verified
  - CloudWatch logs configured
  - Log retention: 90 days
- [ ] Error tracking (Sentry) configured
- [ ] APM (DataDog/New Relic) configured

### 7. Backup & Recovery
- [ ] Full database backup: Created and verified (test restore)
- [ ] Backup location: Off-site/different region
- [ ] Backup encryption: Verified
- [ ] Disaster recovery plan: Reviewed and approved
- [ ] RTO/RPO targets: <1 hour RTO, <5 minutes RPO

### 8. Communication Plan
- [ ] Status page: Updated and ready to deploy
- [ ] Slack channels: #pms-deployments, #pms-incidents created
- [ ] On-call rotation: Confirmed for deployment window
- [ ] Stakeholders: Notified of deployment plan
- [ ] Customer communication: Planned (if applicable)

---

## Deployment Window

### Recommended Timing
- **Day**: Tuesday (mid-week, avoiding weekends)
- **Time**: 2:00 PM - 6:00 PM UTC (off-peak hours)
- **Duration**: 2-4 hours (with zero-downtime strategy)
- **Team Size**: 5-7 people
  - 1 Deployment Lead
  - 2 Backend Engineers
  - 1 Frontend Engineer
  - 1 Database Admin
  - 1 Operations/DevOps
  - 1 QA/Monitoring

### Deployment Team Roles

| Role | Responsibility | Escalation |
|------|-----------------|------------|
| **Deployment Lead** | Coordinates entire deployment, decision making | CTO |
| **Backend Engineer** | Application deployment, API health checks | Deployment Lead |
| **Frontend Engineer** | Asset deployment, UI verification | Deployment Lead |
| **Database Admin** | Schema migration, data validation | Deployment Lead |
| **DevOps/Operations** | Infrastructure, load balancers, monitoring | Deployment Lead |
| **QA/Monitoring** | Real-time monitoring, test verification | Deployment Lead |

---

## Phased Deployment Strategy

### Phase 1: Pre-Deployment (T-2 hours)

#### 1.1 Final Staging Verification (30 minutes)
```bash
# Run final test suite on staging
npm test                          # Unit tests
npm run test:integration          # Integration tests
npm run test:e2e                 # E2E tests (critical paths only)

# Verify staging environment
curl -H "Authorization: Bearer $HEALTH_CHECK_TOKEN" \
  https://api-staging.pms.example.com/health
```

**Success Criteria**:
- All tests passing
- Staging API responding with 200 OK
- No recent error spikes in staging logs

#### 1.2 Database Backup (15 minutes)
```bash
# Create full backup of production database
# Using: AWS RDS Backup, pg_dump, or native tools

# For PostgreSQL:
pg_dump -h $DB_HOST_PROD \
        -U $DB_USER \
        -d pms_database \
        -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
aws s3 cp backup_*.dump s3://backup-bucket/production/
```

**Success Criteria**:
- Backup file created with size >100MB (realistic data)
- Backup uploaded to S3/backup location
- Restore test successful (on non-prod DB)

#### 1.3 Team Briefing (15 minutes)
- [ ] Review deployment plan with team
- [ ] Confirm all roles and responsibilities
- [ ] Test communication channels (Slack, conference call)
- [ ] Final Q&A

---

### Phase 2: Application Deployment (T+0 to T+45 minutes)

#### 2.1 Enable Maintenance Mode (5 minutes)
```javascript
// In production API (optional, for graceful handling)
// This informs users of maintenance window

// Create maintenance page (if needed)
// Or use feature flag to show banner to users

// Slack notification
@here Starting production deployment v1.0.0 
Expected duration: 30-60 minutes
Status: https://status.pms.example.com
```

#### 2.2 Deploy New Application Version (20 minutes)

**Strategy: Blue-Green Deployment**

```bash
# Step 1: Build Docker image
docker build -t ghcr.io/ai-hotel/pms:v1.0.0 .

# Step 2: Push to container registry
docker push ghcr.io/ai-hotel/pms:v1.0.0

# Step 3: Deploy to green environment (new, unused)
kubectl apply -f k8s/deployment-green.yaml --image=ghcr.io/ai-hotel/pms:v1.0.0

# Step 4: Wait for green environment to be healthy
kubectl rollout status deployment/pms-green -n production

# Step 5: Run smoke tests against green environment
npm run test:smoke -- --url https://green.internal.pms.example.com

# Step 6: Switch load balancer from blue to green
# Update nginx/HAProxy/load balancer config OR
# Update DNS/service mesh routing
kubectl patch service pms-api -p '{"spec":{"selector":{"version":"green"}}}'

# Step 7: Monitor green environment for 5 minutes
# Check error rates, response times, database connections
```

**Verification at Each Step**:
- Docker image builds successfully
- Image passes security scanning (Trivy)
- Green environment health checks pass
- Smoke tests pass on green environment
- Load balancer successfully routed traffic
- No error spikes observed

#### 2.3 Verify Application Health (10 minutes)
```bash
# Check API health
curl -v https://api.pms.example.com/health
# Expected: 200 OK with status JSON

# Check database connectivity
npm run db:health-check

# Monitor error rates (Sentry)
# Check: New errors should be 0 or very minimal

# Monitor performance metrics (DataDog/APM)
# Check: Response times within normal range
# Check: CPU/Memory usage normal

# Verify key endpoints
curl https://api.pms.example.com/bookings     # 200 OK (with auth)
curl https://api.pms.example.com/rooms        # 200 OK (with auth)
curl https://api.pms.example.com/staff        # 200 OK (with auth)
```

**Success Criteria**:
- Health check returns 200 OK
- No new errors in error tracker
- Response times within SLA (<200ms p50, <1000ms p99)
- Database replication lag <2 seconds

---

### Phase 3: Database Migration (T+45 to T+90 minutes)

#### 3.1 Pre-Migration Validation (10 minutes)
```bash
# Verify current schema
npx prisma db execute --stdin < scripts/schema-check.sql

# Count records (for comparison)
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as booking_count FROM bookings;
SELECT COUNT(*) as room_count FROM rooms;
```

#### 3.2 Execute Migration (15 minutes)
```bash
# Method 1: Using Prisma (recommended)
npx prisma migrate deploy --skip-verify

# Method 2: Using raw SQL (if needed)
psql -h $DB_HOST_PROD -U $DB_USER -d pms_database \
  -f migrations/latest.sql
```

**Monitoring During Migration**:
- Watch database connection count (should remain stable)
- Monitor database CPU usage (should spike briefly)
- Watch replication lag on read replicas (should be <5 seconds)
- No queries timing out

#### 3.3 Post-Migration Validation (10 minutes)
```bash
# Verify schema matches expected version
npx prisma validate

# Verify data integrity
SELECT COUNT(*) FROM users;          # Should match pre-migration count
SELECT COUNT(*) FROM bookings;       # Should match pre-migration count
SELECT COUNT(*) FROM rooms;          # Should match pre-migration count

# Check for constraint violations
SELECT * FROM pg_stat_user_indexes   # Verify indices created
WHERE schemaname = 'public';

# Test critical queries
SELECT * FROM bookings WHERE status = 'confirmed' LIMIT 1;
SELECT * FROM users WHERE role = 'admin' LIMIT 1;
```

**Success Criteria**:
- Migration completes without errors
- Data counts match pre-migration
- No constraint violations
- Query performance acceptable
- Replication lag normal (<2 seconds)

#### 3.4 Generate Prisma Client (5 minutes)
```bash
npx prisma generate
npm run db:check    # Verify Prisma client ready
```

---

### Phase 4: Post-Deployment Testing (T+90 to T+120 minutes)

#### 4.1 Functional Testing (20 minutes)

**Critical Path Tests**:
```bash
# Authentication
curl -X POST https://api.pms.example.com/auth/login \
  -d '{"email":"test@example.com","password":"test123"}'

# Booking Creation
curl -X POST https://api.pms.example.com/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"roomId":"123","checkIn":"2024-12-25","checkOut":"2024-12-26"}'

# Payment Processing (test)
curl -X POST https://api.pms.example.com/payments \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"bookingId":"123","amount":100}'

# Check-in
curl -X POST https://api.pms.example.com/bookings/123/check-in \
  -H "Authorization: Bearer $TOKEN"
```

#### 4.2 Performance Baseline (10 minutes)

```bash
# Establish performance baseline
# Query response times
# Database query times
# API latency percentiles (p50, p95, p99)
# Throughput (requests/second)

# Compare with pre-deployment baseline
# Alert if degradation >10%
```

#### 4.3 User Acceptance Testing (15 minutes)

- [ ] Test via UI (if web app deployed)
- [ ] Test mobile access
- [ ] Test on various browsers
- [ ] Test from different geographic locations

---

### Phase 5: Monitoring & Stabilization (T+120+ minutes)

#### 5.1 Real-Time Monitoring (First 2 hours post-deployment)
```
Monitoring Checklist:
- [ ] Error rate: <0.1%
- [ ] Response time p50: <200ms
- [ ] Response time p99: <1000ms
- [ ] Database connections: Stable
- [ ] CPU usage: <70%
- [ ] Memory usage: <75%
- [ ] Disk I/O: Normal
- [ ] Network throughput: Normal
- [ ] Cache hit rate: >80%
- [ ] No new issues in error tracker
```

**Dashboard**: Create/refresh production monitoring dashboard with these metrics

#### 5.2 User Monitoring
- [ ] Monitor support channels for issues
- [ ] Check social media for complaints
- [ ] Monitor error tracking service (Sentry)
- [ ] Monitor user feedback/bug reports

#### 5.3 Incident Response
If issues detected:
```
1. Assess severity (Critical/High/Medium/Low)
2. Notify team in #pms-incidents Slack channel
3. If Critical:
   - Decide: Fix or Rollback?
   - If Rollback: Execute immediately (see Rollback Procedure)
   - If Fix: Deploy hotfix within 15 minutes
4. Document incident for post-mortem
```

---

## Rollback Procedure

### When to Rollback
- Critical errors affecting core functionality
- Data corruption detected
- Performance degradation >50%
- Security issue discovered
- Database replication failure
- Decision point: Within first 30 minutes post-deployment

### Rollback Steps (T+0 minutes)

#### Step 1: Alert Team (1 minute)
```
Slack: @here ROLLBACK INITIATED - v1.0.0 deployment
Reason: [brief description]
ETA: 10-15 minutes to previous version
```

#### Step 2: Stop Traffic to New Version (1 minute)
```bash
# Using Kubernetes
kubectl patch service pms-api -p '{"spec":{"selector":{"version":"blue"}}}'

# OR using load balancer
# Switch DNS/routing back to blue environment
```

#### Step 3: Verify Old Version Healthy (2 minutes)
```bash
curl https://api.pms.example.com/health
# Should return 200 OK from old version
```

#### Step 4: Database Rollback (if needed, 5-10 minutes)
```bash
# If migration caused issues, rollback schema
# Method 1: Rollback to previous migration
npx prisma migrate resolve --rolled-back <migration-name>

# Method 2: Restore from backup (more time-consuming)
# Only if data corruption detected

# Verify database health
npm run db:health-check
```

#### Step 5: Verify Application (5 minutes)
```bash
# Run critical path tests again
npm run test:smoke

# Check error rates, performance metrics
# Monitor for 10 minutes to ensure stability
```

#### Step 6: Post-Rollback Actions
- [ ] Create incident ticket in Jira
- [ ] Schedule post-mortem (within 24 hours)
- [ ] Notify stakeholders
- [ ] Update status page
- [ ] Notify users via email if necessary

---

## Data Migration Plan

### Pre-Data Migration
1. **Backup current data**: ✓ (done in Phase 1)
2. **Backup strategy tested**: ✓ (tested in staging)
3. **Rollback script prepared**: ✓ (ready if needed)

### Data Migration Strategy

**For Existing Customers**:
```
Current Database → Prisma ORM → New Database
(with active monitoring and validation)

1. Zero-downtime approach:
   - Application continues running on current schema
   - New schema deployed alongside
   - Data gradually migrated in background
   - Cutover happens during low-traffic window
```

**If Database is New**:
```
1. Seed database with minimal data:
   - Admin user
   - Sample hotels/rooms (from configuration)
   - Test bookings (for validation)

2. Allow users to import their data:
   - CSV import for historical bookings
   - API for programmatic data import
   - Manual entry for critical data
```

### Data Validation Post-Migration

```sql
-- Verify record counts
SELECT COUNT(*) as users FROM users;
SELECT COUNT(*) as bookings FROM bookings;
SELECT COUNT(*) as rooms FROM rooms;
SELECT COUNT(*) as staff FROM staff;

-- Verify data integrity
SELECT COUNT(*) FROM users WHERE email IS NULL;    -- Should be 0
SELECT COUNT(*) FROM bookings WHERE booking_id IS NULL;  -- Should be 0
SELECT COUNT(*) FROM rooms WHERE room_id IS NULL;  -- Should be 0

-- Verify relationships
SELECT COUNT(*) FROM bookings WHERE user_id NOT IN (SELECT user_id FROM users);
SELECT COUNT(*) FROM bookings WHERE room_id NOT IN (SELECT room_id FROM rooms);

-- Verify date ranges
SELECT MIN(created_at), MAX(created_at) FROM users;
SELECT MIN(check_in), MAX(check_out) FROM bookings;
```

---

## Post-Deployment Actions

### Immediately After (T+4 hours)

- [ ] Team debriefing: What went well? Any issues?
- [ ] Monitor for 2-4 more hours (skeleton crew)
- [ ] Log deployment metrics (duration, issues, rollback?)
- [ ] Update deployment log

### Within 24 Hours

- [ ] Full post-deployment review
- [ ] Analysis of any issues encountered
- [ ] Update documentation based on learnings
- [ ] Thank the team, celebrate success!
- [ ] Share learnings with wider organization

### Within 1 Week

- [ ] Post-mortem meeting (if any issues)
- [ ] Update runbooks and processes
- [ ] Collect user feedback
- [ ] Verify all monitoring is working
- [ ] Plan next improvements/features

---

## Deployment Verification Checklist

### Pre-Deployment (48 hours before)
```
Code & Testing:
- [ ] All PRs merged
- [ ] Tests: 100% pass rate
- [ ] Coverage: >80%
- [ ] Security: All scans pass
- [ ] Type checking: tsc passes
- [ ] Linting: ESLint passes

Infrastructure:
- [ ] Production environment healthy
- [ ] Database replicas in sync
- [ ] Load balancers configured
- [ ] SSL certificates valid
- [ ] DNS records ready

Monitoring:
- [ ] Dashboards created
- [ ] Alerts configured
- [ ] Logging configured
- [ ] Error tracking enabled

Documentation:
- [ ] Deployment plan reviewed
- [ ] Rollback procedure tested
- [ ] Runbooks updated
- [ ] Team trained
```

### During Deployment
```
Deployment Phases:
- [ ] Phase 1: Pre-deployment validation
- [ ] Phase 2: Application deployed
- [ ] Phase 3: Health checks pass
- [ ] Phase 4: Database migration
- [ ] Phase 5: Post-deployment testing
- [ ] Phase 6: Monitoring stabilized

Real-Time Checks:
- [ ] Error rates normal
- [ ] Response times normal
- [ ] No database issues
- [ ] No infrastructure issues
- [ ] User feedback positive
```

### Post-Deployment (First week)
```
Verification:
- [ ] Zero downtime achieved
- [ ] No critical incidents
- [ ] Performance acceptable
- [ ] Data integrity verified
- [ ] User acceptance confirmed
- [ ] Team confidence high
```

---

## Communication Plan

### Pre-Deployment (1 week before)
- Email to stakeholders: Deployment scheduled
- Email to users: Maintenance window planned
- Status page: Update with deployment information

### Day Before Deployment
- Slack reminder to team
- Verify all team members available
- Final confirmation of deployment window

### Day of Deployment
- Slack announcement: Deployment starting (T-15 min)
- Real-time Slack updates during deployment
- Email update: Deployment completed successfully

### If Rollback
- Immediate Slack notification
- Post-mortem scheduled
- Customer communication if needed

---

## Success Metrics

### Deployment Success Defined As:
- ✅ Zero downtime achieved
- ✅ All critical tests passing
- ✅ No data loss or corruption
- ✅ Error rate <0.1%
- ✅ Performance within SLA
- ✅ All monitoring dashboards healthy
- ✅ User feedback positive
- ✅ No critical incidents

### Post-Deployment Success (Week 1):
- ✅ No unexpected issues
- ✅ Stable error rates
- ✅ Consistent performance
- ✅ User adoption smooth
- ✅ Team confidence high
- ✅ Documentation complete
- ✅ Lessons learned captured

---

## Appendix: Quick Reference

### Deployment Start
```bash
# Final checks
npm run lint && npm run type-check && npm test

# Build and push Docker image
docker build -t ghcr.io/ai-hotel/pms:v1.0.0 .
docker push ghcr.io/ai-hotel/pms:v1.0.0

# Deploy to production
kubectl apply -f k8s/deployment-green.yaml
kubectl rollout status deployment/pms-green

# Monitor
watch kubectl get pods -n production
```

### Immediate Rollback
```bash
# Switch traffic back to blue (old version)
kubectl patch service pms-api -p '{"spec":{"selector":{"version":"blue"}}}'

# Verify old version healthy
curl https://api.pms.example.com/health
```

### Health Check Command
```bash
curl -H "Authorization: Bearer $HEALTH_CHECK_TOKEN" \
  https://api.pms.example.com/health | jq '.'
```

---

**Deployment Lead**: ________________  
**Date**: ________  
**Version Deployed**: v1.0.0  
**Status**: ✅ READY TO DEPLOY
