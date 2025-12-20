# Session Management & Security Hardening

## Overview

This document outlines the comprehensive session management and security hardening system implemented for the Hotel Assistant SaaS platform. The system provides enterprise-grade authentication, session lifecycle management, token security, fraud prevention, and audit logging.

## Architecture

### Core Components

#### 1. **Session Lifecycle Engine** (`lib/services/session/sessionService.ts`)
Manages the complete session lifecycle from creation through invalidation.

**Key Functions:**
- `createSession()` - Create new session with JWT access token (10-min) and refresh token (30-day)
- `validateSession()` - Verify session validity, expiry, and device fingerprint
- `rotateSession()` - Rotate tokens using refresh token (prevents token leakage)
- `invalidateSession()` - Logout (mark inactive, revoke refresh tokens)
- `invalidateAllUserSessions()` - Force logout from all devices (password change)
- `cleanupExpiredSessions()` - Periodic cleanup (runs every 10 minutes)
- `getUserActiveSessions()` - List user's active sessions across devices
- `verifySessionOwnership()` - Confirm session belongs to user/hotel (multi-tenant)

**Token Strategy:**
- **Access Token**: Short-lived (10 minutes), stored in memory + httpOnly cookie
- **Refresh Token**: Long-lived (30 days), hashed in DB, stored in httpOnly cookie
- **Token Hashing**: All tokens hashed with SHA-256 before storage (protects against DB leaks)

#### 2. **Token Security** (`lib/security/tokenUtils.ts`)
Cryptographic utilities for token generation, hashing, and fingerprinting.

**Key Functions:**
- `generateToken()` - Secure random token generation (crypto.randomBytes)
- `hashToken()` - SHA-256 hashing (one-way, for storage)
- `generateTokenPair()` - Create access + refresh token pair
- `generateFingerprint()` - Device fingerprint (IP range + UA + device ID)
- `verifyFingerprint()` - Detect device changes (prevents hijacking)
- `verifyIPRange()` - Check IP hasn't changed dramatically
- `verifyUserAgent()` - Allow minor UA changes, block major ones
- `detectTokenReuse()` - Flag suspicious token reuse patterns
- `validateTokenFormat()` - Validate token structure/encoding
- `generateChallenge()` - For additional security challenges

#### 3. **Rate Limiting** (`lib/security/rateLimiter.ts`)
Prevents brute-force and DoS attacks through request throttling.

**Default Limits (Per-IP/User):**
- `/api/auth/login` - 5 attempts/minute
- `/api/qr/validate` - 3 attempts/minute
- `/api/qr/generate` - 10 attempts/minute
- `/api/auth/magic-link` - 5 attempts/minute
- `/api/auth/password-reset` - 3 attempts/minute
- `/api/widget` - 100 attempts/minute
- `/api/chat` - 30 attempts/minute

**Key Functions:**
- `checkRateLimit()` - Check single identifier against endpoint limit
- `checkRateLimitMultiple()` - Check multiple identifiers (most restrictive wins)
- `getRateLimitStatus()` - Get current usage for identifier
- `resetRateLimit()` - Reset counter (e.g., after successful auth)
- `cleanupRateLimitEntries()` - Remove old entries (storage cleanup)

#### 4. **Brute-Force Protection** (`lib/security/bruteForceProtection.ts`)
Detects and blocks repeated authentication failures.

**Configuration:**
- **Max Failed Attempts**: 5 (per identifier per endpoint)
- **Lockout Duration**: 10 minutes (temporary block)
- **Tracking Window**: 1 hour (reset counter after)

**Key Functions:**
- `recordFailedAttempt()` - Log failed attempt, auto-lock if limit exceeded
- `checkBruteForceStatus()` - Check if identifier is currently locked
- `clearFailedAttempts()` - Reset on successful authentication
- `manuallyUnlock()` - Admin operation to unlock
- `getLockedIdentifiers()` - Get all currently locked accounts/IPs
- `getBruteForceHistory()` - Detailed attempt history
- `cleanupBruteForceRecords()` - Remove old records (storage cleanup)

#### 5. **Session Hijacking Prevention** (`lib/security/sessionHijackingPrevention.ts`)
Detects and prevents unauthorized session access.

**Detection Methods:**
- **IP Range Verification**: Check same subnet (/24 for IPv4)
- **User-Agent Verification**: Detect major browser/OS changes
- **Device Type Change Detection**: Flag mobile ↔ desktop switches
- **Fingerprint Validation**: Full device signature comparison
- **Impossible Travel Detection**: Rapid location changes (simplified, needs GeoIP)
- **Trust Score**: Calculate 0-100 session trustworthiness

**Key Functions:**
- `detectSessionHijacking()` - Comprehensive hijacking detection
- `compareIPGeolocation()` - IP range comparison
- `detectImpossibleTravel()` - Rapid location changes
- `calculateSessionTrustScore()` - Trustworthiness scoring
- `requiresReauthenticationByTrust()` - Auto re-auth threshold

**Severity Levels:**
- **Low**: No issues, allow normal access
- **Medium**: Flag for monitoring, request re-auth
- **High**: Significant changes, force re-auth
- **Critical**: Extreme changes (e.g., desktop to mobile + IP change), terminate session

#### 6. **QR Fraud Prevention** (`lib/security/qrFraudPrevention.ts`)
Prevents QR-based login abuse and impersonation.

**Fraud Detection:**
- **QR Code Age**: Max 10 minutes (expires quickly)
- **Device Consistency**: QR generated from same device
- **IP Consistency**: QR generated from same IP
- **Room ID Validation**: Valid room format checking
- **Code Tampering**: Detect malformed QR codes
- **QR Reuse**: Track and limit QR code uses
- **Known Patterns**: Database of fraud signatures

**Key Functions:**
- `generateQRChallenge()` - Create verification challenge
- `verifyQRCodeExpiry()` - Check age/expiration
- `verifyRoomWithPMS()` - Validate room ownership in PMS
- `detectQRFraud()` - Comprehensive fraud detection
- `generateQRValue()` - Create encoded QR content
- `validateQRStructure()` - Check QR format validity
- `checkQRReuse()` - Prevent same QR multiple uses
- `generateVerificationRequirement()` - Determine additional checks needed

#### 7. **Audit Logging** (`lib/services/audit/auditLogger.ts`)
Complete logging of all security events for compliance and investigation.

**Event Types Logged:**
- `login` - Successful/failed login attempts
- `logout` - User logout
- `token_rotation` - Session token refresh
- `suspicious_activity` - Flagged suspicious behavior
- `brute_force_attempt` - Failed auth attempts
- `brute_force_lockout` - Account locked
- `fraud_detection` - Suspected fraud event
- `unauthorized_access` - Permission denied
- `admin_action` - Administrative operations
- `password_reset` - Password change
- `session_invalidated` - Session termination

**Severities:**
- `INFO` - Normal operations (login, logout)
- `WARNING` - Suspicious but allowed (rate limit, UA change)
- `ERROR` - Denied action (unauthorized access)
- `CRITICAL` - Major security event (fraud, brute force lockout)

**Key Functions:**
- `logAuditEvent()` - Generic event logging
- `logLogin/logLogout()` - Auth events
- `logSuspiciousActivity()` - Hijacking flags
- `logBruteForceAttempt/Lockout()` - Brute-force events
- `logFraudDetection()` - QR/session fraud
- `getUserAuditLogs()` - Query user's log history
- `getSessionAuditLogs()` - Query session's events
- `getCriticalSecurityEvents()` - Alert-level events
- `generateSecurityReport()` - Comprehensive security report
- `cleanupOldAuditLogs()` - Retention management (90 days default)

### Middleware & Integration

#### Backend Middleware (`middleware/backend/verifyAccessToken.ts`)

**Features:**
- JWT validation from Authorization header or cookie
- IP extraction (handles X-Forwarded-For, proxies)
- Session metadata injection into request context
- Role-based access control decorators

**Provided Decorators:**
- `@withAuth` - Require authentication
- `@withRole(role1, role2)` - Require specific roles
- `@withHotelBoundary` - Enforce hotel isolation

#### Frontend Middleware (`middleware.ts`)

**Features:**
- NextAuth token validation
- Role-based route protection
- Hotel boundary enforcement
- Suspicious activity detection
- Security header injection (CSP, X-Frame-Options, etc.)

**Protections:**
- CSRF prevention
- XSS protection (X-XSS-Protection header)
- Clickjacking prevention (X-Frame-Options)
- MIME sniffing prevention
- CORS enforcement

### Database Schema

#### Session Table
```sql
- id (UUID, PK)
- userId (FK → User, cascade delete)
- hotelId (FK → Hotel, cascade delete)
- role (VARCHAR, enum)
- tokenHash (VARCHAR, unique) -- SHA-256 of access token
- userAgent (TEXT)
- ipAddress (VARCHAR)
- ipRange (VARCHAR) -- First 3 octets
- deviceFingerprint (VARCHAR, SHA-256)
- createdAt (TIMESTAMP)
- expiresAt (TIMESTAMP) -- ~10 minutes
- lastActivity (TIMESTAMP)
- isActive (BOOLEAN)
- tokenReuses (INT) -- Reuse detection
- suspiciousFlags (JSONB) -- Array of detected issues
- Indexes: userId, hotelId, tokenHash (unique), expiresAt, isActive, ipAddress
```

#### RefreshToken Table
```sql
- id (UUID, PK)
- sessionId (FK → Session, cascade delete)
- tokenHash (VARCHAR, unique) -- SHA-256 of refresh token
- createdAt (TIMESTAMP)
- expiresAt (TIMESTAMP) -- ~30 days
- revokedAt (TIMESTAMP, nullable) -- Revocation tracking
- rotatedAt (TIMESTAMP, nullable) -- Last rotation time
- nextTokenHash (VARCHAR, nullable) -- Rotation chain
- Indexes: sessionId, tokenHash (unique), expiresAt, revokedAt
```

#### AuditLog Table
```sql
- id (UUID, PK)
- sessionId (FK → Session, nullable, set null on delete)
- userId (VARCHAR, not null)
- hotelId (VARCHAR, FK, not null)
- eventType (VARCHAR, enum)
- action (TEXT)
- resourceType (VARCHAR, enum, nullable)
- resourceId (VARCHAR, nullable)
- userAgent (TEXT, nullable)
- ipAddress (VARCHAR, nullable)
- success (BOOLEAN)
- errorMessage (TEXT, nullable)
- severity (VARCHAR, enum)
- createdAt (TIMESTAMP)
- Indexes: userId, hotelId, sessionId, eventType, severity, createdAt, ipAddress
```

#### RateLimitEntry Table
```sql
- id (UUID, PK)
- identifier (VARCHAR) -- IP, user ID, or email
- endpoint (VARCHAR)
- attempts (INT)
- lastAttempt (TIMESTAMP)
- resetAt (TIMESTAMP)
- Unique: (identifier, endpoint)
- Indexes: identifier, endpoint, resetAt
```

#### BruteForceAttempt Table
```sql
- id (UUID, PK)
- identifier (VARCHAR) -- IP or email
- identifierType (VARCHAR) -- 'ip' | 'email' | 'user_id'
- failedAttempts (INT)
- lastAttempt (TIMESTAMP)
- isLocked (BOOLEAN)
- lockedUntil (TIMESTAMP, nullable)
- endpoint (VARCHAR)
- Unique: (identifier, identifierType)
- Indexes: identifier, isLocked, lockedUntil
```

## Implementation Guide

### 1. Setup & Initialization

```typescript
// 1. Run database migration
npx prisma migrate dev --name add_session_security_models

// 2. Update .env.local with configuration
SESSION_TIMEOUT=600000 // 10 minutes
REFRESH_TOKEN_TIMEOUT=2592000000 // 30 days
SUSPICIOUS_FLAGS_THRESHOLD=2 // Number of flags to require re-auth
```

### 2. Login Flow

```typescript
import { createSession } from '@/lib/services/session/sessionService'
import { recordFailedAttempt, clearFailedAttempts } from '@/lib/security/bruteForceProtection'
import { logLogin } from '@/lib/services/audit/auditLogger'

async function handleLogin(email: string, password: string, req: Request) {
  const ipAddress = getIPFromRequest(req)
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  // Check brute-force status
  const bruteForceStatus = await checkBruteForceStatus(ipAddress, 'ip')
  if (!bruteForceStatus.allowed) {
    await logLogin(userId, hotelId, ipAddress, userAgent, false, 'Account locked - brute force')
    return { error: 'Too many failed attempts. Try again in 10 minutes.' }
  }
  
  // Check rate limit
  const rateLimitStatus = await checkRateLimit(ipAddress, '/api/auth/login')
  if (!rateLimitStatus.allowed) {
    await logLogin(userId, hotelId, ipAddress, userAgent, false, 'Rate limited')
    return { error: 'Too many login attempts. Please wait.' }
  }
  
  // Verify credentials
  const user = await authenticateUser(email, password)
  if (!user) {
    await recordFailedAttempt(ipAddress, 'ip', '/api/auth/login')
    await logLogin(email, hotelId, ipAddress, userAgent, false, 'Invalid credentials')
    return { error: 'Invalid email or password' }
  }
  
  // Create session
  const { sessionId, accessToken, refreshToken } = await createSession({
    userId: user.id,
    hotelId: user.hotelId,
    role: user.role,
    userAgent,
    ipAddress
  })
  
  // Clear failed attempts
  await clearFailedAttempts(ipAddress, 'ip')
  await logLogin(user.id, user.hotelId, ipAddress, userAgent, true)
  
  // Return tokens (set httpOnly cookies)
  return {
    accessToken,
    refreshToken,
    sessionId,
    user: { id: user.id, email: user.email, role: user.role }
  }
}
```

### 3. Protected Endpoints

```typescript
import { withAuth, withRole } from '@/middleware/backend/verifyAccessToken'
import { NextRequest, NextResponse } from 'next/server'

// Admin-only endpoint
export const GET = withAuth(async (req: NextRequest, context, auth) => {
  // auth.userId, auth.role, auth.hotelId are available
  
  if (!['ADMIN'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const data = await getUserData(auth.userId, auth.hotelId)
  return NextResponse.json(data)
})
```

### 4. Session Validation on Each Request

```typescript
// In API route handler
export const POST = withAuth(async (req: NextRequest, context, auth) => {
  // auth already validated the session
  // Check for suspicious flags
  if (auth.suspiciousFlags?.includes('TOKEN_REUSE_DETECTED')) {
    // Consider requiring re-authentication
  }
  
  // Process request with auth context
  const result = await processUserRequest(auth.userId, await req.json())
  return NextResponse.json(result)
})
```

### 5. Token Rotation

```typescript
import { rotateSession } from '@/lib/services/session/sessionService'

// Called when refresh token is used
export const POST = async (req: NextRequest) => {
  const { refreshToken } = await req.json()
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const ipAddress = getIPFromRequest(req)
  
  try {
    const { newAccessToken, newRefreshToken } = await rotateSession(refreshToken, {
      userAgent,
      ipAddress
    })
    
    return NextResponse.json(
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      {
        headers: {
          'Set-Cookie': `accessToken=${newAccessToken}; HttpOnly; Secure; Path=/`
        }
      }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
  }
}
```

### 6. Logout

```typescript
import { invalidateSession } from '@/lib/services/session/sessionService'
import { logLogout } from '@/lib/services/audit/auditLogger'

export const POST = withAuth(async (req: NextRequest, context, auth) => {
  // Invalidate session
  await invalidateSession(auth.sessionId, 'User logout')
  
  // Log event
  await logLogout(auth.userId, auth.hotelId, auth.sessionId, getIPFromRequest(req))
  
  // Clear cookies
  const response = NextResponse.json({ success: true })
  response.cookies.delete('accessToken')
  response.cookies.delete('refreshToken')
  response.cookies.delete('sessionId')
  
  return response
})
```

### 7. Periodic Cleanup

```typescript
// Add to api/cron/cleanup endpoint (called every 10 minutes)
import { cleanupExpiredSessions } from '@/lib/services/session/sessionService'
import { cleanupRateLimitEntries } from '@/lib/security/rateLimiter'
import { cleanupBruteForceRecords } from '@/lib/security/bruteForceProtection'
import { cleanupOldAuditLogs } from '@/lib/services/audit/auditLogger'

export const POST = async (req: NextRequest) => {
  // Verify CRON_SECRET
  const secret = req.headers.get('x-api-key')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const results = await Promise.all([
    cleanupExpiredSessions(),
    cleanupRateLimitEntries(),
    cleanupBruteForceRecords(),
    cleanupOldAuditLogs(90)
  ])
  
  return NextResponse.json({
    message: 'Cleanup completed',
    results
  })
}
```

## Configuration

### Environment Variables

```env
# Session timeouts
SESSION_ACCESS_TOKEN_TIMEOUT=600000       # 10 minutes
SESSION_REFRESH_TOKEN_TIMEOUT=2592000000  # 30 days

# Security thresholds
SUSPICIOUS_FLAGS_THRESHOLD=2               # Flags requiring re-auth
BRUTE_FORCE_MAX_ATTEMPTS=5                 # Max failed attempts
BRUTE_FORCE_LOCKOUT_MS=600000              # 10 minutes

# Audit retention
AUDIT_LOG_RETENTION_DAYS=90

# Rate limiting (ms per window)
RATE_LIMIT_WINDOW_MS=60000                 # 1 minute
```

## Security Considerations

### Token Storage
- ✅ Access tokens: httpOnly cookies (not JavaScript accessible)
- ✅ Refresh tokens: httpOnly cookies (not JavaScript accessible)
- ✅ Tokens hashed before database storage
- ✅ CSRF tokens for state-changing operations

### Transport Security
- ✅ HTTPS required in production
- ✅ Secure flag on cookies (HTTPS only)
- ✅ SameSite=Strict on cookies

### Multi-Tenancy
- ✅ All queries filtered by hotelId
- ✅ Session verification includes hotelId check
- ✅ Audit logs scoped to hotel
- ✅ No cross-hotel data access possible

### Session Hijacking
- ✅ Device fingerprinting (IP range + UA + device ID)
- ✅ IP range verification (same subnet check)
- ✅ Suspicious activity detection
- ✅ Automatic re-auth when trust score < 50

### Fraud Prevention
- ✅ QR code expiry (10 minutes)
- ✅ Room validation against PMS
- ✅ QR reuse detection
- ✅ Device consistency checks

## Monitoring & Alerts

### Critical Events to Monitor
1. Brute-force lockouts (CRITICAL)
2. Token reuse detected (CRITICAL)
3. Impossible travel detected (CRITICAL)
4. Multiple failed logins (WARNING)
5. Rate limit exceeded (WARNING)

### Generated Reports
```typescript
import { generateSecurityReport } from '@/lib/services/audit/auditLogger'

const report = await generateSecurityReport(hotelId, 7) // Last 7 days
console.log(report) // {
//   hotelId,
//   reportPeriodDays: 7,
//   metrics: {
//     totalLoginAttempts: 1250,
//     failedLoginAttempts: 45,
//     failedLoginPercentage: "3.6",
//     suspiciousActivities: 8,
//     bruteForceAttempts: 2,
//     fraudDetections: 0,
//     criticalEvents: 1
//   },
//   riskLevel: "LOW"
// }
```

## Testing

Comprehensive test suite included:
- ✅ Unit tests (100+): Token utilities, session service, rate limiting, brute-force
- ✅ Integration tests (40+): Token rotation, session invalidation, cleanup
- ✅ API tests (40+): Login, logout, QR, password reset, widget endpoints
- ✅ E2E tests (10+): Full session flows with Playwright

Run tests:
```bash
npm test                  # All tests
npm test -- --ui         # Interactive UI
npm test -- tokenUtils   # Specific file
```

## Troubleshooting

### Session Expired Too Early
- Check SESSION_ACCESS_TOKEN_TIMEOUT environment variable
- Verify backend timing is correct
- Check token validation logic

### Rate Limiting Not Working
- Verify RateLimitEntry table exists in database
- Check rate limit configuration in DEFAULT_RATE_LIMITS
- Verify IP extraction logic (X-Forwarded-For vs direct IP)

### Suspicious Activity False Positives
- Adjust SUSPICIOUS_FLAGS_THRESHOLD
- Review hijacking detection severity levels
- Check IP range tolerance

### Audit Logs Growing Too Fast
- Reduce log retention period
- Filter non-critical events
- Use indexes on frequent queries

## Future Enhancements

1. **GeoIP Integration**: Real impossible-travel detection
2. **Device Recognition**: Remember trusted devices
3. **Passwordless Auth**: FIDO2/WebAuthn integration
4. **Session Binding**: Tie sessions to specific hardware
5. **Risk Scoring**: ML-based anomaly detection
6. **MFA Integration**: Multi-factor authentication
7. **SSO Support**: Enterprise single sign-on
8. **Token Encryption**: Encrypt tokens at rest

---

**Version**: 1.0  
**Last Updated**: December 2025  
**Maintainer**: Security Team
