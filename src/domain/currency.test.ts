import { describe, it, expect } from 'vitest'
import { convert, formatMoney, formatPercent, CURRENCIES, DEFAULT_RATES } from './currency'

const rates = { CNY: 1, USD: 7.2, HKD: 0.92, EUR: 7.8, JPY: 0.048 }

describe('convert', () => {
  it('returns the same amount when currencies match', () => {
    expect(convert(100, 'CNY', 'CNY', rates)).toBe(100)
    expect(convert(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('converts across currencies through the base rate', () => {
    expect(convert(100, 'USD', 'CNY', rates)).toBeCloseTo(720)
    expect(convert(720, 'CNY', 'USD', rates)).toBeCloseTo(100)
  })

  it('converts between two non-base currencies', () => {
    expect(convert(100, 'USD', 'HKD', rates)).toBeCloseTo((100 * 7.2) / 0.92)
  })

  it('throws a helpful error when a rate is missing', () => {
    expect(() => convert(1, 'GBP', 'CNY', rates)).toThrow(/GBP/)
  })
})

describe('formatMoney', () => {
  it('formats with the currency symbol and thousands separators', () => {
    const out = formatMoney(1234567.891, 'CNY')
    expect(out).toContain('1,234,567.89')
    expect(out).toMatch(/¥|CNY/)
  })

  it('supports compact notation for large numbers', () => {
    const out = formatMoney(12345678, 'CNY', { compact: true })
    expect(out).toMatch(/1234\.|1,234|万|M|K/)
  })

  it('does not throw for non-ISO crypto currencies such as USDT', () => {
    const out = formatMoney(1234.5, 'USDT')
    expect(out).toContain('1,234.50')
    expect(out).toContain('₮')
  })

  it('supports compact notation for crypto currencies', () => {
    expect(() => formatMoney(1234567, 'BTC', { compact: true })).not.toThrow()
    expect(formatMoney(0.5, 'BTC')).toContain('0.50')
  })
})

describe('formatPercent', () => {
  it('renders one decimal by default with a sign', () => {
    expect(formatPercent(0.1234)).toBe('+12.3%')
    expect(formatPercent(-0.05)).toBe('-5.0%')
    expect(formatPercent(0)).toBe('0.0%')
  })
})

describe('CURRENCIES', () => {
  it('exposes a base rate for every currency', () => {
    for (const c of CURRENCIES) {
      expect(DEFAULT_RATES[c.code]).toBeDefined()
      expect(c.symbol).toBeTruthy()
      expect(c.name).toBeTruthy()
    }
  })
})
