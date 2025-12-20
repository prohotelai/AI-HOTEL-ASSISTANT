/**
 * Token Utilities Unit Tests
 */

import { describe, it, expect } from 'vitest'
import {
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
  generateSessionId
} from '@/lib/security/tokenUtils'

describe('Token Utilities', () => {
  describe('generateToken', () => {
    it('should generate a random token', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      
      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
      expect(token1.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should generate token with custom length', () => {
      const token = generateToken(16)
      expect(token.length).toBe(32) // 16 bytes = 32 hex chars
    })
  })

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'test-token-12345'
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)
      
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      
      const hash1 = hashToken(token1)
      const hash2 = hashToken(token2)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should produce 64-character SHA-256 hex', () => {
      const hash = hashToken('anything')
      expect(hash.length).toBe(64)
      expect(/^[0-9a-f]{64}$/i.test(hash)).toBe(true)
    })
  })

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const pair = generateTokenPair()
      
      expect(pair.accessToken).toBeDefined()
      expect(pair.refreshToken).toBeDefined()
      expect(pair.accessTokenHash).toBeDefined()
      expect(pair.refreshTokenHash).toBeDefined()
    })

    it('should generate different token pairs', () => {
      const pair1 = generateTokenPair()
      const pair2 = generateTokenPair()
      
      expect(pair1.accessToken).not.toBe(pair2.accessToken)
      expect(pair1.refreshToken).not.toBe(pair2.refreshToken)
    })

    it('should hash tokens correctly', () => {
      const pair = generateTokenPair()
      
      expect(hashToken(pair.accessToken)).toBe(pair.accessTokenHash)
      expect(hashToken(pair.refreshToken)).toBe(pair.refreshTokenHash)
    })
  })

  describe('getIPRange', () => {
    it('should extract IP range from IPv4 address', () => {
      expect(getIPRange('192.168.1.42')).toBe('192.168.1')
      expect(getIPRange('10.0.0.1')).toBe('10.0.0')
      expect(getIPRange('172.16.254.1')).toBe('172.16.254')
    })

    it('should handle invalid IP addresses', () => {
      expect(getIPRange('invalid')).toBe('invalid')
      expect(getIPRange('192.168')).toBe('192.168')
    })
  })

  describe('generateFingerprint', () => {
    it('should generate a consistent fingerprint', () => {
      const metadata = {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      }
      
      const fp1 = generateFingerprint(metadata)
      const fp2 = generateFingerprint(metadata)
      
      expect(fp1).toBe(fp2)
    })

    it('should generate different fingerprints for different metadata', () => {
      const fp1 = generateFingerprint({
        userAgent: 'Firefox',
        ipAddress: '192.168.1.1'
      })
      
      const fp2 = generateFingerprint({
        userAgent: 'Chrome',
        ipAddress: '192.168.1.1'
      })
      
      expect(fp1).not.toBe(fp2)
    })
  })

  describe('verifyFingerprint', () => {
    it('should verify matching fingerprint', () => {
      const metadata = {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      }
      
      const fp = generateFingerprint(metadata)
      const result = verifyFingerprint(metadata, fp)
      
      expect(result.valid).toBe(true)
      expect(result.suspiciousFlags).toHaveLength(0)
    })

    it('should detect mismatched fingerprint in strict mode', () => {
      const metadata = {
        userAgent: 'Firefox',
        ipAddress: '192.168.1.1'
      }
      
      const fp = generateFingerprint({
        userAgent: 'Chrome',
        ipAddress: '192.168.1.1'
      })
      
      const result = verifyFingerprint(metadata, fp, true)
      
      expect(result.valid).toBe(false)
      expect(result.suspiciousFlags).toContain('FINGERPRINT_MISMATCH_STRICT')
    })
  })

  describe('verifyIPRange', () => {
    it('should verify same IP range', () => {
      const result = verifyIPRange('192.168.1.100', '192.168.1.50')
      
      expect(result.valid).toBe(true)
      expect(result.suspicious).toBe(false)
    })

    it('should detect different IP range', () => {
      const result = verifyIPRange('192.168.2.1', '192.168.1.1')
      
      expect(result.valid).toBe(false)
      expect(result.suspicious).toBe(true)
    })
  })

  describe('verifyUserAgent', () => {
    it('should verify exact User-Agent match', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      const result = verifyUserAgent(ua, ua)
      
      expect(result.valid).toBe(true)
      expect(result.suspicious).toBe(false)
    })

    it('should allow minor version changes', () => {
      const ua1 = 'Firefox/120.0'
      const ua2 = 'Firefox/120.1'
      
      const result = verifyUserAgent(ua1, ua2)
      
      expect(result.valid).toBe(true)
      expect(result.suspicious).toBe(false)
    })

    it('should detect major browser changes', () => {
      const ua1 = 'Firefox/120.0'
      const ua2 = 'Chrome/121.0'
      
      const result = verifyUserAgent(ua1, ua2)
      
      expect(result.valid).toBe(false)
      expect(result.suspicious).toBe(true)
    })
  })

  describe('detectTokenReuse', () => {
    it('should not flag zero reuses', () => {
      const result = detectTokenReuse(0)
      
      expect(result.detected).toBe(false)
      expect(result.suspicious).toBe(false)
    })

    it('should detect token reuse', () => {
      const result = detectTokenReuse(2)
      
      expect(result.detected).toBe(true)
      expect(result.suspicious).toBe(true)
    })
  })

  describe('validateTokenFormat', () => {
    it('should validate correct token format', () => {
      const token = generateToken()
      const result = validateTokenFormat(token)
      
      expect(result.valid).toBe(true)
    })

    it('should reject empty token', () => {
      const result = validateTokenFormat('')
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('empty')
    })

    it('should reject non-string token', () => {
      const result = validateTokenFormat(123 as any)
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not a string')
    })

    it('should reject invalid hex characters', () => {
      const result = validateTokenFormat('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('invalid hex')
    })
  })

  describe('generateChallenge', () => {
    it('should generate random challenges', () => {
      const ch1 = generateChallenge()
      const ch2 = generateChallenge()
      
      expect(ch1).not.toBe(ch2)
      expect(ch1.length).toBe(32) // 16 bytes = 32 hex
    })
  })

  describe('hashChallengeResponse', () => {
    it('should hash challenge response consistently', () => {
      const challenge = 'challenge123'
      const response = 'response456'
      
      const hash1 = hashChallengeResponse(challenge, response)
      const hash2 = hashChallengeResponse(challenge, response)
      
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashChallengeResponse('ch1', 'resp1')
      const hash2 = hashChallengeResponse('ch1', 'resp2')
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateSessionId', () => {
    it('should generate valid UUIDs', () => {
      const id = generateSessionId()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      expect(uuidRegex.test(id)).toBe(true)
    })

    it('should generate unique session IDs', () => {
      const id1 = generateSessionId()
      const id2 = generateSessionId()
      
      expect(id1).not.toBe(id2)
    })
  })
})
