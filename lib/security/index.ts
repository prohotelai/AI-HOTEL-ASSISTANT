/**
 * Security Utilities Index
 * Central export point for all security services and utilities
 */

// Token and Cryptographic Utilities
export {
  generateToken,
  hashToken,
  generateTokenPair,
  getIPRange,
  generateFingerprint,
  verifyFingerprint,
  verifyIPRange,
  verifyUserAgent,
  detectTokenReuse,
  validateTokenFormat,
  generateChallenge,
  hashChallengeResponse,
  generateSessionId,
  type TokenPair,
  type TokenFingerprint,
  type SessionMetadata
} from './tokenUtils'

// Rate Limiting
export {
  checkRateLimit,
  checkRateLimitMultiple,
  resetRateLimit,
  getRateLimitStatus,
  cleanupRateLimitEntries,
  getRateLimitConfig,
  DEFAULT_RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitCheckResult
} from './rateLimiter'

// Brute Force Protection
export {
  recordFailedAttempt,
  checkBruteForceStatus,
  clearFailedAttempts,
  manuallyUnlock,
  getBruteForceHistory,
  getLockedIdentifiers,
  cleanupBruteForceRecords,
  DEFAULT_BRUTE_FORCE_CONFIG,
  type IdentifierType,
  type BruteForceCheckResult,
  type BruteForceConfig
} from './bruteForceProtection'

// Session Hijacking Prevention
export {
  detectSessionHijacking,
  compareIPGeolocation,
  detectImpossibleTravel,
  generateReauthChallenge,
  hasSuspiciousFlags,
  calculateSessionTrustScore,
  requiresReauthenticationByTrust,
  type HijackingDetectionResult
} from './sessionHijackingPrevention'

// QR Fraud Prevention
export {
  generateQRChallenge,
  verifyQRCodeExpiry,
  verifyRoomWithPMS,
  detectQRFraud,
  generateQRValue,
  validateQRStructure,
  checkQRReuse,
  generateVerificationRequirement,
  type QRFraudDetectionResult,
  type QRValidationContext
} from './qrFraudPrevention'
