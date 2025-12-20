/**
 * QR Fraud Prevention Service
 * Detects and prevents QR code-based login fraud
 */

import { createHash } from 'crypto'
import { SessionMetadata, generateChallenge } from '@/lib/security/tokenUtils'

export interface QRFraudDetectionResult {
  fraudDetected: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  flags: string[]
  blockLogin: boolean
  requiresAdditionalVerification: boolean
}

export interface QRValidationContext {
  roomId: string
  hotelId: string
  guestId?: string
  pmsGuestId?: string
  qrCodeValue: string
  qrGeneratedAt: Date
  generatedByIP?: string
  generatedByUA?: string
}

/**
 * Generate a QR fraud detection challenge
 * @returns Challenge token and metadata
 */
export function generateQRChallenge(): {
  challengeToken: string
  deviceChallenge: string
  timestamp: Date
} {
  return {
    challengeToken: generateChallenge(32),
    deviceChallenge: generateChallenge(16),
    timestamp: new Date()
  }
}

/**
 * Verify QR code hasn't expired
 * @param generatedAt - When the QR code was generated
 * @param maxAgeSeconds - Maximum age in seconds (default: 10 minutes)
 * @returns Validity result
 */
export function verifyQRCodeExpiry(
  generatedAt: Date,
  maxAgeSeconds: number = 600
): {
  valid: boolean
  ageSeconds: number
  message: string
} {
  const now = new Date()
  const ageSeconds = Math.floor((now.getTime() - generatedAt.getTime()) / 1000)
  
  if (ageSeconds > maxAgeSeconds) {
    return {
      valid: false,
      ageSeconds,
      message: `QR code expired (age: ${ageSeconds}s, max: ${maxAgeSeconds}s)`
    }
  }
  
  return {
    valid: true,
    ageSeconds,
    message: `QR code valid (age: ${ageSeconds}s)`
  }
}

/**
 * Verify room ID matches PMS records
 * @param roomId - Room ID from QR/guest input
 * @param pmsGuestId - Guest ID from PMS
 * @param hotelId - Hotel ID
 * @returns Validity result
 */
export async function verifyRoomWithPMS(
  roomId: string,
  pmsGuestId: string,
  hotelId: string
): Promise<{
  valid: boolean
  message: string
  suspicious: boolean
}> {
  // This would call the PMS adapter to verify room ownership
  // For now, return a placeholder that indicates the need for PMS integration
  
  if (!roomId || !pmsGuestId || !hotelId) {
    return {
      valid: false,
      message: 'Missing required PMS verification fields',
      suspicious: true
    }
  }
  
  // TODO: Call PMS adapter
  // const pmsAdapter = getPMSAdapterForHotel(hotelId)
  // const isValidRoom = await pmsAdapter.verifyGuestInRoom(pmsGuestId, roomId)
  
  return {
    valid: true,
    message: 'Room verified with PMS (placeholder)',
    suspicious: false
  }
}

/**
 * Detect potential QR fraud
 * @param context - QR validation context
 * @param currentMetadata - Current request metadata
 * @returns Fraud detection result
 */
export function detectQRFraud(
  context: QRValidationContext,
  currentMetadata: SessionMetadata
): QRFraudDetectionResult {
  const flags: string[] = []
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  
  // Check QR code age
  const expiryCheck = verifyQRCodeExpiry(context.qrGeneratedAt, 600) // 10 minutes
  if (!expiryCheck.valid) {
    flags.push('QR_CODE_EXPIRED')
    severity = 'medium'
  } else if (expiryCheck.ageSeconds > 300) {
    // Over 5 minutes old (but not expired) = slightly suspicious
    flags.push('QR_CODE_OLD')
  }
  
  // Check if QR was generated from different IP
  if (context.generatedByIP && context.generatedByIP !== currentMetadata.ipAddress) {
    flags.push('QR_GENERATED_FROM_DIFFERENT_IP')
    severity = 'medium'
  }
  
  // Check if QR was generated from different device
  if (context.generatedByUA && context.generatedByUA !== currentMetadata.userAgent) {
    flags.push('QR_GENERATED_FROM_DIFFERENT_DEVICE')
    if (severity === 'low') severity = 'medium'
  }
  
  // Check if room ID seems valid (basic pattern check)
  if (!isValidRoomID(context.roomId)) {
    flags.push('INVALID_ROOM_ID_FORMAT')
    severity = 'high'
  }
  
  // Check if QR code value seems tampered with
  if (isQRCodeTampered(context.qrCodeValue)) {
    flags.push('QR_CODE_TAMPERED')
    severity = 'critical'
  }
  
  // Check if this is a known fraud pattern
  if (detectKnownFraudPattern(context)) {
    flags.push('KNOWN_FRAUD_PATTERN')
    if (severity !== 'critical') severity = 'high'
  }
  
  const blockLogin = severity === 'critical' || severity === 'high'
  const requiresAdditionalVerification = severity === 'medium' || severity === 'high'
  
  return {
    fraudDetected: severity !== 'low',
    severity,
    flags,
    blockLogin,
    requiresAdditionalVerification
  }
}

/**
 * Validate room ID format
 * @param roomId - Room ID to validate
 * @returns Whether format is valid
 */
function isValidRoomID(roomId: string): boolean {
  // Allow alphanumeric room IDs, typically 3-5 characters
  // Examples: "101", "102A", "1001", "SUITE1"
  return /^[A-Za-z0-9]{2,6}$/.test(roomId)
}

/**
 * Check if QR code appears to have been tampered with
 * @param qrCodeValue - QR code value/content
 * @returns Whether tampering is detected
 */
function isQRCodeTampered(qrCodeValue: string): boolean {
  // Check for signs of manipulation
  if (!qrCodeValue) return true
  
  // QR values should be relatively short and consistent format
  if (qrCodeValue.length > 500) return true
  
  // Check for URL injection patterns
  if (qrCodeValue.includes('javascript:') || qrCodeValue.includes('data:')) {
    return true
  }
  
  return false
}

/**
 * Detect known fraud patterns
 * @param context - QR validation context
 * @returns Whether known pattern matches
 */
function detectKnownFraudPattern(context: QRValidationContext): boolean {
  // Pattern 1: Same QR code used multiple times in rapid succession
  // (This would be checked against recent QR validations)
  
  // Pattern 2: QR code from one device, validation from completely different device
  // (Already checked above)
  
  // Pattern 3: Multiple validation attempts with same QR but different room IDs
  // (This would require tracking QR usage)
  
  // For now, return false - in production these would query audit logs
  return false
}

/**
 * Generate QR value (encoded room/guest info)
 * @param roomId - Room ID
 * @param guestId - Guest ID
 * @param hotelId - Hotel ID
 * @param timestamp - Generation timestamp
 * @returns QR code value
 */
export function generateQRValue(
  roomId: string,
  guestId: string,
  hotelId: string,
  timestamp: Date
): string {
  // Create deterministic QR value
  const qrContent = `${hotelId}:${roomId}:${guestId}:${timestamp.getTime()}`
  const hash = createHash('sha256').update(qrContent).digest('hex')
  
  // Return URL-safe format
  return `QR:${hotelId}:${roomId}:${hash.substring(0, 16)}`
}

/**
 * Validate QR code structure
 * @param qrValue - QR code value to validate
 * @returns Validation result
 */
export function validateQRStructure(qrValue: string): {
  valid: boolean
  hotelId?: string
  roomId?: string
  message: string
} {
  const parts = qrValue.split(':')
  
  if (parts.length !== 4 || parts[0] !== 'QR') {
    return {
      valid: false,
      message: 'Invalid QR code format'
    }
  }
  
  const [_, hotelId, roomId, hash] = parts
  
  if (!hotelId || !roomId) {
    return {
      valid: false,
      message: 'Missing required QR code fields'
    }
  }
  
  if (hash.length !== 16) {
    return {
      valid: false,
      message: 'Invalid QR code hash'
    }
  }
  
  return {
    valid: true,
    hotelId,
    roomId,
    message: 'QR code structure valid'
  }
}

/**
 * Check for QR reuse (same QR code used multiple times)
 * @param qrValue - QR code value
 * @param maxUsesAllowed - Maximum allowed uses (default: 1)
 * @returns Whether reuse is detected
 */
export async function checkQRReuse(
  qrValue: string,
  maxUsesAllowed: number = 1
): Promise<{
  reuseDetected: boolean
  previousUseCount: number
  message: string
}> {
  // This would query AuditLog for previous uses of this QR code
  // For now, placeholder
  
  return {
    reuseDetected: false,
    previousUseCount: 0,
    message: 'QR code use tracking requires AuditLog integration'
  }
}

/**
 * Generate additional verification requirement
 * @param fraudDetectionResult - Result from fraud detection
 * @returns Verification requirement
 */
export function generateVerificationRequirement(
  fraudDetectionResult: QRFraudDetectionResult
): {
  required: boolean
  type: 'email_verification' | 'sms_verification' | 'security_questions' | 'device_recognition'
  message: string
} {
  if (!fraudDetectionResult.requiresAdditionalVerification) {
    return {
      required: false,
      type: 'email_verification',
      message: 'No additional verification needed'
    }
  }
  
  // Choose verification type based on fraud flags
  if (fraudDetectionResult.flags.includes('UNKNOWN_DEVICE')) {
    return {
      required: true,
      type: 'device_recognition',
      message: 'Please confirm this device'
    }
  }
  
  if (fraudDetectionResult.flags.includes('IP_MISMATCH')) {
    return {
      required: true,
      type: 'email_verification',
      message: 'Verify login from new location'
    }
  }
  
  return {
    required: true,
    type: 'email_verification',
    message: 'Please verify your identity'
  }
}
