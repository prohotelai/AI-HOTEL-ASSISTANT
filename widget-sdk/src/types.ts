export type WidgetLanguage = 'en' | 'es' | 'fr'

export type WidgetTheme = {
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: string
  fontFamily?: string
}

export type WidgetPermissions = Array<'tickets:create' | 'tickets:view' | 'knowledge-base:view' | 'ai:night-audit' | 'ai:task-routing' | 'ai:housekeeping' | 'ai:forecasting' | 'ai:messaging' | 'ai:upsell'>

export type WidgetEventPayloads = {
  ready: { mountedAt: number }
  'message:sent': { id: string; content: string }
  'message:received': { id: string; content: string }
  'voice:start': void
  'voice:stop': void
  'qr:authenticated': { sessionData: any }
  'qr:scanning': void
  'qr:error': { error: string }
  error: { message: string; error?: unknown }
}

export type WidgetEvent = keyof WidgetEventPayloads

export type WidgetEventHandler<K extends WidgetEvent> = (payload: WidgetEventPayloads[K]) => void

export type WidgetTranslations = Partial<Record<WidgetLanguage, Partial<Record<string, string>>>>

export type MessageRole = 'user' | 'assistant'

export type WidgetMessage = {
  id: string
  role: MessageRole
  content: string
  createdAt: Date
}

export type WidgetConfig = {
  element?: HTMLElement | string
  hotelId: string
  apiBaseUrl: string
  conversationId?: string
  guestId?: string
  defaultLanguage?: WidgetLanguage
  translations?: WidgetTranslations
  theme?: WidgetTheme
  permissions?: WidgetPermissions
  headers?: Record<string, string>
  enableVoice?: boolean
  qrAuth?: {
    enabled: boolean
    autoLogin?: boolean
  }
}

export type WidgetController = {
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (message: string) => Promise<void>
  setLanguage: (language: WidgetLanguage) => void
  setTheme: (theme: WidgetTheme) => void
  startVoice: () => void
  stopVoice: () => void
  destroy: () => void
  on: <K extends WidgetEvent>(event: K, handler: WidgetEventHandler<K>) => () => void
  // QR Authentication methods
  startQRScanning?: (videoElement: HTMLVideoElement) => Promise<void>
  stopQRScanning?: () => void
  validateQRToken?: (token: string) => Promise<void>
  isQRAuthenticated?: () => boolean
  getQRSession?: () => any
  logoutQR?: () => void
}
