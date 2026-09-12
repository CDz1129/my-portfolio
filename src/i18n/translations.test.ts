import { describe, it, expect } from 'vitest'
import { translate, translations } from './translations'

describe('translate', () => {
  it('returns the Chinese string for zh', () => {
    expect(translate('zh', 'common.save')).toBe('保存')
  })

  it('returns the English string for en', () => {
    expect(translate('en', 'common.save')).toBe('Save')
  })

  it('substitutes parameters', () => {
    expect(translate('zh', 'tx.count', { n: 3 })).toBe('共 3 笔记录')
    expect(translate('en', 'home.holdingsCount', { n: 2 })).toBe('2 holdings')
  })

  it('falls back to the key when missing', () => {
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist')
  })

  it('keeps zh and en in sync (no missing translations)', () => {
    const zhKeys = Object.keys(translations.zh).sort()
    const enKeys = Object.keys(translations.en).sort()
    expect(enKeys).toEqual(zhKeys)
  })
})
