import type { CurrencyCode } from './types'

export interface CurrencyMeta {
  code: CurrencyCode
  symbol: string
  name: string
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: 'CNY', symbol: '¥', name: '人民币' },
  { code: 'USD', symbol: '$', name: '美元' },
  { code: 'HKD', symbol: 'HK$', name: '港币' },
  { code: 'EUR', symbol: '€', name: '欧元' },
  { code: 'JPY', symbol: '¥', name: '日元' },
  { code: 'GBP', symbol: '£', name: '英镑' },
  { code: 'KRW', symbol: '₩', name: '韩元' },
  { code: 'SGD', symbol: 'S$', name: '新加坡元' },
  { code: 'TWD', symbol: 'NT$', name: '新台币' },
  { code: 'BTC', symbol: '₿', name: '比特币' },
  { code: 'ETH', symbol: 'Ξ', name: '以太坊' },
  { code: 'USDT', symbol: '₮', name: '泰达币' },
]

export const DEFAULT_BASE_CURRENCY: CurrencyCode = 'CNY'

/** Value of 1 unit of each currency expressed in CNY. */
export const DEFAULT_RATES: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 7.2,
  HKD: 0.92,
  EUR: 7.8,
  JPY: 0.048,
  GBP: 9.1,
  KRW: 0.0052,
  SGD: 5.35,
  TWD: 0.22,
  BTC: 520000,
  ETH: 26000,
  USDT: 7.2,
}

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? { code, symbol: code, name: code }
}

let formatLocale = 'zh-CN'

/** The UI sets this when the language changes. */
export function setFormatLocale(locale: string): void {
  formatLocale = locale
}

export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<CurrencyCode, number>,
): number {
  if (from === to) return amount
  const fromRate = rates[from]
  const toRate = rates[to]
  if (fromRate == null) throw new Error(`Missing exchange rate for ${from}`)
  if (toRate == null) throw new Error(`Missing exchange rate for ${to}`)
  return (amount * fromRate) / toRate
}

/** Non-ISO currencies that must always use our own symbol (Intl would print the code). */
const SYMBOL_ONLY_CURRENCIES = new Set(['BTC', 'ETH', 'USDT'])

export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  opts: { compact?: boolean; locale?: string } = {},
): string {
  const locale = opts.locale ?? formatLocale
  if (!SYMBOL_ONLY_CURRENCIES.has(currency)) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        notation: opts.compact ? 'compact' : 'standard',
        maximumFractionDigits: opts.compact ? 1 : 2,
        minimumFractionDigits: opts.compact ? 0 : 2,
      }).format(amount)
    } catch {
      // fall through to the manual symbol path below
    }
  }
  // Non-ISO currencies (e.g. USDT, BTC, ETH) are not supported by Intl; prefix the symbol manually.
  const { symbol } = currencyMeta(currency)
  const digits = opts.compact ? 1 : 2
  const number = new Intl.NumberFormat(locale, {
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: digits,
    minimumFractionDigits: opts.compact ? 0 : 2,
  }).format(amount)
  return `${symbol}${number}`
}

export function formatNumber(amount: number, digits = 2): string {
  return new Intl.NumberFormat(formatLocale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(amount)
}

export function formatPercent(value: number, digits = 1): string {
  if (value === 0) return `${(0).toFixed(digits)}%`
  const sign = value > 0 ? '+' : '-'
  return `${sign}${(Math.abs(value) * 100).toFixed(digits)}%`
}
