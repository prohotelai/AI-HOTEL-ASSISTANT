import { WidgetEventBus } from './events'
import { injectStyles } from './style'
import { applyTheme } from './theme'
import { WidgetMessage, WidgetPermissions } from './types'

export type WidgetDomOptions = {
  mountPoint: HTMLElement
  eventBus: WidgetEventBus
  t: (key: string) => string
  onSend: (message: string) => void
  onToggle: () => void
  onStartVoice: () => void
  onStopVoice: () => void
  onRequestTicket: () => void
  permissions?: WidgetPermissions
  enableVoice: boolean
}

export type WidgetDom = {
  open: () => void
  close: () => void
  toggle: () => void
  renderMessages: (messages: WidgetMessage[]) => void
  setLanguage: (t: (key: string) => string) => void
  setVoiceAvailable: (available: boolean) => void
  destroy: () => void
  setStatus: (status: string | null) => void
}

export function createWidgetDom(options: WidgetDomOptions): WidgetDom {
  const container = document.createElement('div')
  container.className = 'prohotelai-widget'
  applyTheme(container)
  injectStyles(document)

  const toggleButton = document.createElement('button')
  toggleButton.className = 'prohotelai-toggle'
  toggleButton.type = 'button'
  toggleButton.setAttribute('aria-label', options.t('widget.aria.open'))
  toggleButton.textContent = 'AI Assistant'
  toggleButton.addEventListener('click', options.onToggle)

  const windowEl = document.createElement('div')
  windowEl.className = 'prohotelai-window'

  const header = document.createElement('div')
  header.className = 'prohotelai-header'
  header.textContent = options.t('widget.title')

  const messagesEl = document.createElement('div')
  messagesEl.className = 'prohotelai-messages'

  const statusEl = document.createElement('div')
  statusEl.className = 'prohotelai-status'
  statusEl.style.display = 'none'

  const form = document.createElement('form')
  form.className = 'prohotelai-form'

  const input = document.createElement('input')
  input.className = 'prohotelai-input'
  input.type = 'text'
  input.placeholder = options.t('widget.input.placeholder')
  input.autocomplete = 'off'
  input.setAttribute('aria-label', options.t('widget.input.placeholder'))

  const sendButton = document.createElement('button')
  sendButton.className = 'prohotelai-send'
  sendButton.type = 'submit'
  sendButton.textContent = options.t('widget.send')

  const voiceButton = document.createElement('button')
  voiceButton.className = 'prohotelai-voice'
  voiceButton.type = 'button'
  voiceButton.textContent = options.t('widget.voice.start')
  voiceButton.style.display = options.enableVoice ? 'inline-flex' : 'none'

  let voiceActive = false

  voiceButton.addEventListener('click', () => {
    if (!voiceActive) {
      options.onStartVoice()
      voiceActive = true
      voiceButton.textContent = options.t('widget.voice.stop')
    } else {
      options.onStopVoice()
      voiceActive = false
      voiceButton.textContent = options.t('widget.voice.start')
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const value = input.value.trim()
    if (value.length === 0) return
    options.onSend(value)
    input.value = ''
    voiceActive = false
    voiceButton.textContent = options.t('widget.voice.start')
  })

  const ticketButton = document.createElement('button')
  ticketButton.type = 'button'
  ticketButton.textContent = 'Create ticket'
  ticketButton.className = 'prohotelai-voice'
  ticketButton.style.display = options.permissions?.includes('tickets:create') ? 'inline-flex' : 'none'
  ticketButton.addEventListener('click', () => {
    options.onRequestTicket()
  })

  form.appendChild(input)
  form.appendChild(sendButton)
  form.appendChild(voiceButton)
  form.appendChild(ticketButton)

  windowEl.appendChild(header)
  windowEl.appendChild(messagesEl)
  windowEl.appendChild(statusEl)
  windowEl.appendChild(form)

  container.appendChild(toggleButton)
  container.appendChild(windowEl)

  options.mountPoint.appendChild(container)

  function renderMessages(messages: WidgetMessage[]) {
    messagesEl.innerHTML = ''
    messages.forEach((message) => {
      const bubble = document.createElement('div')
      bubble.className = `prohotelai-message ${message.role}`
      bubble.textContent = message.content
      messagesEl.appendChild(bubble)
    })
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  function open() {
    windowEl.classList.add('open')
    toggleButton.setAttribute('aria-label', options.t('widget.aria.close'))
  }

  function close() {
    windowEl.classList.remove('open')
    toggleButton.setAttribute('aria-label', options.t('widget.aria.open'))
  }

  function toggle() {
    if (windowEl.classList.contains('open')) {
      close()
    } else {
      open()
    }
  }

  function setLanguage(t: (key: string) => string) {
    header.textContent = t('widget.title')
    input.placeholder = t('widget.input.placeholder')
    input.setAttribute('aria-label', t('widget.input.placeholder'))
    sendButton.textContent = t('widget.send')
    voiceButton.textContent = voiceActive ? t('widget.voice.stop') : t('widget.voice.start')
    toggleButton.setAttribute('aria-label', windowEl.classList.contains('open') ? t('widget.aria.close') : t('widget.aria.open'))
  }

  function setVoiceAvailable(available: boolean) {
    voiceButton.style.display = available ? 'inline-flex' : 'none'
  }

  function setStatus(status: string | null) {
    if (!status) {
      statusEl.style.display = 'none'
      statusEl.textContent = ''
    } else {
      statusEl.style.display = 'block'
      statusEl.textContent = status
    }
  }

  function destroy() {
    container.remove()
  }

  return {
    open,
    close,
    toggle,
    renderMessages,
    setLanguage,
    setVoiceAvailable,
    destroy,
    setStatus,
  }
}
