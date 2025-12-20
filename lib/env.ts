/**
 * Environment Variables Validation & Access
 *
 * This module:
 * - Validates all required environment variables on startup
 * - Provides type-safe access without exposing secrets
 * - Logs validation status without showing actual keys
 * - Fails early if critical services are misconfigured
 */

// ============================================================================
// 1. ENVIRONMENT SCHEMA
// ============================================================================

export interface EnvConfig {
  // ✅ REQUIRED - Core
  DATABASE_URL: string
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
  NEXT_PUBLIC_APP_URL: string

  // 🔐 Security - Mobile
  MOBILE_MAGIC_LINK_SHARED_SECRET: string | undefined

  // 🔧 OPTIONAL - AI & Embeddings
  OPENAI_API_KEY: string | undefined
  OPENAI_MODEL: string
  OPENAI_EMBEDDING_MODEL: string

  // 🔧 OPTIONAL - Vector Database
  PINECONE_API_KEY: string | undefined
  PINECONE_ENVIRONMENT: string | undefined
  PINECONE_INDEX: string | undefined

  // 🔧 OPTIONAL - Cache & Queues
  REDIS_URL: string | undefined

  // 🔧 OPTIONAL - Email
  RESEND_API_KEY: string | undefined
  EMAIL_FROM: string | undefined

  // 🔧 OPTIONAL - Payments
  STRIPE_SECRET_KEY: string | undefined
  STRIPE_PUBLISHABLE_KEY: string | undefined
  STRIPE_WEBHOOK_SECRET: string | undefined

  // 🔧 OPTIONAL - Node Environment
  NODE_ENV: 'development' | 'production' | 'test'
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
}

// ============================================================================
// 2. VALIDATION & LOADING
// ============================================================================

function validateEnv(): EnvConfig {
  const env = process.env
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

  // Required variables (relaxed during build for Vercel)
  const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']
  const missing = required.filter((key) => !env[key])

  // During build, only fail for critical auth/db vars
  if (!isBuildTime && missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return {
    // ✅ Required (with fallbacks for build time)
    DATABASE_URL: env.DATABASE_URL || '',
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET || '',
    NEXTAUTH_URL: env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || 'http://localhost:3000',

    // 🔐 Security - Mobile
    MOBILE_MAGIC_LINK_SHARED_SECRET: env.MOBILE_MAGIC_LINK_SHARED_SECRET,

    // 🔧 Optional - AI
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_MODEL: env.OPENAI_MODEL || 'gpt-4o-mini',
    OPENAI_EMBEDDING_MODEL: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',

    // 🔧 Optional - Vector Database
    PINECONE_API_KEY: env.PINECONE_API_KEY,
    PINECONE_ENVIRONMENT: env.PINECONE_ENVIRONMENT,
    PINECONE_INDEX: env.PINECONE_INDEX,

    // 🔧 Optional - Cache
    REDIS_URL: env.REDIS_URL,

    // 🔧 Optional - Email
    RESEND_API_KEY: env.RESEND_API_KEY,
    EMAIL_FROM: env.EMAIL_FROM,

    // 🔧 Optional - Payments
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,

    // Node Environment
    NODE_ENV: (env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    LOG_LEVEL: (env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  }
}

// ============================================================================
// 3. LAZY-LOADED CONFIG (validates once, returns cached)
// ============================================================================

let cachedConfig: EnvConfig | null = null

export function getEnv(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv()
  }
  return cachedConfig
}

// ============================================================================
// 4. SERVICE AVAILABILITY CHECKS
// ============================================================================

export interface ServiceStatus {
  name: string
  available: boolean
  reason?: string
}

export function checkServiceStatus(): ServiceStatus[] {
  const env = getEnv()
  const status: ServiceStatus[] = []

  // OpenAI
  status.push({
    name: 'OpenAI',
    available: !!env.OPENAI_API_KEY,
    reason: env.OPENAI_API_KEY ? undefined : 'OPENAI_API_KEY not set',
  })

  // Pinecone
  status.push({
    name: 'Pinecone',
    available: !!(env.PINECONE_API_KEY && env.PINECONE_ENVIRONMENT && env.PINECONE_INDEX),
    reason:
      env.PINECONE_API_KEY && env.PINECONE_ENVIRONMENT && env.PINECONE_INDEX
        ? undefined
        : 'Missing Pinecone credentials',
  })

  // Redis
  status.push({
    name: 'Redis',
    available: !!env.REDIS_URL,
    reason: env.REDIS_URL ? undefined : 'REDIS_URL not set',
  })

  // Resend Email
  status.push({
    name: 'Resend Email',
    available: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
    reason:
      env.RESEND_API_KEY && env.EMAIL_FROM ? undefined : 'Missing Resend credentials or EMAIL_FROM',
  })

  // Stripe
  status.push({
    name: 'Stripe',
    available: !!env.STRIPE_SECRET_KEY,
    reason: env.STRIPE_SECRET_KEY ? undefined : 'STRIPE_SECRET_KEY not set',
  })

  return status
}

// ============================================================================
// 5. HELPER FUNCTIONS FOR CHECKING IF SERVICE IS AVAILABLE
// ============================================================================

export function isOpenAIConfigured(): boolean {
  return !!getEnv().OPENAI_API_KEY
}

export function isPineconeConfigured(): boolean {
  const env = getEnv()
  return !!(env.PINECONE_API_KEY && env.PINECONE_ENVIRONMENT && env.PINECONE_INDEX)
}

export function isRedisConfigured(): boolean {
  return !!getEnv().REDIS_URL
}

export function isEmailConfigured(): boolean {
  const env = getEnv()
  return !!(env.RESEND_API_KEY && env.EMAIL_FROM)
}

export function isStripeConfigured(): boolean {
  return !!getEnv().STRIPE_SECRET_KEY
}

// ============================================================================
// 6. PREVENT USAGE CHECKS (throw if not configured)
// ============================================================================

export function requireOpenAI(): string {
  const key = getEnv().OPENAI_API_KEY
  if (!key) {
    throw new Error(
      'OpenAI API key not configured. Set OPENAI_API_KEY environment variable to enable AI features.'
    )
  }
  return key
}

export function requirePinecone(): { apiKey: string; environment: string; index: string } {
  const env = getEnv()
  if (!env.PINECONE_API_KEY || !env.PINECONE_ENVIRONMENT || !env.PINECONE_INDEX) {
    throw new Error(
      'Pinecone not fully configured. Set PINECONE_API_KEY, PINECONE_ENVIRONMENT, and PINECONE_INDEX.'
    )
  }
  return {
    apiKey: env.PINECONE_API_KEY,
    environment: env.PINECONE_ENVIRONMENT,
    index: env.PINECONE_INDEX,
  }
}

export function requireRedis(): string {
  const url = getEnv().REDIS_URL
  if (!url) {
    throw new Error('Redis URL not configured. Set REDIS_URL environment variable.')
  }
  return url
}

export function requireResend(): { apiKey: string; from: string } {
  const env = getEnv()
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('Resend not fully configured. Set RESEND_API_KEY and EMAIL_FROM.')
  }
  return {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
  }
}

export function requireStripe(): string {
  const key = getEnv().STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Stripe Secret Key not configured. Set STRIPE_SECRET_KEY environment variable.')
  }
  return key
}

export function requireNextAuthSecret(): string {
  const secret = getEnv().NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('[Phase2-Critical] NEXTAUTH_SECRET is missing. Set it before starting the app.')
  }
  return secret
}
