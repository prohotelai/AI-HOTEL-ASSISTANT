import { WidgetLanguage, WidgetMessage } from './types'

export function resolveElement(target?: HTMLElement | string): HTMLElement {
  if (!target) {
    const el = document.createElement('div')
    document.body.appendChild(el)
    return el
  }

  if (target instanceof HTMLElement) {
    return target
  }

  const found = document.querySelector<HTMLElement>(target)
  if (!found) {
    const el = document.createElement('div')
    document.body.appendChild(el)
    return el
  }
  return found
}

export function buildEndpointUrl(base: string, path: string) {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export function randomId(prefix = 'msg') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`
}

export function toMessage(value: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }): WidgetMessage {
  return {
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: new Date(value.createdAt),
  }
}

export function normalizeLanguage(language: string | undefined, fallback: WidgetLanguage): WidgetLanguage {
  if (!language) return fallback
  const normalized = language.toLowerCase()
  if (normalized === 'en' || normalized === 'es' || normalized === 'fr') {
    return normalized
  }
  return fallback
}
