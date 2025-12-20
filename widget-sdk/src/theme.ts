import { WidgetTheme } from './types'

const DEFAULT_THEME: Required<WidgetTheme> = {
  accentColor: '#2563eb',
  backgroundColor: '#0f172a',
  textColor: '#f8fafc',
  borderRadius: '16px',
  fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

export function applyTheme(element: HTMLElement, theme?: WidgetTheme) {
  const merged = { ...DEFAULT_THEME, ...(theme ?? {}) }
  element.style.setProperty('--prohotelai-accent', merged.accentColor)
  element.style.setProperty('--prohotelai-background', merged.backgroundColor)
  element.style.setProperty('--prohotelai-text', merged.textColor)
  element.style.setProperty('--prohotelai-radius', merged.borderRadius)
  element.style.setProperty('--prohotelai-font-family', merged.fontFamily)
}
