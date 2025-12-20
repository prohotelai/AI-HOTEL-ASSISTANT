# OPERATIONS & DEPLOYMENT QUICK START

**Project**: AI Hotel Assistant v1.0.0  
**Date**: December 12, 2025  
**Purpose**: Quick reference for deployment operations  

---

## 🚀 DEPLOYMENT IN 5 MINUTES

### Prerequisites
```bash
# Check requirements
node --version        # 18.18+ required
npm --version        # 9+ required
docker --version     # For Docker deployment
psql --version       # For database check
```

### Quick Deploy

```bash
# 1. Prepare environment (2 min)
cp .env.example .env.local
nano .env.local       # Edit with your values

# 2. Validate (1 min)
npx ts-node scripts/validate-deployment.ts

# 3. Deploy (2 min)
bash scripts/deploy-production.sh
```

---

## 📋 COMPLETE DEPLOYMENT CHECKLIST

### Pre-Deployment Preparation
- [ ] All team members notified of deployment window
- [ ] Backup of production database created
- [ ] Rollback procedure tested
- [ ] Monitoring dashboard configured
- [ ] On-call engineer assigned
- [ ] Communication channel open (Slack/Teams)

### Configuration
- [ ] `.env.local` created from `.env.example`
- [ ] `DATABASE_URL` verified and tested
- [ ] `NEXTAUTH_SECRET` generated and set (32+ chars)
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] `NEXT_PUBLIC_APP_URL` matches domain
- [ ] All required variables present in `.env.local`
- [ ] `.env.local` never committed to git

### Environment Validation
- [ ] Run: `npx ts-node scripts/validate-deployment.ts`
- [ ] All checks PASS
- [ ] Review validation report
- [ ] Address any warnings

### Database Preparation
- [ ] PostgreSQL server accessible
- [ ] Database exists: `ai_hotel_assistant`
- [ ] User has proper permissions
- [ ] Test connection successful

### Build Verification
- [ ] Run: `npm run build`
- [ ] Build completes without errors
- [ ] `.next` directory created (~2-3MB)
- [ ] No TypeScript errors

### Test Suite (Recommended)
- [ ] Setup test database
- [ ] Run: `npm test -- --run`
- [ ] All unit tests pass (or documented)
- [ ] Run: `npm run test:e2e`
- [ ] All E2E tests pass (or documented)

### Final Pre-Deployment Checks
- [ ] Code reviewed and approved
- [ ] Security audit completed
- [ ] Performance baseline captured
- [ ] Alert thresholds configured
- [ ] Rollback plan confirmed

---

## 🔧 DEPLOYMENT COMMAND REFERENCE

### Option 1: Automated Script (Recommended)
```bash
bash scripts/deploy-production.sh
```

### Option 2: Manual Step-by-Step

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations (safe mode)
npx prisma migrate deploy

# Build application
npm run build

# Start application
npm start
```

### Option 3: Docker Deployment

```bash
# Build image
docker build -t ai-hotel:v1.0.0 .

# Run container
docker run -d \
  --name ai-hotel-prod \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  ai-hotel:v1.0.0

# Verify running
docker logs ai-hotel-prod
curl http://localhost:3000/health
```

### Option 4: Vercel Deployment (Recommended for Next.js)
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## ✅ POST-DEPLOYMENT VALIDATION

### Immediate Checks (First 5 min)
```bash
# Check application running
curl https://yourdomain.com

# Check health endpoint
curl https://yourdomain.com/health

# Check database connectivity
curl https://yourdomain.com/api/health/db

# Check logs
tail -f logs/production.log
```

### Workflow Tests (First 30 min)
- [ ] User login works
- [ ] QR code generation works
- [ ] QR scan login flow completes
- [ ] Admin dashboard accessible
- [ ] Staff dashboard accessible
- [ ] Database queries executing
- [ ] No console errors

### Monitoring (First hour)
- [ ] Error logs monitored
- [ ] Performance metrics normal
- [ ] No resource exhaustion
- [ ] API response times acceptable
- [ ] Database connection pool healthy
- [ ] All services connected

---

## 🚨 ROLLBACK PROCEDURE

### If Deployment Fails

#### Option 1: Revert Application
```bash
# Stop current version
docker stop ai-hotel-prod

# Restore previous version
docker pull ai-hotel:previous-tag
docker run -d --name ai-hotel-prod ai-hotel:previous-tag
```

#### Option 2: Revert Database
```bash
# If migrations caused issues
npx prisma migrate resolve --rolled-back migration_name

# Or restore from backup
psql ai_hotel_assistant < backup.sql
```

#### Option 3: Full Rollback
```bash
# Restore entire environment
git checkout previous-version
npm install
npm run build
npm start
```

#### After Rollback
1. Notify team
2. Document error in issue tracker
3. Post-mortem meeting
4. Fix issues
5. Redeploy when ready

---

## 📊 HEALTH CHECK ENDPOINTS

### Application Health
```bash
# Overall health
curl https://yourdomain.com/health

# Database connection
curl https://yourdomain.com/api/health/db

# API status
curl -H "Authorization: Bearer TOKEN" https://yourdomain.com/api/status

# Authentication
curl -X POST https://yourdomain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Database Health
```bash
# Connect to database
psql -h host -U user -d ai_hotel_assistant

# Check tables exist
\dt

# Count records
SELECT count(*) FROM "Hotel";
SELECT count(*) FROM "User";
SELECT count(*) FROM "Conversation";

# Check migrations applied
SELECT * FROM "_prisma_migrations";
```

---

## 📝 LOGGING & MONITORING

### View Logs
```bash
# Docker logs
docker logs -f ai-hotel-prod

# System logs
tail -f /var/log/application.log

# Database logs
tail -f /var/log/postgresql.log
```

### Key Metrics to Monitor
```
- API response times (target: <200ms)
- Database query times (target: <50ms)
- Error rate (target: <0.1%)
- Memory usage (should be stable)
- CPU usage (should be <70%)
- Connection pool usage
- Request queue length
```

### Alerts to Configure
```
- High error rate (>1%)
- High response time (>500ms)
- High memory usage (>80%)
- Database connection failures
- Disk space low
- API endpoint timeouts
```

---

## 🔐 SECURITY CHECKS POST-DEPLOYMENT

### Verify Security Measures
```bash
# Check HTTPS is enforced
curl -I https://yourdomain.com

# Check security headers
curl -I https://yourdomain.com | grep -i "x-"

# Check JWT tokens work
# (Get token via login, verify it's secure)

# Check authentication required
curl https://yourdomain.com/api/admin  # Should return 401
```

### Security Validation
- [ ] HTTPS enforced (no HTTP redirect)
- [ ] Security headers present
- [ ] CORS properly scoped
- [ ] Authentication required for protected routes
- [ ] RBAC enforced
- [ ] Multi-tenant isolation verified
- [ ] No secrets in logs
- [ ] Error messages don't leak info

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues & Solutions

**Issue**: Database connection refused
```bash
# Solution 1: Check connection string
echo $DATABASE_URL

# Solution 2: Test PostgreSQL
psql -h <host> -U <user> -c "SELECT 1"

# Solution 3: Check firewall
nc -zv <host> 5432
```

**Issue**: Migrations won't apply
```bash
# Check migration status
npx prisma migrate status

# View pending migrations
npx prisma migrate diff --from-empty --script

# Skip specific migration if needed
npx prisma migrate resolve --rolled-back migration_name
```

**Issue**: Application won't start
```bash
# Check logs for details
docker logs ai-hotel-prod

# Verify environment variables
echo $DATABASE_URL
echo $NEXTAUTH_SECRET

# Rebuild and try again
npm run build
npm start
```

**Issue**: Slow API responses
```bash
# Check database performance
psql -h <host> -U <user> -d ai_hotel_assistant -c "EXPLAIN ANALYZE SELECT ...;"

# Monitor resource usage
top
htop

# Check connection pool
npx prisma studio
```

---

## 📋 DEPLOYMENT SIGN-OFF FORM

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Environment**: _______________  
**Version**: 1.0.0  

**Pre-Deployment Checklist**:
- [ ] Environment validated
- [ ] Database backup created
- [ ] Tests passing
- [ ] Build successful
- [ ] Security reviewed
- [ ] Team notified

**Post-Deployment Validation**:
- [ ] Application running
- [ ] Health checks passing
- [ ] Database accessible
- [ ] Workflows tested
- [ ] No critical errors
- [ ] Monitoring active

**Performance Baselines**:
- API Response Time: _______ ms
- Database Query Time: _______ ms
- Error Rate: _______%
- Memory Usage: _______%
- CPU Usage: _______%

**Sign-Off**:
- Operations: _________________ Date: _______
- Product: _________________ Date: _______
- Engineering: _________________ Date: _______

---

## 📚 ADDITIONAL RESOURCES

### Documentation Files
- `SESSION_5_7_DEPLOYMENT_SUMMARY.md` - Full deployment report
- `PRODUCTION_DEPLOYMENT_REPORT.md` - Detailed guide
- `DEPLOYMENT_EXECUTION_PLAN.md` - Step-by-step checklist
- `SESSION_5_6_IMPLEMENTATION_INDEX.md` - Code reference
- `.env.example` - Environment variable template

### Helpful Commands
```bash
# Quick info
npm list                           # Dependencies
npm outdated                       # Update check
npm audit                          # Security check

# Database
npx prisma studio                  # Visual DB explorer
npx prisma migrate status          # Migration status
npx prisma generate                # Generate client

# Build & Test
npm run build                       # Production build
npm test -- --run                  # Unit tests
npm run test:e2e                   # E2E tests

# Deployment
bash scripts/deploy-production.sh  # Auto deploy
docker build -t ai-hotel:v1 .     # Docker build
```

---

## 🎯 SUCCESS CRITERIA

Your deployment is successful when:
- ✅ Application starts without errors
- ✅ All health checks pass
- ✅ Database queries execute normally
- ✅ User can login
- ✅ Admin dashboard works
- ✅ No critical errors in logs
- ✅ Monitoring shows normal metrics
- ✅ All team members can confirm access

---

**End of Operations Quick Start**

*Last Updated: December 12, 2025*  
*System: AI Hotel Assistant v1.0.0*  
*Status: Production Ready*
