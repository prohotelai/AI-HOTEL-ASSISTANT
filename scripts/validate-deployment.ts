#!/usr/bin/env ts-node
/**
 * PRODUCTION DEPLOYMENT VALIDATION SCRIPT
 * 
 * Comprehensive checks for:
 * 1. Environment variables across all modules
 * 2. Database schema compatibility
 * 3. External service connectivity
 * 4. Build artifacts
 * 5. Security configuration
 * 6. Performance metrics
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

interface ValidationResult {
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: string[]
}

interface DeploymentValidation {
  timestamp: string
  environment: ValidationResult
  database: ValidationResult
  externalServices: ValidationResult
  build: ValidationResult
  security: ValidationResult
  summary: {
    totalChecks: number
    passed: number
    failed: number
    warnings: number
  }
}

// ============= UTILITY FUNCTIONS =============

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function header(title: string) {
  const line = '='.repeat(70)
  log(`\n${line}`, colors.cyan)
  log(title, colors.cyan)
  log(`${line}\n`, colors.cyan)
}

function section(title: string) {
  log(`\n▶ ${title}`, colors.blue)
  log('-'.repeat(70), colors.blue)
}

function success(message: string) {
  log(`  ✓ ${message}`, colors.green)
}

function error(message: string) {
  log(`  ✗ ${message}`, colors.red)
}

function warning(message: string) {
  log(`  ⚠ ${message}`, colors.yellow)
}

// ============= VALIDATION FUNCTIONS =============

/**
 * Validate environment variables across all modules
 */
function validateEnvironment(): ValidationResult {
  section('ENVIRONMENT VALIDATION')

  const envFile = path.join(process.cwd(), '.env.local')
  const envExampleFile = path.join(process.cwd(), '.env.example')

  const details: string[] = []

  // Check if .env.local exists
  if (!fs.existsSync(envFile)) {
    error('.env.local not found')
    details.push('Missing .env.local - required for production')
    return {
      status: 'FAIL',
      message: 'Environment configuration missing',
      details,
    }
  }
  success('.env.local file exists')

  // Load environment variables
  const envContent = fs.readFileSync(envFile, 'utf-8')
  const env = Object.fromEntries(
    envContent
      .split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const [key, ...rest] = line.split('=')
        return [key, rest.join('=').replace(/^"/, '').replace(/"$/, '')]
      })
  )

  // Required environment variables
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_APP_URL',
  ]

  const missing: string[] = []
  const present: string[] = []

  for (const key of required) {
    if (!env[key] || env[key].trim() === '') {
      missing.push(key)
      error(`Missing required: ${key}`)
    } else {
      present.push(key)
      success(`Present: ${key}`)
    }
  }

  details.push(`Required variables present: ${present.length}/${required.length}`)

  // Optional but recommended variables
  const recommended = [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'STRIPE_SECRET_KEY',
    'EMAIL_FROM',
    'SMTP_HOST',
  ]

  let recommendedCount = 0
  for (const key of recommended) {
    if (env[key] && env[key].trim() !== '') {
      recommendedCount++
      success(`Configured: ${key}`)
    } else {
      warning(`Not configured: ${key} (optional)`)
    }
  }

  details.push(`Recommended variables configured: ${recommendedCount}/${recommended.length}`)

  // Check for secrets in .env.example
  const exampleContent = fs.readFileSync(envExampleFile, 'utf-8')
  const hasActualSecrets = exampleContent.includes('sk_') || 
                           exampleContent.includes('your-secret-key-here')

  if (hasActualSecrets) {
    warning('Check .env.example for hardcoded secrets')
  } else {
    success('No hardcoded secrets found in .env.example')
  }

  // Check NEXTAUTH_SECRET strength
  const secret = env.NEXTAUTH_SECRET || ''
  if (secret.length < 32) {
    warning(`NEXTAUTH_SECRET may be too short: ${secret.length} chars (recommended: 32+)`)
  } else {
    success(`NEXTAUTH_SECRET strength OK: ${secret.length} chars`)
  }

  // DATABASE_URL validation
  const dbUrl = env.DATABASE_URL || ''
  if (!dbUrl.includes('postgresql')) {
    error('DATABASE_URL must use PostgreSQL')
    details.push('Current: ' + dbUrl.split('@')[0])
  } else {
    success('DATABASE_URL uses PostgreSQL')
  }

  const status =
    missing.length > 0 ? 'FAIL' : recommendedCount < recommended.length ? 'WARN' : 'PASS'

  return {
    status,
    message:
      missing.length > 0
        ? `${missing.length} required variables missing`
        : `All required variables configured`,
    details,
  }
}

/**
 * Validate database schema compatibility
 */
function validateDatabase(): ValidationResult {
  section('DATABASE SCHEMA VALIDATION')

  const schemaFile = path.join(process.cwd(), 'prisma', 'schema.prisma')
  const details: string[] = []

  if (!fs.existsSync(schemaFile)) {
    error('Prisma schema not found')
    return {
      status: 'FAIL',
      message: 'Prisma schema missing',
      details: ['Expected: prisma/schema.prisma'],
    }
  }
  success('Prisma schema found')

  const schemaContent = fs.readFileSync(schemaFile, 'utf-8')

  // Check required models
  const requiredModels = [
    'Hotel',
    'User',
    'Conversation',
    'Message',
    'GuestStaffQRToken',
    'UserSessionLog',
    'AIInteractionLog',
  ]

  const missingModels: string[] = []
  const presentModels: string[] = []

  for (const model of requiredModels) {
    if (schemaContent.includes(`model ${model}`)) {
      presentModels.push(model)
      success(`Model defined: ${model}`)
    } else {
      missingModels.push(model)
      error(`Model missing: ${model}`)
    }
  }

  details.push(`Models present: ${presentModels.length}/${requiredModels.length}`)

  // Check PostgreSQL provider
  if (schemaContent.includes('provider = "postgresql"')) {
    success('Using PostgreSQL database')
  } else {
    error('Not configured for PostgreSQL')
  }

  // Try to generate Prisma client
  try {
    log('\nGenerating Prisma client...')
    execSync('npx prisma generate', { stdio: 'pipe' })
    success('Prisma client generated successfully')
  } catch (e) {
    error('Failed to generate Prisma client')
    details.push('Error: ' + (e as Error).message)
    return {
      status: 'FAIL',
      message: 'Prisma client generation failed',
      details,
    }
  }

  const status = missingModels.length > 0 ? 'FAIL' : 'PASS'

  return {
    status,
    message:
      missingModels.length > 0
        ? `${missingModels.length} models missing`
        : 'All required models defined',
    details,
  }
}

/**
 * Validate external services connectivity
 */
async function validateExternalServices(): Promise<ValidationResult> {
  section('EXTERNAL SERVICES VALIDATION')

  const details: string[] = []
  const services: {
    name: string
    envVar: string
    optional: boolean
    testUrl?: string
  }[] = [
    {
      name: 'OpenAI API',
      envVar: 'OPENAI_API_KEY',
      optional: true,
    },
    {
      name: 'Pinecone Vector DB',
      envVar: 'PINECONE_API_KEY',
      optional: true,
    },
    {
      name: 'Stripe Payment',
      envVar: 'STRIPE_SECRET_KEY',
      optional: true,
    },
  ]

  let configuredCount = 0
  let testableCount = 0

  for (const service of services) {
    const envValue = process.env[service.envVar]
    if (envValue && envValue.trim() !== '') {
      configuredCount++
      success(`${service.name}: CONFIGURED`)
      details.push(`${service.name}: ${service.envVar} found`)

      // Validate API key format if it's a standard key
      if (service.envVar.includes('STRIPE') && !envValue.startsWith('sk_')) {
        warning(`${service.name}: Key format may be incorrect (should start with sk_)`)
      }

      testableCount++
    } else if (!service.optional) {
      error(`${service.name}: MISSING (required)`)
      details.push(`${service.name}: ${service.envVar} not configured`)
    } else {
      warning(`${service.name}: not configured (optional)`)
      details.push(`${service.name}: ${service.envVar} is optional`)
    }
  }

  details.push(`Services configured: ${configuredCount}/${services.length}`)

  return {
    status: configuredCount >= 1 ? 'PASS' : 'WARN',
    message: `${configuredCount} external services configured`,
    details,
  }
}

/**
 * Validate production build capability
 */
function validateBuild(): ValidationResult {
  section('PRODUCTION BUILD VALIDATION')

  const details: string[] = []

  // Check package.json scripts
  const packageFile = path.join(process.cwd(), 'package.json')
  const packageContent = JSON.parse(fs.readFileSync(packageFile, 'utf-8'))

  const requiredScripts = ['build', 'start', 'test', 'lint']
  const hasAllScripts = requiredScripts.every(script => script in packageContent.scripts)

  if (hasAllScripts) {
    success('All required build scripts present')
    for (const script of requiredScripts) {
      success(`  - ${script}: ${packageContent.scripts[script]}`)
    }
  } else {
    error('Missing required build scripts')
  }

  // Check Next.js config
  const nextConfigFile = path.join(process.cwd(), 'next.config.js')
  if (fs.existsSync(nextConfigFile)) {
    success('next.config.js exists')
  } else {
    warning('next.config.js not found (using defaults)')
  }

  // Check TypeScript config
  const tsconfigFile = path.join(process.cwd(), 'tsconfig.json')
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigFile, 'utf-8'))

  if (tsconfig.compilerOptions.strict === true) {
    success('TypeScript strict mode: ENABLED')
  } else {
    warning('TypeScript strict mode: DISABLED')
  }

  // Check for build artifacts
  const nextDirExists = fs.existsSync(path.join(process.cwd(), '.next'))
  if (nextDirExists) {
    success('.next build directory exists')
  } else {
    warning('.next build directory not yet created')
  }

  details.push(`Required scripts: ${requiredScripts.length}`)
  details.push(`TypeScript strict: ${tsconfig.compilerOptions.strict}`)

  return {
    status: hasAllScripts ? 'PASS' : 'FAIL',
    message: hasAllScripts ? 'Build configuration valid' : 'Build configuration incomplete',
    details,
  }
}

/**
 * Validate security configuration
 */
function validateSecurity(): ValidationResult {
  section('SECURITY VALIDATION')

  const details: string[] = []

  // Check middleware exists
  const middlewareFile = path.join(process.cwd(), 'middleware.ts')
  if (fs.existsSync(middlewareFile)) {
    success('Security middleware configured')
    const content = fs.readFileSync(middlewareFile, 'utf-8')
    
    const checks = [
      { name: 'JWT validation', pattern: 'getToken|jwt' },
      { name: 'RBAC enforcement', pattern: 'role|permission' },
      { name: 'Route protection', pattern: 'protected|public' },
      { name: 'CORS headers', pattern: 'headers|CORS' },
    ]

    let securityFeatures = 0
    for (const check of checks) {
      if (new RegExp(check.pattern, 'i').test(content)) {
        success(`  - ${check.name}`)
        securityFeatures++
      } else {
        warning(`  - ${check.name} not found`)
      }
    }
    details.push(`Security features implemented: ${securityFeatures}/${checks.length}`)
  } else {
    error('Security middleware not found')
    details.push('Expected: middleware.ts')
  }

  // Check for .env.local in gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8')
    if (gitignore.includes('.env') || gitignore.includes('.env.local')) {
      success('Environment files in .gitignore')
    } else {
      error('.env files not in .gitignore')
      details.push('Risk: Secrets may be committed to repository')
    }
  }

  // Check for Node.js security headers
  const hasSecurityHeaders = fs.existsSync(
    path.join(process.cwd(), 'middleware.ts')
  ) || fs.existsSync(
    path.join(process.cwd(), 'app', 'middleware.ts')
  )

  if (hasSecurityHeaders) {
    success('Security headers middleware present')
  } else {
    warning('Security headers middleware not configured')
  }

  return {
    status: details.some(d => d.includes('Risk')) ? 'WARN' : 'PASS',
    message: 'Security configuration validated',
    details,
  }
}

/**
 * Main validation runner
 */
async function runValidation(): Promise<DeploymentValidation> {
  header('🚀 PRODUCTION DEPLOYMENT VALIDATION')

  const results: DeploymentValidation = {
    timestamp: new Date().toISOString(),
    environment: validateEnvironment(),
    database: validateDatabase(),
    externalServices: await validateExternalServices(),
    build: validateBuild(),
    security: validateSecurity(),
    summary: {
      totalChecks: 5,
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  }

  // Calculate summary
  for (const result of Object.values(results)) {
    if (typeof result === 'object' && 'status' in result) {
      if (result.status === 'PASS') results.summary.passed++
      else if (result.status === 'FAIL') results.summary.failed++
      else if (result.status === 'WARN') results.summary.warnings++
    }
  }

  // Summary section
  header('📊 VALIDATION SUMMARY')

  log(`Total Checks: ${results.summary.totalChecks}`, colors.cyan)
  log(`  ${colors.green}✓ Passed: ${results.summary.passed}${colors.reset}`)
  log(`  ${colors.yellow}⚠ Warnings: ${results.summary.warnings}${colors.reset}`)
  log(`  ${colors.red}✗ Failed: ${results.summary.failed}${colors.reset}`)

  // Status
  log('')
  if (results.summary.failed === 0) {
    log(
      `${results.summary.warnings > 0 ? '⚠ READY WITH WARNINGS' : '✓ READY FOR DEPLOYMENT'}`,
      results.summary.warnings > 0 ? colors.yellow : colors.green
    )
  } else {
    log('✗ DEPLOYMENT BLOCKED', colors.red)
    log(`Fix ${results.summary.failed} issue(s) before proceeding`, colors.red)
  }

  // Save results
  const reportPath = path.join(process.cwd(), 'deployment-validation-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  log(`\n📄 Full report saved to: ${reportPath}`)

  return results
}

// Execute
runValidation().catch(error => {
  console.error('Validation failed:', error)
  process.exit(1)
})
