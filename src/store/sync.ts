import { db as defaultDb, type PortfolioDB } from '@/db/database'
import { getSettings, saveSettings } from '@/db/repository'
import type { Market } from '@/domain/types'
import {
  getQuotes as defaultGetQuotes,
  getRates as defaultGetRates,
  type QuoteItem,
  type QuoteResult,
} from '@/lib/marketApi'

export interface PriceSyncSummary {
  updated: number
  failed: number
  errors: string[]
  updatedAt: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function isSyncDue(
  lastSyncAt: number | undefined,
  intervalDays: number,
  now = Date.now(),
): boolean {
  if (intervalDays <= 0) return false
  return now - (lastSyncAt ?? 0) >= intervalDays * DAY_MS
}

export interface PriceSyncDeps {
  getQuotes?: (items: QuoteItem[]) => Promise<QuoteResult[]>
}

export async function syncPrices(
  database: PortfolioDB = defaultDb,
  deps: PriceSyncDeps = {},
): Promise<PriceSyncSummary> {
  const getQuotes = deps.getQuotes ?? defaultGetQuotes
  const holdings = await database.holdings.toArray()

  const unique = new Map<string, QuoteItem>()
  for (const h of holdings) {
    unique.set(`${h.market}:${h.symbol}`, { market: h.market as Market, symbol: h.symbol })
  }
  const items = [...unique.values()]

  if (items.length === 0) {
    return { updated: 0, failed: 0, errors: [], updatedAt: Date.now() }
  }

  const results = await getQuotes(items)
  const byKey = new Map(results.map((r) => [r.key, r]))

  let updated = 0
  const errors: string[] = []
  const seenErrors = new Set<string>()
  const now = Date.now()

  for (const h of holdings) {
    const result = byKey.get(`${h.market}:${h.symbol}`)
    if (result?.ok && typeof result.price === 'number') {
      await database.holdings.put({
        ...h,
        price: result.price,
        name: result.name ?? h.name,
        priceUpdatedAt: now,
      })
      updated++
    } else if (result && !result.ok) {
      const message = `${h.symbol}: ${result.error ?? '未知错误'}`
      if (!seenErrors.has(message)) {
        seenErrors.add(message)
        errors.push(message)
      }
    }
  }

  return { updated, failed: errors.length, errors, updatedAt: now }
}

export interface RateSyncSummary {
  count: number
  rates: Record<string, number>
  updatedAt: number
}

export interface RateSyncDeps {
  getRates?: (base: string) => Promise<Record<string, number>>
}

export async function syncRates(
  database: PortfolioDB = defaultDb,
  deps: RateSyncDeps = {},
): Promise<RateSyncSummary> {
  const getRates = deps.getRates ?? defaultGetRates
  const settings = await getSettings(database)
  const rates = await getRates(settings.baseCurrency)
  const merged = { ...settings.rates, ...rates }
  const updatedAt = Date.now()
  await saveSettings({ rates: merged, ratesUpdatedAt: updatedAt }, database)
  return { count: Object.keys(rates).length, rates: merged, updatedAt }
}
