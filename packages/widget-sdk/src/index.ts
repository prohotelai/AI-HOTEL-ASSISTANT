/**
 * PMS Widget SDK
 * Vanilla TypeScript SDK for embedding booking and guest services in external websites
 * No framework dependencies, supports offline-first architecture
 */

export interface WidgetConfig {
  apiUrl: string
  hotelId: string
  theme?: WidgetTheme
  features?: WidgetFeatures
  onReady?: () => void
  onError?: (error: Error) => void
}

export interface WidgetTheme {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  borderRadius?: string
  fontFamily?: string
}

export interface WidgetFeatures {
  enableQRCheckin?: boolean
  enableBooking?: boolean
  enableLoyaltyProgram?: boolean
  enableMessaging?: boolean
  enableServiceRequests?: boolean
}

export interface WidgetSession {
  id: string
  guestId: string
  token: string
  expiresAt: number
}

export interface QRValidationResult {
  valid: boolean
  type: string
  data?: any
  error?: string
}

/**
 * Main Widget SDK class
 */
export class PMSWidget {
  private config: WidgetConfig
  private session: WidgetSession | null = null
  private container: HTMLElement | null = null
  private eventListeners: Map<string, Function[]> = new Map()
  private cache: Map<string, any> = new Map()
  private cacheTimestamps: Map<string, number> = new Map()
  private offline: boolean = false
  private syncQueue: Array<{ type: string; data: any; timestamp: number }> = []

  constructor(config: WidgetConfig) {
    this.config = {
      theme: {},
      features: {
        enableQRCheckin: true,
        enableBooking: true,
        enableMessaging: true,
        enableServiceRequests: true
      },
      ...config
    }

    this.initializeOfflineDetection()
    this.loadCache()
    this.config.onReady?.()
  }

  /**
   * Initialize the widget in a DOM element
   */
  async mount(elementId: string): Promise<void> {
    this.container = document.getElementById(elementId)
    if (!this.container) {
      throw new Error(`Element with id "${elementId}" not found`)
    }

    this.renderWidget()
    this.setupEventListeners()
  }

  /**
   * Authenticate a guest with QR code
   */
  async authenticateWithQR(qrCode: string): Promise<WidgetSession> {
    try {
      const validated = await this.validateQRCode(qrCode)
      if (!validated.valid) {
        throw new Error(validated.error || 'Invalid QR code')
      }

      const session = await this.createSession(validated.data)
      this.session = session
      this.emit('authenticated', { guest: validated.data.guest })

      return session
    } catch (error: any) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Validate QR code
   */
  async validateQRCode(qrCode: string): Promise<QRValidationResult> {
    try {
      // Try online first
      if (!this.offline) {
        const response = await fetch(`${this.config.apiUrl}/api/qr/universal/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: qrCode })
        })

        if (response.ok) {
          const data = await response.json()
          // Cache result for offline use
          this.cacheQRValidation(qrCode, data)
          return {
            valid: true,
            type: data.type,
            data
          }
        }
      }

      // Try cache if offline or online request failed
      const cached = this.getCachedQRValidation(qrCode)
      if (cached) {
        return {
          valid: true,
          type: cached.type,
          data: cached
        }
      }

      return {
        valid: false,
        error: 'Invalid QR code or unable to validate'
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      }
    }
  }

  /**
   * Process check-in with QR code
   */
  async processCheckIn(qrCode: string, notes?: string): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const action = {
      type: 'CHECKIN',
      data: { qrCode, notes },
      timestamp: Date.now()
    }

    if (this.offline) {
      this.syncQueue.push(action)
      this.saveSyncQueue()
      this.emit('action:queued', action)
      return { queued: true }
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/qr/universal/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.token}`
        },
        body: JSON.stringify({ token: qrCode, notes })
      })

      if (!response.ok) {
        throw new Error('Check-in failed')
      }

      const data = await response.json()
      this.emit('checkin:success', data)
      return data
    } catch (error: any) {
      // Queue for sync if online request fails
      this.syncQueue.push(action)
      this.saveSyncQueue()
      this.emit('action:queued', action)
      throw error
    }
  }

  /**
   * Process check-out with QR code
   */
  async processCheckOut(qrCode: string, notes?: string, damages?: any): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const action = {
      type: 'CHECKOUT',
      data: { qrCode, notes, damages },
      timestamp: Date.now()
    }

    if (this.offline) {
      this.syncQueue.push(action)
      this.saveSyncQueue()
      this.emit('action:queued', action)
      return { queued: true }
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/qr/universal/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.token}`
        },
        body: JSON.stringify({ token: qrCode, notes, damages })
      })

      if (!response.ok) {
        throw new Error('Check-out failed')
      }

      const data = await response.json()
      this.emit('checkout:success', data)
      return data
    } catch (error: any) {
      this.syncQueue.push(action)
      this.saveSyncQueue()
      this.emit('action:queued', action)
      throw error
    }
  }

  /**
   * Get guest information
   */
  async getGuestInfo(): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const cacheKey = `guest:${this.session.guestId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    if (this.offline) {
      return null
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/widget/guest`, {
        headers: {
          'Authorization': `Bearer ${this.session.token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        this.setInCache(cacheKey, data, 5 * 60 * 1000) // 5 minute cache
        return data
      }
    } catch (error) {
      console.error('Failed to fetch guest info:', error)
    }

    return null
  }

  /**
   * Request hotel service
   */
  async requestService(serviceType: string, description: string): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const action = {
      type: 'SERVICE_REQUEST',
      data: { serviceType, description },
      timestamp: Date.now()
    }

    if (this.offline) {
      this.syncQueue.push(action)
      this.saveSyncQueue()
      this.emit('action:queued', action)
      return { queued: true }
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/widget/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.token}`
        },
        body: JSON.stringify({ serviceType, description })
      })

      if (response.ok) {
        const data = await response.json()
        this.emit('service:requested', data)
        return data
      }
    } catch (error) {
      this.syncQueue.push(action)
      this.saveSyncQueue()
    }

    throw new Error('Service request failed')
  }

  /**
   * Sync queued actions when back online
   */
  async syncOfflineQueue(): Promise<void> {
    if (this.offline || !this.session) return

    const queue = [...this.syncQueue]
    this.syncQueue = []

    for (const action of queue) {
      try {
        if (action.type === 'CHECKIN') {
          await this.processCheckIn(
            action.data.qrCode,
            action.data.notes
          )
        } else if (action.type === 'CHECKOUT') {
          await this.processCheckOut(
            action.data.qrCode,
            action.data.notes,
            action.data.damages
          )
        } else if (action.type === 'SERVICE_REQUEST') {
          await this.requestService(
            action.data.serviceType,
            action.data.description
          )
        }
      } catch (error) {
        // Re-queue if sync fails
        this.syncQueue.push(action)
        console.error('Sync failed for action:', action, error)
      }
    }

    this.saveSyncQueue()
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        const index = listeners.indexOf(callback)
        if (index !== -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  /**
   * Private methods
   */

  private async createSession(guestData: any): Promise<WidgetSession> {
    const response = await fetch(`${this.config.apiUrl}/api/widget/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hotelId: this.config.hotelId,
        guestId: guestData.guestId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create session')
    }

    return await response.json()
  }

  private validateQRCode(qrCode: string): QRData | null {
    try {
      return JSON.parse(
        Buffer.from(qrCode, 'base64').toString()
      )
    } catch {
      return null
    }
  }

  private initializeOfflineDetection(): void {
    window.addEventListener('online', () => {
      this.offline = false
      this.emit('online')
      this.syncOfflineQueue()
    })

    window.addEventListener('offline', () => {
      this.offline = true
      this.emit('offline')
    })

    this.offline = !navigator.onLine
  }

  private renderWidget(): void {
    if (!this.container) return

    this.container.innerHTML = `
      <div class="pms-widget" style="${this.getWidgetStyles()}">
        <div class="pms-widget-header">
          <h2>Hotel Services</h2>
          <span class="pms-widget-status ${this.offline ? 'offline' : 'online'}">
            ${this.offline ? 'Offline' : 'Online'}
          </span>
        </div>
        <div class="pms-widget-content">
          <div class="pms-widget-qr-section">
            <label>Scan QR Code:</label>
            <input type="text" id="pms-qr-input" placeholder="Point camera at QR code">
            <button id="pms-qr-button">Validate</button>
          </div>
          <div id="pms-widget-services"></div>
        </div>
      </div>
    `

    this.injectStyles()
  }

  private setupEventListeners(): void {
    const qrInput = document.getElementById('pms-qr-input')
    const qrButton = document.getElementById('pms-qr-button')

    qrButton?.addEventListener('click', async () => {
      const qrCode = (qrInput as HTMLInputElement).value
      if (qrCode) {
        try {
          await this.validateQRCode(qrCode)
          ;(qrInput as HTMLInputElement).value = ''
        } catch (error) {
          this.emit('error', error)
        }
      }
    })
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach((callback) => callback(data))
  }

  private cacheQRValidation(qrCode: string, data: any): void {
    const key = `qr:${qrCode}`
    this.setInCache(key, data, 24 * 60 * 60 * 1000) // 24 hour cache
  }

  private getCachedQRValidation(qrCode: string): any {
    return this.getFromCache(`qr:${qrCode}`)
  }

  private setInCache(key: string, value: any, ttl: number): void {
    this.cache.set(key, value)
    this.cacheTimestamps.set(key, Date.now() + ttl)
  }

  private getFromCache(key: string): any {
    const timestamp = this.cacheTimestamps.get(key)
    if (timestamp && timestamp > Date.now()) {
      return this.cache.get(key)
    }
    this.cache.delete(key)
    this.cacheTimestamps.delete(key)
    return null
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem('pms-widget-cache')
      if (stored) {
        const { cache, timestamps } = JSON.parse(stored)
        this.cache = new Map(Object.entries(cache))
        this.cacheTimestamps = new Map(Object.entries(timestamps))
      }
    } catch (error) {
      console.error('Failed to load cache:', error)
    }
  }

  private saveSyncQueue(): void {
    try {
      localStorage.setItem('pms-widget-sync-queue', JSON.stringify(this.syncQueue))
    } catch (error) {
      console.error('Failed to save sync queue:', error)
    }
  }

  private getWidgetStyles(): string {
    const theme = this.config.theme || {}
    return `
      --primary-color: ${theme.primaryColor || '#3b82f6'};
      --secondary-color: ${theme.secondaryColor || '#1f2937'};
      --accent-color: ${theme.accentColor || '#10b981'};
      --border-radius: ${theme.borderRadius || '8px'};
      --font-family: ${theme.fontFamily || 'system-ui, -apple-system, sans-serif'};
    `
  }

  private injectStyles(): void {
    if (document.getElementById('pms-widget-styles')) return

    const styles = document.createElement('style')
    styles.id = 'pms-widget-styles'
    styles.textContent = `
      .pms-widget {
        font-family: var(--font-family);
        background: white;
        border-radius: var(--border-radius);
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        padding: 20px;
      }
      .pms-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid var(--primary-color);
        padding-bottom: 12px;
        margin-bottom: 16px;
      }
      .pms-widget-header h2 {
        margin: 0;
        color: var(--secondary-color);
      }
      .pms-widget-status {
        padding: 4px 12px;
        border-radius: var(--border-radius);
        font-size: 12px;
        font-weight: bold;
      }
      .pms-widget-status.online {
        background: var(--accent-color);
        color: white;
      }
      .pms-widget-status.offline {
        background: #ef4444;
        color: white;
      }
      .pms-widget-qr-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pms-widget-qr-section input {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: var(--border-radius);
      }
      .pms-widget-qr-section button {
        padding: 10px 20px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: var(--border-radius);
        cursor: pointer;
      }
      .pms-widget-qr-section button:hover {
        opacity: 0.9;
      }
    `
    document.head.appendChild(styles)
  }
}

interface QRData {
  type: string
  code: string
  timestamp: number
  guestId?: string
  roomId?: string
  bookingId?: string
}

export default PMSWidget
