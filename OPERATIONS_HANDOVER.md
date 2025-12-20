# Operations Handover Package

**Created**: $(date)  
**Version**: 1.0.0  
**Status**: Production Ready  
**Audience**: Operations Team, Support Team, New Team Members

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Overview](#architecture-overview)
3. [Operational Runbooks](#operational-runbooks)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Incident Response](#incident-response)
6. [Maintenance & Updates](#maintenance--updates)
7. [Disaster Recovery](#disaster-recovery)
8. [Team & Escalation](#team--escalation)
9. [Knowledge Base](#knowledge-base)
10. [Contact Information](#contact-information)

---

## System Overview

### What is the AI Hotel Assistant PMS?

A comprehensive Property Management System designed specifically for hotel operations, featuring:

- **Booking Management**: Reservations, modifications, cancellations
- **Room Management**: Inventory tracking, status updates, housekeeping workflows
- **Staff CRM**: Employee management, task assignments, performance tracking
- **Payment Processing**: Secure Stripe integration, invoice management
- **Analytics**: Real-time occupancy, revenue, and operational metrics
- **AI Features**: Chat assistant powered by OpenAI for guest queries
- **Mobile Access**: Native staff app for check-in/check-out and housekeeping
- **Widget SDK**: Embeddable booking widget for third-party websites

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js App Router, React, TypeScript |
| Backend | Node.js, Express (via API routes) |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Authentication | NextAuth.js with JWT |
| ORM | Prisma |
| Styling | Tailwind CSS, shadcn/ui |
| API Documentation | TypeDoc, OpenAPI/Swagger |
| Testing | Jest, Vitest, Playwright |
| CI/CD | GitHub Actions |
| Deployment | Vercel, Kubernetes (optional) |
| Monitoring | DataDog, Sentry (or similar) |
| Payment | Stripe |
| Email | SendGrid |
| AI | OpenAI API |

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
├──────────────┬──────────────────┬──────────────┬─────────────┤
│   Web App    │  Mobile App      │   Widget     │   Admin     │
│  (React)     │  (React Native)  │  (Embedded)  │  (React)    │
└──────────────┴──────────────────┴──────────────┴─────────────┘
                             │
                             ▼ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    Reverse Proxy / CDN                       │
│                  (Cloudflare / AWS CloudFront)               │
└──────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               Load Balancer (HAProxy / ALB)                  │
└──────────┬──────────────────────────────┬────────────────────┘
           │                              │
      ┌────▼────┐                    ┌────▼────┐
      │Instance 1│                    │Instance 2│
      │(Next.js) │                    │(Next.js) │
      │Port 3000 │                    │Port 3000 │
      └────┬─────┘                    └────┬─────┘
           │                              │
           └──────────────┬───────────────┘
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
    ┌───▼───┐         ┌───▼───┐         ┌───▼───┐
    │PostgreSQL       │ Redis  │         │S3     │
    │(Primary)        │(Cache) │         │Static │
    │Port 5432        │Port 6379         │Assets │
    └───────┘         └────────┘         └───────┘
        │
        ├─► Replica (Read-only)
        └─► Backup (Automated)
```

### Service Dependencies

```
Application (Next.js)
├── Database (PostgreSQL)
│   ├── Primary (write)
│   └── Replica (read)
├── Cache (Redis)
│   ├── Session storage
│   ├── Booking cache
│   └── Analytics cache
├── External APIs
│   ├── Stripe (payments)
│   ├── SendGrid (email)
│   ├── OpenAI (AI features)
│   └── PMS system (booking sync)
└── Storage (S3)
    └── Backups, Documents, Assets
```

---

## Operational Runbooks

### 1. Daily Operations

#### Morning Checklist (9:00 AM UTC)

```bash
# 1. Health check
curl -H "Authorization: Bearer $HEALTH_CHECK_TOKEN" \
  https://api.pms.example.com/health

# 2. Check overnight logs
aws logs tail /aws/lambda/pms --since 12h --follow

# 3. Database replication lag
psql -h $DB_HOST -U $DB_USER -d pms_database -c \
  "SELECT slot_name, restart_lsn FROM pg_replication_slots;"

# 4. Redis status
redis-cli -h $REDIS_HOST INFO replication

# 5. Check error rate (Sentry/DataDog)
# Visit: https://sentry.example.com/projects/pms/issues/
# Alert if error rate >1%

# 6. Check backup status
aws s3 ls s3://pms-backups/ --recursive --human-readable | tail -10

# Actions
- [ ] All green? Continue with regular operations
- [ ] Issues found? Escalate to engineering immediately
- [ ] Log checked: Document any anomalies
```

#### Evening Checklist (5:00 PM UTC)

```bash
# 1. Review daily metrics
# - Bookings created
# - Revenue processed
# - Active users
# - Error count

# 2. Check database size
du -sh /var/lib/postgresql/data/

# 3. Verify backups completed
aws s3 ls s3://pms-backups/daily/ | grep $(date +%Y-%m-%d)

# 4. Review any support tickets
# - Unresolved tickets in past 24h
# - Critical issues

# Actions
- [ ] Metrics review complete
- [ ] Backups verified
- [ ] Support status checked
```

### 2. Database Maintenance

#### Weekly Maintenance Window (Sunday 2:00 AM UTC)

```bash
# Scheduled maintenance tasks
# - Database vacuum and analyze
# - Index optimization
# - Statistics update

# Pre-maintenance backup
pg_dump -h $DB_HOST -U $DB_USER -d pms_database \
  -F c -f backup_pre_maintenance_$(date +%Y%m%d).dump

# Run maintenance
psql -h $DB_HOST -U $DB_USER -d pms_database << EOF
VACUUM ANALYZE;
REINDEX DATABASE pms_database;
ANALYZE;
EOF

# Verify database health
psql -h $DB_HOST -U $DB_USER -d pms_database -c \
  "SELECT schemaname, tablename, last_vacuum, last_analyze 
   FROM pg_stat_user_tables ORDER BY last_vacuum DESC;"
```

#### Monthly Maintenance (First Sunday of month, 1:00 AM UTC)

```bash
# 1. Database integrity check
pg_dump -d pms_database --schema-only --verbose > schema_backup.sql

# 2. Index fragmentation analysis
psql -h $DB_HOST -U $DB_USER -d pms_database << EOF
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY idx_tup_read DESC;
EOF

# 3. Remove unused indices
psql -h $DB_HOST -U $DB_USER -d pms_database << EOF
SELECT indexname FROM pg_stat_user_indexes 
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%';
EOF

# 4. Update Prisma client
npx prisma generate

# 5. Run migrations (if any)
npx prisma migrate deploy
```

### 3. Application Updates

#### Deploying Non-Breaking Changes (Normal deployment)

```bash
# 1. Verify changes in staging
# - All tests pass
# - Performance acceptable
# - No new errors

# 2. Create deployment ticket
# - Title: "Deploy v1.x.x to production"
# - Description: Changelog from GitHub Release
# - Approval: Required from 2 engineers

# 3. Execute deployment
cd /path/to/app
git pull origin main
npm ci
npm run build

# 4. Deploy to production (via GitHub Actions or manual)
git tag -a v1.x.x -m "Release v1.x.x"
git push origin main
git push origin v1.x.x

# 5. Monitor deployment
# - Check error rates in Sentry
# - Monitor response times in DataDog
# - Check real-time user feedback in support channels

# 6. Post-deployment
# - Verify all critical paths working
# - Update status page if needed
# - Notify team in Slack
```

#### Deploying Breaking Changes (Major version bump)

```bash
# Follow "Deploying Non-Breaking Changes" but with:

# 1. Additional pre-deployment steps
#    - Client app updates deployed first (mobile app, widget)
#    - Backward compatibility tested in staging
#    - Migration scripts prepared

# 2. Longer monitoring window
#    - Monitor for 2 hours instead of 30 minutes
#    - Have rollback team on standby

# 3. Post-deployment verification
#    - All integrations working (Stripe, SendGrid, PMS)
#    - Client apps can communicate with new API
#    - Data migration successful
```

---

## Monitoring & Alerting

### Dashboard Access

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Production | https://dash.datadoghq.com/... | Real-time metrics |
| Errors | https://sentry.example.com | Error tracking |
| Uptime | https://uptime.example.com | Availability monitoring |
| Status | https://status.pms.example.com | Public status page |
| Logs | https://logs.example.com | Centralized logging |

### Key Metrics to Monitor

#### Application Metrics
- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- CPU usage (%)
- Memory usage (%)
- Disk I/O (reads/writes)

#### Database Metrics
- Query latency
- Connection count
- Replication lag
- Cache hit rate
- Disk space usage
- Query throughput

#### Business Metrics
- Bookings created (per day)
- Revenue processed (per day)
- Active users (concurrent)
- API uptime (%)

### Alert Thresholds

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Error Rate | >1% | Critical | Escalate immediately |
| Response Time (p99) | >2000ms | High | Check application logs |
| Database Replication Lag | >5s | High | Check database health |
| CPU Usage | >85% | Medium | Scale up if sustained |
| Memory Usage | >90% | High | Investigate memory leak |
| Disk Space | >85% | Medium | Plan cleanup/expansion |
| Error Spikes | 5x baseline | Critical | Escalate immediately |

---

## Incident Response

### Incident Classification

| Severity | Impact | Response Time |
|----------|--------|-----------------|
| **Critical** | Service down or degraded >50% | <5 minutes |
| **High** | Feature down or major impact | <15 minutes |
| **Medium** | Non-critical feature affected | <1 hour |
| **Low** | Minor issues, workaround available | <4 hours |

### Incident Response Process

#### Step 1: Detect & Alert (Automated or Manual)
```
Automated: Monitoring systems detect issue
Manual: User report, support ticket, or team observation

Examples:
- Error rate spike >1%
- API response time >2000ms
- Database replication lag >5s
- Service health check failed
- PagerDuty alert triggered
```

#### Step 2: Triage (5-10 minutes)
```
1. Open incident in tracking system (Jira / Linear)
2. Assess severity (Critical/High/Medium/Low)
3. Notify on-call engineer
4. Start incident timeline in Slack
5. Assign incident commander
```

#### Step 3: Initial Investigation (5-15 minutes)
```bash
# Check real-time metrics
# 1. Application logs
tail -f /var/log/pms/app.log | grep ERROR

# 2. Error tracker
curl https://sentry.example.com/api/issues/ \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.'

# 3. Database health
psql -h $DB_HOST -U $DB_USER -d pms_database << EOF
SELECT now(), pg_database.datname, 
       pg_stat_get_db_tup_returned(pg_database.oid) as returned,
       pg_stat_get_db_tup_fetched(pg_database.oid) as fetched
FROM pg_database;
EOF

# 4. Service status
kubectl describe pod -l app=pms -n production

# 5. Recent deployments
git log --oneline -n 10

# Post findings to Slack #pms-incidents
```

#### Step 4: Mitigation (Varies by issue)

**If Application Issue**:
```bash
# Option A: Restart service
kubectl rollout restart deployment/pms -n production

# Option B: Scale down/up to reset
kubectl scale deployment pms --replicas=0 -n production
kubectl scale deployment pms --replicas=2 -n production

# Option C: Rollback deployment
git revert HEAD --no-edit
git push origin main
# Wait for CI/CD to redeploy
```

**If Database Issue**:
```bash
# Option A: Failover to replica
# Contact database admin or execute failover script
./scripts/db-failover.sh

# Option B: Kill long-running queries
psql -h $DB_HOST -U $DB_USER -d pms_database << EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE duration > interval '5 minutes';
EOF

# Option C: Clear cache (if cache is causing issues)
redis-cli FLUSHALL  # WARNING: Clears all cache
```

**If Infrastructure Issue**:
```bash
# Option A: Increase resources
kubectl set resources deployment pms --limits=cpu=4,memory=8Gi -n production

# Option B: Load balance adjustment
# Manually adjust load balancer to isolate failing node

# Option C: Failover to backup region
# Execute geo-failover script
./scripts/failover-to-backup-region.sh
```

#### Step 5: Communication

```
Post to Slack #pms-incidents:
- Initial impact assessment
- Mitigation steps taken
- ETA for resolution
- Regular updates (every 15 min if ongoing)
- Resolution confirmation

When Resolved:
- "Issue resolved at HH:MM UTC"
- Duration: X minutes
- Impact: Brief description
- Next: Postmortem scheduled for [date/time]
```

#### Step 6: Postmortem (Within 24 hours)

```
Postmortem Template:
1. What happened?
   - Timeline of events
   - System behavior during incident
   
2. Why did it happen?
   - Root cause analysis
   - Contributing factors
   
3. What did we do?
   - Actions taken to mitigate
   - What worked well
   
4. What do we do now?
   - Prevent recurrence (code/process changes)
   - Improve detection (monitoring/alerting)
   - Improve response (runbook updates)
   
5. Action items
   - Owner: Task description
   - Due date: [YYYY-MM-DD]
```

---

## Maintenance & Updates

### Dependency Updates

#### Monthly Update Cycle
```bash
# 1. Check for updates
npm outdated

# 2. Update non-breaking changes
npm update

# 3. Test locally
npm test
npm run build

# 4. Deploy to staging
git push origin feature/dependency-updates
# PR → Review → Merge → Deploy to staging

# 5. Verify staging stability (48 hours)

# 6. Merge to main
git merge feature/dependency-updates

# 7. Deploy to production
# v1.x.(patch+1) automatically created
```

#### Security Updates (Immediate)
```bash
# 1. Critical dependency vulnerability detected
npm audit

# 2. Fix immediately (don't wait for monthly cycle)
npm audit fix

# 3. Test thoroughly
npm test && npm run test:e2e

# 4. Deploy to production within 1 hour
```

### OS & Infrastructure Updates

#### Scheduled Maintenance (Monthly, Sunday 2 AM UTC)

```bash
# Database server
# - OS patches
# - PostgreSQL updates
# - Filesystem checks

# Application servers
# - Node.js updates
# - OS patches
# - SSL certificate renewal

# Infrastructure
# - Load balancer updates
# - Cache updates
# - Networking changes
```

### SSL Certificate Renewal

```bash
# Automated (via Let's Encrypt):
# Renews 30 days before expiration
# Check status: certbot certificates

# If manual renewal needed:
certbot renew --dry-run  # Test
certbot renew            # Actual renewal

# Verify new certificate
openssl s_client -connect api.pms.example.com:443 -showcerts
```

---

## Disaster Recovery

### Backup Strategy

#### Backup Schedule
- **Database**: Hourly incremental, daily full
- **Files**: Daily incremental
- **Configuration**: Weekly
- **Retention**: 30 days (production), 7 days (staging)

#### Backup Locations
```
Primary:    s3://pms-backups/production/
Backup:     s3://pms-backups-dr/production/ (different region)
Offsite:    Third-party backup service
```

### Recovery Procedures

#### Scenario 1: Database Corruption

```bash
# 1. Assess extent of corruption
psql -h $DB_HOST -U $DB_USER -d pms_database << EOF
SELECT * FROM pg_catalog.pg_tables WHERE tablename = 'corrupted_table';
ANALYZE;
VACUUM;
EOF

# 2. If minor: Use built-in repair
REINDEX TABLE corrupted_table;

# 3. If major: Restore from backup
# Create new database instance
createdb pms_database_recovered

# Restore backup
pg_restore -d pms_database_recovered \
  s3://pms-backups/production/backup_YYYYMMDD.dump

# Verify restoration
psql -d pms_database_recovered -c "SELECT COUNT(*) FROM users;"

# If verification successful:
# 1. Stop application
# 2. Switch application to recovered database
# 3. Test thoroughly
```

#### Scenario 2: Application Failure

```bash
# Rollback to previous version
git revert HEAD~1
git push origin main

# Monitor recovery
kubectl logs -f deployment/pms -n production

# Once stable, analyze failure
# and implement fix
```

#### Scenario 3: Complete Data Loss

```bash
# 1. Restore from backup
pg_restore -d pms_database \
  s3://pms-backups-dr/production/backup_latest.dump

# 2. Restore application from backup
aws s3 sync s3://pms-app-backup/production /opt/pms/

# 3. Verify system
curl https://api.pms.example.com/health

# 4. Notify stakeholders
# "System recovered from backup as of [timestamp]"
# "Data loss: [X minutes]"

# 5. Restore incremental data
# If available, apply transaction logs since last backup
```

### Recovery Time Objectives (RTOs) & Recovery Point Objectives (RPOs)

| Scenario | RTO | RPO |
|----------|-----|-----|
| Database backup restore | 30 minutes | <1 hour |
| Application redeployment | 10 minutes | <5 minutes |
| Infrastructure failover | 5 minutes | <5 minutes |
| Full system recovery | 60 minutes | <30 minutes |

---

## Team & Escalation

### Team Structure

```
Operations Manager
├── On-Call Engineer (24/7 rotation)
├── Database Administrator
├── DevOps Engineer
├── Application Reliability Engineer
└── Support Team Lead

Engineering Oncall Escalation:
L1: Support Team → L2: On-Call Engineer → L3: Engineering Lead → L4: CTO
```

### On-Call Rotation

**Weekly Schedule**:
```
Week 1: Engineer A (Mon-Sun)
Week 2: Engineer B (Mon-Sun)
Week 3: Engineer C (Mon-Sun)
Week 4: Engineer D (Mon-Sun)

PagerDuty: Automated notifications
Escalation: If no response in 10 minutes, escalate to backup
```

### Communication Channels

| Channel | Purpose | Owner |
|---------|---------|-------|
| #pms-alerts | Automated alerts from monitoring | Monitoring system |
| #pms-incidents | Active incident discussion | On-call engineer |
| #pms-deployments | Deployment updates | DevOps |
| @pms-oncall | PagerDuty notifications | PagerDuty |
| pms-incidents Zoom | Video for critical incidents | Incident Commander |

---

## Knowledge Base

### Common Issues & Solutions

#### Issue 1: High Error Rate Spike
```
Symptoms: Error rate >1% in Sentry
Typical Causes:
- Deployment introduced bug
- Database connection pool exhausted
- External API timeout (Stripe, OpenAI)

Solutions:
1. Check recent deployments (git log)
2. Check database connection count
3. Check external API status
4. If recent deployment: Rollback
5. If external API: Implement retry logic + circuit breaker
```

#### Issue 2: Slow Response Times
```
Symptoms: p99 latency >2000ms
Typical Causes:
- Database slow queries
- Cache miss rate high
- External API slow
- Memory exhaustion

Solutions:
1. Query database slow log
   - SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;
2. Check cache hit rates (Redis)
   - redis-cli INFO stats | grep hit_rate
3. Check external API latency
4. Increase resources if CPU/memory high
```

#### Issue 3: Database Replication Lag
```
Symptoms: Replication lag >5 seconds
Typical Causes:
- High write throughput
- Network latency
- Replica resource contention

Solutions:
1. Reduce write load if possible
2. Optimize write queries
3. Increase replica resources
4. Check network latency to replica
5. Consider sharding if sustainable lag
```

#### Issue 4: Certificate Expiration
```
Symptoms: HTTPS certificate will expire in N days
Prevention:
- Automated renewal via Let's Encrypt
- Monitor expiration dates

If Manual Renewal Needed:
1. Run: certbot renew
2. Verify: openssl s_client -connect api.pms.example.com:443
3. Restart web server
4. Monitor for any HTTPS connection issues
```

### Useful Commands

```bash
# Database commands
psql -h $DB_HOST -U $DB_USER -d pms_database
SELECT * FROM users LIMIT 10;
SELECT COUNT(*) FROM bookings;

# Redis commands
redis-cli ping
redis-cli KEYS '*'
redis-cli TTL key_name

# Application logs
kubectl logs -f deployment/pms -n production
journalctl -u pms -n 100

# System metrics
top -b -n 1
df -h
du -sh /var/log

# Network diagnostics
netstat -tuln | grep LISTEN
lsof -i :3000
curl -v https://api.pms.example.com/health
```

---

## Contact Information

### Key Contacts

| Role | Name | Email | Phone | Availability |
|------|------|-------|-------|--------------|
| CTO | [Name] | [email] | [phone] | 24/7 critical |
| Operations Manager | [Name] | [email] | [phone] | Business hours |
| On-Call Engineer | [Rotation] | [email] | [phone] | 24/7 (PagerDuty) |
| Database Admin | [Name] | [email] | [phone] | Business hours |
| DevOps Lead | [Name] | [email] | [phone] | Business hours |

### External Contacts

| Service | Contact | Status Page |
|---------|---------|-------------|
| AWS | [support.aws.amazon.com](https://support.aws.amazon.com) | [status.aws.amazon.com](https://status.aws.amazon.com) |
| Stripe | support@stripe.com | [stripe.com/status](https://stripe.com/status) |
| SendGrid | support@sendgrid.com | [status.sendgrid.com](https://status.sendgrid.com) |
| Vercel | support@vercel.com | [vercel.com/status](https://vercel.com/status) |

### Documentation Links

| Document | Location | Owner |
|----------|----------|-------|
| Architecture | docs/architecture.md | Tech Lead |
| API Docs | https://docs.pms.example.com | Backend Team |
| Runbooks | docs/runbooks/ | Operations |
| Troubleshooting | docs/troubleshooting.md | Support |
| Deployment | DEPLOYMENT_PLAN.md | DevOps |
| Security | SECURITY.md | Security Team |

---

## Appendix: Quick Start for New Team Members

### First Day
1. [ ] Read this entire document
2. [ ] Get AWS/production access
3. [ ] Install required tools (kubectl, psql, redis-cli)
4. [ ] Set up local development environment
5. [ ] Join all Slack channels (#pms-*)
6. [ ] Attend team orientation

### First Week
1. [ ] Shadow on-call engineer for 1 week
2. [ ] Review recent incidents (postmortems)
3. [ ] Study deployment procedures
4. [ ] Practice incident response (simulated)
5. [ ] Get familiar with monitoring dashboards

### First Month
1. [ ] Take on-call rotation (paired with experienced engineer)
2. [ ] Handle several production incidents
3. [ ] Lead one deployment to production
4. [ ] Update documentation with learnings
5. [ ] Review and update runbooks

---

**Document Version**: 1.0.0  
**Last Updated**: $(date)  
**Next Review**: Quarterly  
**Approved By**: Operations Manager, CTO

---

This handover package is a living document. Please update it as processes change and new information becomes available.
