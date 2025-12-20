import { WidgetLanguage, WidgetTranslations } from './types'

const DEFAULT_DICTIONARY: Record<WidgetLanguage, Record<string, string>> = {
  en: {
    'widget.title': 'Need help? Chat with us',
    'widget.input.placeholder': 'Ask a question…',
    'widget.send': 'Send',
    'widget.voice.start': 'Start voice',
    'widget.voice.stop': 'Stop voice',
    'widget.aria.open': 'Open AI assistant chat',
    'widget.aria.close': 'Close AI assistant chat',
    'widget.status.offline': 'Assistant is unavailable. Try again later.',
  },
  es: {
    'widget.title': '¿Necesitas ayuda? Chatea con nosotros',
    'widget.input.placeholder': 'Haz una pregunta…',
    'widget.send': 'Enviar',
    'widget.voice.start': 'Iniciar voz',
    'widget.voice.stop': 'Detener voz',
    'widget.aria.open': 'Abrir chat del asistente de IA',
    'widget.aria.close': 'Cerrar chat del asistente de IA',
    'widget.status.offline': 'El asistente no está disponible. Inténtalo más tarde.',
  },
  fr: {
    'widget.title': 'Besoin d’aide ? Discutez avec nous',
    'widget.input.placeholder': 'Posez une question…',
    'widget.send': 'Envoyer',
    'widget.voice.start': 'Activer la voix',
    'widget.voice.stop': 'Arrêter la voix',
    'widget.aria.open': 'Ouvrir le chat de l’assistant IA',
    'widget.aria.close': 'Fermer le chat de l’assistant IA',
    'widget.status.offline': 'Assistant indisponible. Réessayez plus tard.',
  },
}

export function createTranslator(language: WidgetLanguage, overrides?: WidgetTranslations) {
  let currentLanguage = language
  const dictionaries: Record<WidgetLanguage, Record<string, string>> = {
    en: { ...DEFAULT_DICTIONARY.en },
    es: { ...DEFAULT_DICTIONARY.es },
    fr: { ...DEFAULT_DICTIONARY.fr },
  }

  if (overrides) {
    Object.entries(overrides).forEach(([lang, values]) => {
      if (!values) return
      const normalized = lang as WidgetLanguage
      const existing = dictionaries[normalized] ?? {}
      dictionaries[normalized] = { ...existing, ...values }
    })
  }

  function t(key: string) {
    const dict = dictionaries[currentLanguage]
    return dict?.[key] ?? DEFAULT_DICTIONARY.en[key] ?? key
  }

  function setLanguage(lang: WidgetLanguage) {
    currentLanguage = lang
  }

  return { t, setLanguage }
}
