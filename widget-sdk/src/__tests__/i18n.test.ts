import { describe, expect, it } from 'vitest'
import { createTranslator } from '../i18n'

describe('createTranslator', () => {
  it('returns default English strings', () => {
    const translator = createTranslator('en')
    expect(translator.t('widget.send')).toBe('Send')
  })

  it('supports overrides', () => {
    const translator = createTranslator('en', {
      en: {
        'widget.send': 'Submit',
      },
    })
    expect(translator.t('widget.send')).toBe('Submit')
  })

  it('returns key when translation missing', () => {
    const translator = createTranslator('es')
    expect(translator.t('nonexistent.key')).toBe('nonexistent.key')
  })
})
