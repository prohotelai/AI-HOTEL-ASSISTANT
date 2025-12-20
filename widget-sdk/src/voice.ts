import { WidgetEventBus } from './events'

type VoiceControllerOptions = {
  eventBus: WidgetEventBus
  onText: (text: string) => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognition

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export function createVoiceController(options: VoiceControllerOptions) {
  const SpeechRecognition = (window.SpeechRecognition ?? window.webkitSpeechRecognition) as
    | SpeechRecognitionConstructor
    | undefined

  let recognition: SpeechRecognition | null = null

  function supportsRecognition() {
    return Boolean(SpeechRecognition)
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      options.eventBus.emit('error', { message: 'Speech recognition not supported' })
      return
    }

    if (recognition) {
      recognition.stop()
    }

    recognition = new SpeechRecognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) {
        options.onText(transcript)
      }
    }
    recognition.onerror = (event) => {
      options.eventBus.emit('error', { message: 'Speech recognition error', error: event.error })
    }

    recognition.start()
    options.eventBus.emit('voice:start', undefined)
  }

  function stopRecognition() {
    recognition?.stop()
    recognition = null
    options.eventBus.emit('voice:stop', undefined)
  }

  function speak(text: string) {
    if (!('speechSynthesis' in window)) {
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = navigator.language || 'en-US'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return {
    supportsRecognition,
    startRecognition,
    stopRecognition,
    speak,
  }
}
