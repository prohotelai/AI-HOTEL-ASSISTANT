/**
 * QR Code Authentication Module for Widget SDK
 * Handles QR code scanning, validation, and JWT token management
 */

export type QRAuthConfig = {
  apiBaseUrl: string
  hotelId: string
  onSuccess?: (sessionData: QRSessionData) => void
  onError?: (error: QRAuthError) => void
  onScanning?: () => void
}

export type QRSessionData = {
  sessionJWT: string
  user: {
    id: string
    email: string
    name: string
    role: 'guest' | 'staff'
    hotelId: string
  }
  permissions: string[]
  expiresAt: number
}

export type QRAuthError = {
  code: string
  message: string
  details?: unknown
}

export type QRAuthState = 'idle' | 'scanning' | 'validating' | 'authenticated' | 'error'

/**
 * QR Authentication Controller
 * Manages QR code scanning and token validation
 */
export class QRAuthController {
  private config: QRAuthConfig
  private state: QRAuthState = 'idle'
  private sessionData: QRSessionData | null = null
  private videoStream: MediaStream | null = null
  private isScanning = false

  constructor(config: QRAuthConfig) {
    this.config = config
  }

  /**
   * Start scanning for QR codes
   * Requires camera permission from user
   */
  async startScanning(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.setState('scanning')
      this.config.onScanning?.()

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      this.videoStream = stream
      videoElement.srcObject = stream
      this.isScanning = true

      // Start QR code detection
      this.detectQRCode(videoElement)
    } catch (error) {
      this.handleError({
        code: 'CAMERA_ACCESS_DENIED',
        message: 'Camera access denied or not available',
        details: error,
      })
    }
  }

  /**
   * Stop scanning for QR codes
   */
  stopScanning(): void {
    this.isScanning = false

    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop())
      this.videoStream = null
    }

    this.setState('idle')
  }

  /**
   * Detect QR codes in video stream using canvas API
   * (In production, use a QR code detection library like jsQR or zxing-wasm)
   */
  private async detectQRCode(videoElement: HTMLVideoElement): Promise<void> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      this.handleError({
        code: 'CANVAS_ERROR',
        message: 'Failed to get canvas context',
      })
      return
    }

    const scanningLoop = async () => {
      if (!this.isScanning || !this.videoStream) {
        return
      }

      try {
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight

        ctx.drawImage(videoElement, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        // Simulate QR detection - in production use jsQR library
        // This would require: npm install jsqr
        // const decodedData = jsQR(imageData.data, canvas.width, canvas.height)
        // if (decodedData) {
        //   await this.validateToken(decodedData.data)
        //   this.isScanning = false
        //   return
        // }

        // Continue scanning
        requestAnimationFrame(scanningLoop)
      } catch (error) {
        this.handleError({
          code: 'QR_DETECTION_ERROR',
          message: 'Error detecting QR code',
          details: error,
        })
      }
    }

    scanningLoop()
  }

  /**
   * Validate QR token with backend
   * Called after QR code is scanned
   */
  async validateToken(token: string): Promise<void> {
    try {
      this.setState('validating')

      const response = await fetch(`${this.config.apiBaseUrl}/api/qr/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          hotelId: this.config.hotelId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Token validation failed')
      }

      const sessionData: QRSessionData = await response.json()

      // Store session data
      this.sessionData = sessionData
      localStorage.setItem('qr_session_jwt', sessionData.sessionJWT)
      localStorage.setItem('qr_session_user', JSON.stringify(sessionData.user))
      localStorage.setItem('qr_session_permissions', JSON.stringify(sessionData.permissions))
      localStorage.setItem('qr_session_expires', sessionData.expiresAt.toString())

      this.setState('authenticated')
      this.stopScanning()
      this.config.onSuccess?.(sessionData)
    } catch (error) {
      this.handleError({
        code: 'TOKEN_VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Token validation failed',
        details: error,
      })
    }
  }

  /**
   * Manual token entry (for testing or fallback)
   */
  async manualTokenEntry(token: string): Promise<void> {
    if (!token.trim()) {
      this.handleError({
        code: 'EMPTY_TOKEN',
        message: 'Token cannot be empty',
      })
      return
    }

    await this.validateToken(token.trim())
  }

  /**
   * Check if user has valid session
   */
  isAuthenticated(): boolean {
    const jwt = localStorage.getItem('qr_session_jwt')
    const expiresAt = localStorage.getItem('qr_session_expires')

    if (!jwt || !expiresAt) {
      return false
    }

    const expirationTime = parseInt(expiresAt, 10)
    const currentTime = Math.floor(Date.now() / 1000)

    return currentTime < expirationTime
  }

  /**
   * Get current session data
   */
  getSession(): QRSessionData | null {
    if (!this.isAuthenticated()) {
      this.clearSession()
      return null
    }

    const jwt = localStorage.getItem('qr_session_jwt')
    const user = localStorage.getItem('qr_session_user')
    const permissions = localStorage.getItem('qr_session_permissions')
    const expiresAt = localStorage.getItem('qr_session_expires')

    if (!jwt || !user || !permissions || !expiresAt) {
      return null
    }

    return {
      sessionJWT: jwt,
      user: JSON.parse(user),
      permissions: JSON.parse(permissions),
      expiresAt: parseInt(expiresAt, 10),
    }
  }

  /**
   * Get authentication token for API requests
   */
  getAuthToken(): string | null {
    return this.isAuthenticated() ? localStorage.getItem('qr_session_jwt') : null
  }

  /**
   * Clear session
   */
  clearSession(): void {
    localStorage.removeItem('qr_session_jwt')
    localStorage.removeItem('qr_session_user')
    localStorage.removeItem('qr_session_permissions')
    localStorage.removeItem('qr_session_expires')
    this.sessionData = null
    this.setState('idle')
  }

  /**
   * Logout
   */
  logout(): void {
    this.stopScanning()
    this.clearSession()
  }

  /**
   * Check permission
   */
  hasPermission(permission: string): boolean {
    const session = this.getSession()
    return session ? session.permissions.includes(permission) : false
  }

  /**
   * Get user role
   */
  getUserRole(): 'guest' | 'staff' | null {
    const session = this.getSession()
    return session ? session.user.role : null
  }

  /**
   * Get current state
   */
  getState(): QRAuthState {
    return this.state
  }

  /**
   * Set state
   */
  private setState(newState: QRAuthState): void {
    this.state = newState
  }

  /**
   * Handle authentication error
   */
  private handleError(error: QRAuthError): void {
    this.setState('error')
    this.stopScanning()
    this.config.onError?.(error)
  }
}

/**
 * Create QR Auth controller factory
 */
export function createQRAuth(config: QRAuthConfig): QRAuthController {
  return new QRAuthController(config)
}
