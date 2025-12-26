/**
 * Session & Token Security Utilities
 * Handles token generation, hashing, fingerprinting, and validation
 */

import crypto from 'crypto'
import { createHash } from 'crypto'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessTokenHash: string
  refreshTokenHash: string
}

export interface TokenFingerprint {
  ipRange: string // First 3 octets of IP (e.g., "192.168.1")
  userAgent: string
  fingerprint: string // SHA-256 of IP + UA combination
}

export interface SessionMetadata {
  userAgent: string
  ipAddress: string
  deviceId?: string
}

/**
 * Generate a secure random token
 * @param length - Length in bytes (default: 32 = 64 hex chars)
 * @returns Hex-encoded random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash a token using SHA-256
 * @param token - The token to hash
 * @returns SHA-256 hash in hex format
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate access and refresh token pair
 * @returns Object with both tokens and their hashes
 */
export function generateTokenPair(): TokenPair {
  const accessToken = generateToken(32)  // 64 chars
  const refreshToken = generateToken(48) // 96 chars (longer for refresh)
  
  return {
    accessToken,
    refreshToken,
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken)
  }
}

/**
 * Extract IP range from full IP address
 * @param ipAddress - Full IP address (e.g., "192.168.1.42")
 * @returns First 3 octets (e.g., "192.168.1")
 */
export function getIPRange(ipAddress: string): string {
  const octets = ipAddress.split('.')
  if (octets.length !== 4) return ipAddress // Return full IP if not IPv4
  return octets.slice(0, 3).join('.')
}

/**
 * Generate device fingerprint from session metadata
 * @param metadata - User agent and IP address
 * @returns Fingerprint hash
 */
export function generateFingerprint(metadata: SessionMetadata): string {
  const ipRange = getIPRange(metadata.ipAddress)
  const fingerPrintString = `${ipRange}|${metadata.userAgent}|${metadata.deviceId || 'unknown'}`
  return createHash('sha256').update(fingerPrintString).digest('hex')
}

/**
 * Verify token fingerprint hasn't changed (detects session hijacking)
 * @param currentMetadata - Current request metadata
 * @param storedFingerprint - Previously stored fingerprint
 * @param strictMode - If true, require exact match; if false, allow IP range drift
 * @returns Object with verification result and any security flags
 */
export function verifyFingerprint(
  currentMetadata: SessionMetadata,
  storedFingerprint: string,
  strictMode: boolean = false
): {
  valid: boolean
  suspiciousFlags: string[]
} {
  const currentFingerprint = generateFingerprint(currentMetadata)
  const suspiciousFlags: string[] = []
  
  // Exact fingerprint match
  if (currentFingerprint === storedFingerprint) {
    return { valid: true, suspiciousFlags: [] }
  }
  
  // In non-strict mode, allow IP range and UA mismatches
  if (!strictMode) {
    const currentIPRange = getIPRange(currentMetadata.ipAddress)
    const storedParts = storedFingerprint.split('|')
    
    // For now, just flag it but don't fail
    suspiciousFlags.push('FINGERPRINT_MISMATCH')
    return { valid: true, suspiciousFlags }
  }
  
  // Strict mode: fingerprint mismatch = invalid
  suspiciousFlags.push('FINGERPRINT_MISMATCH_STRICT')
  return { valid: false, suspiciousFlags }
}

/**
 * Check if IP address is within acceptable range (same subnet)
 * @param currentIP - Current request IP
 * @param sessionIP - IP from session creation
 * @returns Object with validation result
 */
export function verifyIPRange(
  currentIP: string,
  sessionIP: string
): {
  valid: boolean
  suspicious: boolean
} {
  const currentRange = getIPRange(currentIP)
  const sessionRange = getIPRange(sessionIP)
  
  const valid = currentRange === sessionRange
  const suspicious = !valid // Different subnet = potentially suspicious
  
  return { valid, suspicious }
}

/**
 * Verify User-Agent hasn't changed dramatically
 * @param currentUA - Current request User-Agent
 * @param sessionUA - User-Agent from session creation
 * @returns Object with validation result
 */
export function verifyUserAgent(
  currentUA: string,
  sessionUA: string
): {
  valid: boolean
  suspicious: boolean
} {
  // Exact match
  if (currentUA === sessionUA) {
    return { valid: true, suspicious: false }
  }
  
  // Allow same browser with minor version drift (e.g., Firefox/120.0 -> Firefox/120.1)
  const parseUA = (ua: string) => {
    const match = ua.match(/([A-Za-z]+)\/(\d+)(?:\.(\d+))?/)
    if (!match) return { name: ua, major: ua, minor: '' }
    return { name: match[1], major: match[2], minor: match[3] || '' }
  }

  const current = parseUA(currentUA)
  const session = parseUA(sessionUA)

  const sameBrowser = current.name === session.name
  const sameMajor = current.major === session.major

  if (sameBrowser && sameMajor) {
    return { valid: true, suspicious: false }
  }

  return { valid: false, suspicious: true }
}

/**
 * Verify token hasn't been reused (potential attack detection)
 * @param previousTokenReuses - Count of previous reuses
 * @param threshold - How many reuses to allow before flagging (default: 0)
 * @returns Object with validation result
 */
export function detectTokenReuse(
  previousTokenReuses: number,
  threshold: number = 0
): {
  detected: boolean
  suspicious: boolean
} {
  const detected = previousTokenReuses > 0
  const suspicious = previousTokenReuses > threshold
  
  return { detected, suspicious }
}

/**
 * Validate token structure and format
 * @param token - Token to validate
 * @returns Object with validation result
 */
export function validateTokenFormat(token: string): {
  valid: boolean
  reason?: string
} {
  if (!token) {
    return { valid: false, reason: 'Token is empty' }
  }
  
  if (typeof token !== 'string') {
    return { valid: false, reason: 'Token is not a string' }
  }
  
  // Should be hex-encoded, so even length and valid hex
  if (token.length % 2 !== 0) {
    return { valid: false, reason: 'Token has odd length' }
  }
  
  if (!/^[0-9a-f]+$/i.test(token)) {
    return { valid: false, reason: 'Token contains invalid hex characters' }
  }
  
  return { valid: true }
}

/**
 * Generate a challenge token for additional verification
 * (Used in QR fraud prevention)
 * @param length - Length in bytes
 * @returns Random challenge token
 */
export function generateChallenge(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash a challenge response for verification
 * @param challenge - Original challenge
 * @param response - User's response
 * @returns Hash of challenge + response
 */
export function hashChallengeResponse(challenge: string, response: string): string {
  return createHash('sha256').update(`${challenge}${response}`).digest('hex')
}

/**
 * Generate a session ID (different from auth token)
 * Used for session tracking and lookup
 * @returns Session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID()
}
