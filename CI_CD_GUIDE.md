# CI/CD Pipeline Configuration Guide

## Overview

This comprehensive CI/CD pipeline automates testing, building, deploying, and monitoring the AI Hotel Assistant PMS across multiple environments. The pipeline consists of 6 GitHub Actions workflows covering the complete software delivery lifecycle.

## Workflow Structure

### 1. **Main CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
**Purpose**: Core build, test, and deployment pipeline

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs** (in execution order):

#### Job 1: Lint & Type Check
- Runs: `npm run lint` (ESLint)
- Runs: `npx tsc --noEmit` (TypeScript compiler)
- **Purpose**: Catch style and type issues early
- **Duration**: 2-3 minutes
- **Required for**: ✅ All PRs must pass

#### Job 2: Unit & Integration Tests
- **Prerequisites**: Lint must pass
- **Services**: PostgreSQL 15, Redis 7
- **Database Setup**:
  ```bash
  npm run db:generate    # Generate Prisma client
  npm run db:push       # Create schema
  ```
- **Test Commands**:
  - Unit tests: `npm test -- tests/unit --coverage`
  - Integration tests: `npm test -- tests/integration --coverage`
- **Coverage Requirements**: 70% minimum (enforced)
- **Artifacts**: Coverage reports uploaded to Codecov
- **Duration**: 5-8 minutes

#### Job 3: E2E Tests
- **Prerequisites**: Lint must pass
- **Services**: PostgreSQL 15
- **Setup**:
  - Install Playwright browsers: `npx playwright install --with-deps`
  - Build app: `npm run build`
- **Test Command**: `npm run test:e2e`
- **Artifacts**: Playwright HTML reports on failure
- **Duration**: 8-12 minutes
- **Browsers Tested**: Chrome, Firefox, Safari
- **Viewports**: Desktop (1920x1080), Mobile (Pixel 5, iPhone 12)

#### Job 4: Build Application
- **Prerequisites**: Lint + Tests must pass
- **Build Command**: `npm run build`
- **Output**: `.next/` directory (Next.js optimized build)
- **Environment**: `NEXTAUTH_SECRET` from GitHub Secrets
- **Artifacts**: Build uploaded for deployment
- **Duration**: 4-6 minutes
- **What's Checked**:
  - TypeScript compilation
  - Code splitting optimization
  - Asset bundling
  - API route compilation

#### Job 5: Security Scanning
- **Purpose**: Detect vulnerabilities
- **Tools**: Snyk
- **Threshold**: HIGH severity or above fails build
- **Duration**: 2-3 minutes

#### Job 6: Deploy to Staging
- **Trigger**: Push to `develop` branch
- **Prerequisites**: Build succeeds
- **Deployment Tool**: Vercel
- **Environment Variables**:
  - `DATABASE_URL_STAGING`
  - `NEXTAUTH_SECRET_STAGING`
  - `OPENAI_API_KEY`
- **URL**: https://staging.pms.example.com
- **Duration**: 3-5 minutes

#### Job 7: Deploy to Production
- **Trigger**: Push to `main` branch (manual approval)
- **Prerequisites**: All tests pass
- **Environment**: `production` (requires approval)
- **Deployment Tool**: Vercel
- **Environment Variables**:
  - `DATABASE_URL_PRODUCTION`
  - `NEXTAUTH_SECRET_PRODUCTION`
  - `OPENAI_API_KEY`
- **Post-Deploy**: 
  - Creates GitHub Release
  - Sends Slack notification
- **Duration**: 5-8 minutes

#### Job 8: Performance Testing
- **Trigger**: Pull requests only
- **Tool**: Lighthouse CI
- **Metrics**: FCP, LCP, CLS, Performance Score
- **Thresholds**: Configurable in `lighthouserc.json`
- **Duration**: 3-5 minutes

#### Job 9: Team Notification
- **Trigger**: Always (regardless of success/failure)
- **Channel**: Slack webhook
- **Reports**: Lint, Test, E2E, Build status

---

### 2. **Release & Versioning** (`.github/workflows/release.yml`)
**Purpose**: Automated semantic versioning and release management

**Triggers**: Push to `main` branch

**Process**:

1. **Version Detection**
   - Analyzes commit messages since last tag
   - Conventional Commits format:
     - `feat:` → Minor version bump
     - `fix:` → Patch version bump
     - `BREAKING CHANGE:` → Major version bump

2. **Update Version**
   - Updates `package.json` version
   - Commits changes
   - Creates Git tag

3. **Generate Changelog**
   - Extracts features, fixes, breaking changes
   - Creates GitHub Release with changelog
   - Formatted markdown with categorized commits

4. **Docker Build & Push**
   - Builds Docker image
   - Tags with version and `latest`
   - Pushes to GitHub Container Registry (GHCR)

5. **NPM Publication**
   - Publishes packages to NPM Registry
   - Only on tagged releases

**Example**:
```
Commits:  feat: add widget QR code → v1.2.0 (minor bump)
          fix: payment processing bug
          docs: update README

Result:   v1.1.0 → v1.2.0
Release:  GitHub Release with changelog
Docker:   ghcr.io/owner/pms:v1.2.0, :latest
NPM:      @ai-hotel/pms@1.2.0
```

---

### 3. **Database Migrations** (`.github/workflows/db-migration.yml`)
**Purpose**: Validate and apply database schema changes

**Triggers**: Changes to `prisma/schema.prisma`

**Jobs**:

#### Job 1: Validate & Generate
- Validates Prisma schema syntax
- Generates migration file if needed
- Tests migration on PostgreSQL 15
- Comments schema diff on PR

#### Job 2: Multi-Version Testing
- Tests migration on PostgreSQL 13, 14, 15
- Ensures backward compatibility
- Prevents version-specific issues

#### Job 3: Staging Migration
- Applies migration to staging database
- Only on `develop` or `main` pushes
- Notifies team via Slack

**Pre-Deployment Checks**:
```
✅ Schema validation
✅ Migration generation
✅ Test run on all DB versions
✅ Data integrity verification
```

---

### 4. **Security Scanning** (`.github/workflows/security.yml`)
**Purpose**: Comprehensive security and compliance checks

**Triggers**:
- Push to `main` or `develop`
- Pull requests
- Daily schedule (midnight UTC)

**Jobs**:

#### Job 1: Dependency Check
- Command: `npm audit`
- Level: Moderate or higher fails
- Reports: JSON artifact + PR comment
- Tools: npm built-in audit

#### Job 2: Code Scanning (SAST)
- ESLint security rules
- SonarQube analysis
- Detects: SQL injection, XSS, hardcoded secrets
- Reports: SARIF format for GitHub Security

#### Job 3: Container Scanning
- Scans Docker image with Trivy
- Severity: CRITICAL, HIGH
- Reports: SARIF to GitHub Security tab
- Detects: OS vulnerability, dependency vulnerabilities

#### Job 4: Secret Detection
- Gitleaks: Searches for exposed secrets
- TruffleHog: Detects secrets in commit history
- Prevents: API keys, credentials in repository

#### Job 5: Policy & Compliance
- Verifies LICENSE file exists
- Checks `.gitignore` completeness
- Enforces TypeScript strict mode
- Validates `.env.example` template

---

### 5. **Health Checks & Monitoring** (`.github/workflows/health-checks.yml`)
**Purpose**: Continuous monitoring of production and staging

**Triggers**:
- Every 15 minutes (scheduled)
- Manual trigger: `workflow_dispatch`

**Checks**:

#### Production Checks
- **API Health**: GET `/health` endpoint
- **Database**: `pg_isready` connection test
- **Redis**: `PING` command
- **SSL Certificates**: Expiration dates
- **Performance**: API response time (alert if >2s)
- **Uptime**: Monitor SLA (alert if <99.9%)
- **Error Rate**: CloudWatch metrics

#### Staging Checks
- **API**: Health endpoint
- **Smoke Tests**: Quick functional tests

#### Infrastructure
- **Dependency Freshness**: Outdated packages
- **Database Backups**: Verify latest + test restoration
- **Certificates**: Monitor all domains for expiration (alert at 30 days)
- **Logs**: Error patterns + security events

---

### 6. **Test Reports & Documentation** (`.github/workflows/reports.yml`)
**Purpose**: Generate and publish test reports, documentation, and metrics

**Triggers**:
- Pull requests
- Push to `main` or `develop`

**Jobs**:

#### Job 1: Test Reporting
- Runs tests with coverage
- Generates HTML coverage reports
- Uploads to Codecov
- Comments coverage on PR

#### Job 2: Documentation Generation
- **TypeDoc**: API documentation from TypeScript comments
- **OpenAPI**: Auto-generated from route handlers
- **Swagger UI**: Interactive API explorer
- Deployment: GitHub Pages or docs server

#### Job 3: Changelog Generation
- Auto-generates from commit messages
- Prepends to `CHANGELOG.md`
- Creates Git commit
- Only on `main` branch

#### Job 4: Performance Report
- Bundle size analysis
- Core Web Vitals (via Lighthouse CI)
- API response times
- Database query performance

#### Job 5: Dependency Audit
- NPM audit report
- Formatted as markdown
- Artifact for historical comparison

#### Job 6: Quality Gates
- **Code Coverage**: Minimum 80%
- **TypeScript**: No compilation errors
- **ESLint**: No critical violations
- **Bundle Size**: No significant increases

---

## Setting Up GitHub Secrets

Required secrets for full pipeline functionality:

```yaml
# Authentication
GITHUB_TOKEN: (auto-provided)
GITHUB_PAT: (Personal access token for releases)

# Deployment
VERCEL_TOKEN: (Vercel API token)
VERCEL_PROJECT_ID: (Vercel project ID)
VERCEL_ORG_ID: (Vercel organization ID)

# Databases
DATABASE_URL_STAGING: postgresql://user:pass@host/db_staging
DATABASE_URL_PRODUCTION: postgresql://user:pass@host/db_prod

# Authentication Secret
NEXTAUTH_SECRET_STAGING: (64+ char random string)
NEXTAUTH_SECRET_PRODUCTION: (64+ char random string)

# API Keys
OPENAI_API_KEY: (OpenAI API key)
SNYK_TOKEN: (Snyk security scanning)
SONAR_TOKEN: (SonarQube analysis)
GITLEAKS_LICENSE: (Gitleaks secret scanner)

# Monitoring
SLACK_WEBHOOK: (Slack webhook URL for notifications)
HEALTH_CHECK_TOKEN: (Bearer token for health check endpoint)

# Infrastructure
DB_HOST_PRODUCTION: (PostgreSQL host)
DB_USER: (PostgreSQL user)
REDIS_HOST_PRODUCTION: (Redis host)
BACKUP_BUCKET: (S3 bucket for backups)

# Docker Registry
DOCKER_REGISTRY_TOKEN: (Container registry token)
```

---

## Workflow Execution Timeline

### Example: Push to `main` branch

```
Time  | Event
------|--------------------------------------------
0:00  | Push to main
0:00  | Lint & Type Check starts
0:05  | ✅ Lint passes → Tests start
0:05  | Unit & Integration Tests starts
0:05  | E2E Tests starts (parallel)
0:15  | ✅ Tests pass → Build starts
0:15  | Security Scanning starts (parallel)
0:20  | ✅ Build succeeds
0:20  | ✅ Security passes
0:20  | Deploy to Production starts (with approval)
0:25  | ✅ Deployment complete
0:25  | Release job triggers
0:25  | ✅ Version bumped (if commits warrant)
0:25  | Docker image pushed to GHCR
0:25  | Slack notification sent
------|--------------------------------------------
Total: ~25 minutes for full pipeline
```

---

## Branch Strategy & Deployment

### Branch Protection Rules

**main**:
```
✅ Require PR reviews: 1 approval
✅ Require status checks: lint, test, build
✅ Dismiss stale PR approvals: Yes
✅ Restrict who can push: Admins only
✅ Require linear history: Yes
```

**develop**:
```
✅ Require PR reviews: 1 approval
✅ Require status checks: lint, test
✅ Require up-to-date branches: Yes
```

### Deployment Matrix

| Branch | Trigger | Environment | Approval | Duration |
|--------|---------|-------------|----------|----------|
| develop | Push | Staging | None | 20 min |
| main | Push | Production | Required | 25 min |
| hotfix/* | PR | None | N/A | Tests only |
| feature/* | PR | None | N/A | Tests only |

---

## Local Development Integration

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

npm run lint
npm run type-check
npm test -- tests/unit --bail
```

### Pre-push Hook
```bash
#!/bin/bash
# .git/hooks/pre-push

# Run full test suite before push
npm test
```

### Commands
```bash
npm run lint        # Run ESLint
npm run type-check  # TypeScript compiler
npm test            # Jest tests
npm run test:e2e    # Playwright tests
npm run build       # Production build
```

---

## Monitoring & Alerts

### Slack Notifications

Configured for:
- ✅ Successful deployments
- ❌ Failed tests/builds
- ⚠️ Security issues
- 📊 Health check results
- 🚀 New releases

### GitHub Security Tab

Monitors:
- Dependency vulnerabilities
- Code scanning alerts
- Secret scanning detections
- Container vulnerabilities

### Dashboard Access

- **Codecov**: Coverage trends
- **SonarQube**: Code quality metrics
- **Vercel**: Deployment history
- **Snyk**: Vulnerability tracking
- **Lighthouse**: Performance metrics

---

## Troubleshooting

### Common Issues

#### Tests Fail Locally but Pass in CI
```bash
# Ensure environment matches CI
export NODE_ENV=test
export DATABASE_URL=postgresql://test:test@localhost:5432/pms_test
npm test
```

#### Build Succeeds but Deploy Fails
- Check environment variables in GitHub Secrets
- Verify database migrations have been applied
- Check Vercel project settings

#### Security Scan Fails
- Run `npm audit fix` locally
- Verify no secrets in code
- Check for new vulnerability advisories

#### Database Migration Stuck
- Check migrations folder: `prisma/migrations/`
- Reset staging: `npm run db:reset` (staging only)
- Manual review of migration file

---

## Performance Optimization

### Parallel Job Execution
Currently optimized to run in parallel:
- Lint, Tests (unit/integration/E2E), Security → ~10 min
- Build (sequential after tests) → ~5 min
- Deploy (after build succeeds) → ~5 min

**Total**: ~20-25 minutes for full pipeline

### Caching Strategy
- **Node modules**: Cached per branch
- **Playwright browsers**: Cached
- **TypeScript compilation**: Incremental
- **Build artifacts**: Passed between jobs

### Resource Limits
- **Linux runner**: ubuntu-latest
- **Memory**: Standard GitHub Actions (7 GB)
- **Storage**: 14 GB available

---

## Best Practices

### Commit Message Format
```
feat(auth): add OAuth2 support
fix(payments): handle declined cards
docs: update API documentation
test: add payment integration tests
chore: update dependencies

BREAKING CHANGE: Removed legacy auth endpoint /login/v1
```

### PR Guidelines
- Title should match conventional commits
- Link related issues: `Closes #123`
- Describe changes in detail
- Request specific reviewers

### Release Process
1. Merge PRs to `main`
2. Await automatic versioning
3. GitHub Release created with changelog
4. Docker images published
5. Slack notification sent
6. Production deployment complete

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review failed CI runs
- Update npm packages: `npm update`
- Check security advisories

**Monthly**:
- Audit dependencies: `npm audit`
- Review coverage trends
- Optimize slow tests

**Quarterly**:
- Update GitHub Actions versions
- Review and update workflows
- Performance baseline analysis

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
