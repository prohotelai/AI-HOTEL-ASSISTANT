import { createChatClient } from './chatClient'
import { WidgetEventBus } from './events'
import { createTranslator } from './i18n'
import { createVoiceController } from './voice'
import { createWidgetDom } from './widgetDom'
import { normalizeLanguage, randomId, resolveElement } from './utils'
import { applyTheme } from './theme'
import { createQRAuth, type QRAuthController } from './qrAuth'
import {
  WidgetConfig,
  WidgetController,
  WidgetEvent,
  WidgetEventHandler,
  WidgetLanguage,
  WidgetMessage,
  WidgetPermissions,
} from './types'

export type {
  WidgetConfig,
  WidgetController,
  WidgetLanguage,
  WidgetMessage,
  WidgetPermissions,
  WidgetEvent,
  WidgetEventHandler,
}

export { createQRAuth }
export type { QRAuthController }

const DEFAULT_LANGUAGE: WidgetLanguage = 'en'

export function createWidget(config: WidgetConfig): WidgetController {
  const mountPoint = resolveElement(config.element)
  const language = normalizeLanguage(config.defaultLanguage, DEFAULT_LANGUAGE)
  const eventBus = new WidgetEventBus()
  const translator = createTranslator(language, config.translations)
  
  // Initialize QR Auth if enabled
  let qrAuth: QRAuthController | null = null
  if (config.qrAuth?.enabled) {
    qrAuth = createQRAuth({
      apiBaseUrl: config.apiBaseUrl,
      hotelId: config.hotelId,
      onSuccess: (sessionData) => {
        eventBus.emit('qr:authenticated', { sessionData })
      },
      onError: (error) => {
        eventBus.emit('qr:error', { error: error.message })
      },
      onScanning: () => {
        eventBus.emit('qr:scanning', undefined)
      },
    })
  }

  const chatClient = createChatClient({
    apiBaseUrl: config.apiBaseUrl,
    hotelId: config.hotelId,
    conversationId: config.conversationId,
    guestId: config.guestId,
    headers: config.headers,
    permissions: config.permissions,
  })

  const voice = createVoiceController({
    eventBus,
    onText: (text) => {
      void sendMessage(text)
    },
  })

  const dom = createWidgetDom({
    mountPoint,
    eventBus,
    t: translator.t,
    onSend: (message) => {
      void sendMessage(message)
    },
    onToggle: () => {
      dom.toggle()
    },
    onStartVoice: () => {
      voice.startRecognition()
    },
    onStopVoice: () => {
      voice.stopRecognition()
    },
    onRequestTicket: () => {
      void sendMessage('Please create a ticket for this request.')
    },
    permissions: config.permissions,
    enableVoice: Boolean(config.enableVoice),
  })

  applyTheme(mountPoint, config.theme)

  let messages: WidgetMessage[] = []

  async function sendMessage(content: string) {
    const tempId = randomId('local')
    const optimisticMessage: WidgetMessage = {
      id: tempId,
      role: 'user',
      content,
      createdAt: new Date(),
    }
    messages = [...messages, optimisticMessage]
    dom.renderMessages(messages)
    eventBus.emit('message:sent', { id: optimisticMessage.id, content: optimisticMessage.content })

    try {
      const { messages: responseMessages } = await chatClient.sendMessage(content)
      messages = responseMessages
      dom.renderMessages(messages)
      const latest = responseMessages.at(-1)
      if (latest && latest.role === 'assistant') {
        eventBus.emit('message:received', { id: latest.id, content: latest.content })
        if (config.enableVoice) {
          voice.speak(latest.content)
        }
      }
      dom.setStatus(null)
    } catch (error) {
      eventBus.emit('error', { message: 'Failed to send message', error })
      dom.setStatus(translator.t('widget.status.offline'))
    }
  }

  function setLanguage(next: WidgetLanguage) {
    translator.setLanguage(next)
    dom.setLanguage(translator.t)
  }

  function setTheme(theme: Parameters<typeof applyTheme>[1]) {
    applyTheme(mountPoint, theme)
  }

  const controller: WidgetController = {
    open: dom.open,
    close: dom.close,
    toggle: dom.toggle,
    sendMessage,
    setLanguage,
    setTheme,
    startVoice: () => {
      if (!config.enableVoice) return
      voice.startRecognition()
    },
    stopVoice: () => {
      voice.stopRecognition()
    },
    destroy: () => {
      dom.destroy()
      if (qrAuth) {
        qrAuth.logout()
      }
    },
    on: (event, handler) => eventBus.on(event, handler),
    // QR Auth methods
    startQRScanning: qrAuth
      ? async (videoElement: HTMLVideoElement) => {
          await qrAuth.startScanning(videoElement)
        }
      : undefined,
    stopQRScanning: qrAuth
      ? () => {
          qrAuth.stopScanning()
        }
      : undefined,
    validateQRToken: qrAuth
      ? async (token: string) => {
          await qrAuth.validateToken(token)
        }
      : undefined,
    isQRAuthenticated: qrAuth ? () => qrAuth.isAuthenticated() : undefined,
    getQRSession: qrAuth ? () => qrAuth.getSession() : undefined,
    logoutQR: qrAuth
      ? () => {
          qrAuth.logout()
        }
      : undefined,
  }

  dom.setVoiceAvailable(config.enableVoice ? voice.supportsRecognition() : false)

  eventBus.emit('ready', { mountedAt: Date.now() })

  return controller
}

if (typeof window !== 'undefined') {
  ;(window as typeof window & { ProHotelAIWidget?: { createWidget: typeof createWidget } }).ProHotelAIWidget = {
    createWidget,
  }
}
