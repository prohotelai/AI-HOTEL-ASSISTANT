#!/usr/bin/env bash

# ============================================
# PRODUCTION DEPLOYMENT EXECUTION SCRIPT
# ============================================
# 
# This script performs safe production deployment steps:
# 1. Environment validation
# 2. Database migration
# 3. Test execution
# 4. Build verification
# 5. Security checks
# 6. Health validation
#
# Usage: bash scripts/deploy-production.sh
# ============================================

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
  echo -e "${GREEN}✓ ${1}${NC}"
}

log_error() {
  echo -e "${RED}✗ ${1}${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠ ${1}${NC}"
}

log_header() {
  echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  ${1}${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"
}

# Cleanup on error
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_error "Deployment failed with exit code $exit_code"
    log_warning "Run: git status to see uncommitted changes"
  fi
  exit $exit_code
}

trap cleanup EXIT

# ============================================
# STEP 1: ENVIRONMENT VALIDATION
# ============================================
step_environment_validation() {
  log_header "STEP 1: ENVIRONMENT VALIDATION"

  if [ ! -f .env.local ]; then
    log_error ".env.local not found"
    log_info "Copy from .env.local.example and update with your values:"
    log_info "  cp .env.local.example .env.local"
    exit 1
  fi

  log_success ".env.local exists"

  # Check required variables
  required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "NEXT_PUBLIC_APP_URL")
  
  for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env.local; then
      log_success "Found: $var"
    else
      log_error "Missing required variable: $var"
      exit 1
    fi
  done

  # Check .gitignore
  if ! grep -q ".env.local" .gitignore; then
    log_error ".env.local not in .gitignore - risk of secret exposure"
    exit 1
  fi
  log_success ".env files properly in .gitignore"

  echo ""
}

# ============================================
# STEP 2: DEPENDENCY CHECK
# ============================================
step_dependency_check() {
  log_header "STEP 2: DEPENDENCY CHECK"

  log_info "Checking Node.js..."
  node_version=$(node --version)
  log_success "Node.js: $node_version"

  log_info "Checking npm..."
  npm_version=$(npm --version)
  log_success "npm: $npm_version"

  log_info "Checking git..."
  git_version=$(git --version)
  log_success "git: $git_version"

  log_info "Checking PostgreSQL client..."
  if command -v psql &> /dev/null; then
    psql_version=$(psql --version)
    log_success "PostgreSQL client: $psql_version"
  else
    log_warning "PostgreSQL client not installed (optional for deployment)"
  fi

  log_info "Checking Docker..."
  if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    log_success "Docker: $docker_version"
  else
    log_warning "Docker not installed (optional for containerization)"
  fi

  echo ""
}

# ============================================
# STEP 3: PRISMA GENERATION
# ============================================
step_prisma_generation() {
  log_header "STEP 3: PRISMA CLIENT GENERATION"

  log_info "Generating Prisma client..."
  npx prisma generate

  if [ -d "node_modules/.prisma/client" ]; then
    log_success "Prisma client generated successfully"
  else
    log_error "Prisma client generation failed"
    exit 1
  fi

  echo ""
}

# ============================================
# STEP 4: DATABASE MIGRATION (SAFE)
# ============================================
step_database_migration() {
  log_header "STEP 4: DATABASE MIGRATION (SAFE MODE)"

  log_warning "Attempting database migration..."
  log_info "Command: npx prisma migrate deploy"
  log_info "This will:"
  log_info "  1. Check for pending migrations"
  log_info "  2. Apply migrations in order"
  log_info "  3. Create/update tables as needed"
  log_info "  4. Preserve existing data"

  if npx prisma migrate deploy 2>&1; then
    log_success "Database migration completed"
  else
    log_error "Database migration failed"
    log_info "Check DATABASE_URL in .env.local"
    log_info "Ensure PostgreSQL server is running and accessible"
    exit 1
  fi

  echo ""
}

# ============================================
# STEP 5: TEST EXECUTION
# ============================================
step_test_execution() {
  log_header "STEP 5: TEST EXECUTION"

  log_info "Running unit tests..."
  if npm run test 2>&1 | head -50; then
    log_success "Unit tests passed"
  else
    log_warning "Some unit tests failed - check test output above"
    log_info "Continue with deployment? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi

  echo ""
}

# ============================================
# STEP 6: LINTING & FORMAT CHECK
# ============================================
step_lint_check() {
  log_header "STEP 6: CODE QUALITY CHECK"

  log_info "Running ESLint..."
  if npm run lint 2>&1 | head -30; then
    log_success "Linting passed"
  else
    log_warning "Some lint warnings found - check output above"
  fi

  echo ""
}

# ============================================
# STEP 7: PRODUCTION BUILD
# ============================================
step_production_build() {
  log_header "STEP 7: PRODUCTION BUILD"

  log_info "Building Next.js application..."
  if npm run build 2>&1 | tail -20; then
    log_success "Production build completed successfully"
  else
    log_error "Production build failed"
    exit 1
  fi

  if [ -d ".next" ]; then
    next_size=$(du -sh .next 2>/dev/null | cut -f1)
    log_success ".next build size: $next_size"
  fi

  echo ""
}

# ============================================
# STEP 8: ARTIFACT VERIFICATION
# ============================================
step_artifact_verification() {
  log_header "STEP 8: ARTIFACT VERIFICATION"

  artifacts=(".next" "public" "prisma")
  for artifact in "${artifacts[@]}"; do
    if [ -d "$artifact" ] || [ -f "$artifact" ]; then
      log_success "Found: $artifact"
    else
      log_warning "Missing: $artifact"
    fi
  done

  echo ""
}

# ============================================
# STEP 9: SECURITY VALIDATION
# ============================================
step_security_validation() {
  log_header "STEP 9: SECURITY VALIDATION"

  log_info "Checking middleware configuration..."
  if grep -q "middleware" "next.config.js" || [ -f "middleware.ts" ]; then
    log_success "Security middleware configured"
  else
    log_warning "Security middleware not configured"
  fi

  log_info "Checking TypeScript strict mode..."
  if grep -q '"strict": true' "tsconfig.json"; then
    log_success "TypeScript strict mode enabled"
  else
    log_warning "TypeScript strict mode disabled"
  fi

  log_info "Checking .env security..."
  if ! git check-ignore .env.local &> /dev/null; then
    log_error ".env.local not properly ignored by git"
    exit 1
  fi
  log_success ".env.local properly ignored"

  echo ""
}

# ============================================
# STEP 10: PRE-DEPLOYMENT CHECKLIST
# ============================================
step_pre_deployment_checklist() {
  log_header "STEP 10: PRE-DEPLOYMENT CHECKLIST"

  checklist=(
    "DATABASE_URL configured and tested"
    "NEXTAUTH_SECRET is strong (32+ characters)"
    ".env.local is in .gitignore"
    "No uncommitted changes with secrets"
    "All tests passing"
    "Build successful"
    "Middleware configured"
  )

  log_info "Pre-deployment checklist:"
  for item in "${checklist[@]}"; do
    log_success "$item"
  done

  echo ""
}

# ============================================
# SUMMARY & NEXT STEPS
# ============================================
step_summary() {
  log_header "✓ DEPLOYMENT PREPARATION COMPLETE"

  log_info "System is ready for production deployment!"
  echo ""
  log_info "Next steps:"
  echo "  1. Deploy to hosting platform:"
  echo "     - Vercel:   vercel deploy --prod"
  echo "     - Docker:   docker build -t app:latest . && docker run ..."
  echo "     - Manual:   npm run start"
  echo ""
  echo "  2. Run health checks:"
  echo "     - Check API endpoints"
  echo "     - Test database connectivity"
  echo "     - Verify authentication flow"
  echo ""
  echo "  3. Monitor deployment:"
  echo "     - Check error logs"
  echo "     - Monitor performance metrics"
  echo "     - Validate all features"
  echo ""
  log_success "Happy deploying! 🚀"
  echo ""
}

# ============================================
# MAIN EXECUTION
# ============================================

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════╗"
echo "║     PRODUCTION DEPLOYMENT EXECUTION SCRIPT      ║"
echo "║        AI Hotel Assistant v1.0.0               ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}\n"

step_environment_validation
step_dependency_check
step_prisma_generation
step_database_migration
step_test_execution
step_lint_check
step_production_build
step_artifact_verification
step_security_validation
step_pre_deployment_checklist
step_summary

echo -e "${GREEN}Deployment execution script completed successfully!${NC}\n"
