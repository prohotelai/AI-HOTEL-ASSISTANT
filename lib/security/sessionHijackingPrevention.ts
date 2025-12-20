/**
 * Session Hijacking Prevention Service
 * Detects and prevents session hijacking through device/IP/UA tracking
 */

import { SessionMetadata, verifyIPRange, verifyUserAgent } from '@/lib/security/tokenUtils'

export interface HijackingDetectionResult {
  suspicious: boolean
  severity: 'low' | 'medium' | 'high'
  flags: string[]
  requiresReauth: boolean
  recommendation: string
}

/**
 * Detect potential session hijacking based on request metadata
 * @param currentMetadata - Current request metadata
 * @param sessionMetadata - Stored session metadata
 * @returns Detection result
 */
export function detectSessionHijacking(
  currentMetadata: SessionMetadata,
  sessionMetadata: SessionMetadata
): HijackingDetectionResult {
  const flags: string[] = []
  let severity: 'low' | 'medium' | 'high' = 'low'
  
  // Check IP range
  const ipVerification = verifyIPRange(currentMetadata.ipAddress, sessionMetadata.ipAddress)
  if (ipVerification.suspicious) {
    flags.push('DIFFERENT_IP_RANGE')
    severity = 'medium'
  }
  
  // Check User-Agent
  const uaVerification = verifyUserAgent(currentMetadata.userAgent, sessionMetadata.userAgent)
  if (uaVerification.suspicious) {
    flags.push('DIFFERENT_USER_AGENT')
    if (severity === 'low') severity = 'medium'
  }
  
  // Check if both IP and UA changed (more suspicious)
  if (ipVerification.suspicious && uaVerification.suspicious) {
    severity = 'high'
  }
  
  // Very different User-Agent strings might indicate mobile vs desktop switch
  const isDeviceTypeSwitch = detectDeviceTypeSwitch(sessionMetadata.userAgent, currentMetadata.userAgent)
  if (isDeviceTypeSwitch) {
    flags.push('DEVICE_TYPE_CHANGE')
    // Device type changes are less suspicious but should still be noted
    if (severity === 'low') severity = 'medium'
  }
  
  // Determine if re-authentication should be required
  const requiresReauth = severity === 'high'
  
  const suspicious = severity !== 'low'
  const recommendation = getHijackingRecommendation(severity, flags)
  
  return {
    suspicious,
    severity,
    flags,
    requiresReauth,
    recommendation
  }
}

/**
 * Detect if device type changed (mobile <-> desktop)
 * @param oldUA - Previous User-Agent
 * @param newUA - Current User-Agent
 * @returns true if device type switched
 */
function detectDeviceTypeSwitch(oldUA: string, newUA: string): boolean {
  const mobilePatterns = /mobile|android|iphone|ipad|windows phone/i
  const desktopPatterns = /windows|linux|macintosh/i
  
  const oldIsMobile = mobilePatterns.test(oldUA)
  const newIsMobile = mobilePatterns.test(newUA)
  
  const oldIsDesktop = desktopPatterns.test(oldUA)
  const newIsDesktop = desktopPatterns.test(newUA)
  
  // Check if it switched from mobile to desktop or vice versa
  return (oldIsMobile && newIsDesktop) || (oldIsDesktop && newIsMobile)
}

/**
 * Get recommendation based on hijacking severity
 * @param severity - Detection severity
 * @param flags - Detection flags
 * @returns Recommendation message
 */
function getHijackingRecommendation(
  severity: 'low' | 'medium' | 'high',
  flags: string[]
): string {
  switch (severity) {
    case 'high':
      return 'REQUIRE RE-AUTHENTICATION. Significant device/IP/UA changes detected.'
    case 'medium':
      return 'REQUEST RE-AUTHENTICATION. Device characteristics have changed.'
    case 'low':
    default:
      return 'ALLOW WITH MONITORING. Request appears legitimate.'
  }
}

/**
 * Compare geolocation based on IP (simplified)
 * In production, use a GeoIP service for accurate location detection
 * @param oldIP - Previous IP address
 * @param newIP - Current IP address
 * @returns Object with comparison result
 */
export function compareIPGeolocation(oldIP: string, newIP: string): {
  isInSameRange: boolean
  distanceIndicator: 'same' | 'nearby' | 'different' | 'very_different'
} {
  const getIPRangePrefix = (ip: string) => ip.split('.').slice(0, 2).join('.')
  
  const oldPrefix = getIPRangePrefix(oldIP)
  const newPrefix = getIPRangePrefix(newIP)
  
  // Same /16 network
  if (oldPrefix === newPrefix) {
    return {
      isInSameRange: true,
      distanceIndicator: 'same'
    }
  }
  
  // Different /16 but potentially nearby ISP
  return {
    isInSameRange: false,
    distanceIndicator: 'different'
  }
}

/**
 * Check for rapid location changes (impossible travel)
 * @param lastIP - Last known IP
 * @param currentIP - Current IP
 * @param timeSinceLastActivitySeconds - Seconds since last activity
 * @returns Whether rapid travel is suspected
 */
export function detectImpossibleTravel(
  lastIP: string,
  currentIP: string,
  timeSinceLastActivitySeconds: number
): {
  suspicious: boolean
  message: string
} {
  // Very simplified - in production use actual GeoIP
  const geolocation = compareIPGeolocation(lastIP, currentIP)
  
  if (geolocation.isInSameRange) {
    return {
      suspicious: false,
      message: 'Same IP range - no impossible travel detected'
    }
  }
  
  // If different IP and very little time passed, could be suspicious
  // But be lenient - could just be network change (WiFi to mobile)
  if (timeSinceLastActivitySeconds < 300 && timeSinceLastActivitySeconds > 0) {
    return {
      suspicious: true,
      message: 'POSSIBLE IMPOSSIBLE TRAVEL: Different network in very short time'
    }
  }
  
  return {
    suspicious: false,
    message: 'IP changed but sufficient time elapsed'
  }
}

/**
 * Generate re-authentication challenge
 * Used when suspicious activity is detected
 * @returns Challenge token and message
 */
export function generateReauthChallenge(): {
  challenge: string
  message: string
  type: 'email_verification' | 'security_questions' | 'device_confirmation'
} {
  const now = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const challenge = `${now}${random}`
  
  return {
    challenge,
    message: 'Suspicious activity detected. Please verify your identity.',
    type: 'email_verification'
  }
}

/**
 * Check if session has suspicious activity flags
 * @param suspiciousFlags - Array of suspicious flags from session
 * @returns Whether session should be treated with suspicion
 */
export function hasSuspiciousFlags(suspiciousFlags: (string | null)[] | null): boolean {
  if (!suspiciousFlags || !Array.isArray(suspiciousFlags)) {
    return false
  }
  
  const criticalFlags = ['IMPOSSIBLE_TRAVEL', 'TOKEN_REUSE_DETECTED', 'FINGERPRINT_MISMATCH_STRICT']
  return suspiciousFlags.some(flag => criticalFlags.includes(flag as string))
}

/**
 * Score session trustworthiness (0-100)
 * Lower score = less trustworthy = more security measures needed
 * @param metadata - Current request metadata
 * @param sessionMetadata - Stored session metadata
 * @param suspiciousFlags - Previously detected suspicious flags
 * @returns Trust score
 */
export function calculateSessionTrustScore(
  metadata: SessionMetadata,
  sessionMetadata: SessionMetadata,
  suspiciousFlags: (string | null)[] | null = null
): number {
  let score = 100
  
  // IP check
  const ipCheck = verifyIPRange(metadata.ipAddress, sessionMetadata.ipAddress)
  if (!ipCheck.valid) score -= 20
  
  // User-Agent check
  const uaCheck = verifyUserAgent(metadata.userAgent, sessionMetadata.userAgent)
  if (!uaCheck.valid) score -= 15
  
  // Device type change
  const deviceSwitch = detectDeviceTypeSwitch(sessionMetadata.userAgent, metadata.userAgent)
  if (deviceSwitch) score -= 10
  
  // Existing suspicious flags
  if (suspiciousFlags && suspiciousFlags.length > 0) {
    score -= Math.min(20, suspiciousFlags.length * 5)
  }
  
  // Ensure score doesn't go below 0
  return Math.max(0, score)
}

/**
 * Determine required re-authentication based on trust score
 * @param trustScore - Session trust score (0-100)
 * @returns Whether re-authentication is required
 */
export function requiresReauthenticationByTrust(trustScore: number): boolean {
  return trustScore < 50
}
