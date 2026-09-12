import { describe, it, expect, afterEach, vi } from 'vitest'
import { createDatabase, type PortfolioDB } from '@/db/database'
import { upsertHolding, getSettings, listHoldings } from '@/db/repository'
import type { Holding, Market } from '@/domain/types'
import { syncPrices, syncRates, isSyncDue } from './sync'

let db: PortfolioDB
afterEach(async () => {
  if (db) await db.delete()
})
function fresh() {
  db = createDatabase(`sync-${Math.random().toString(36).slice(2)}`)
  return db
}

function holding(p: Partial<Holding> & Pick<Holding, 'id' | 'market' | 'symbol'>): Holding {
  return {
    accountId: 'a1',
    currency: 'USD',
    openingShares: 1,
    avgCost: 100,
    price: 100,
    ...p,
  }
}

describe('syncPrices', () => {
  it('updates matching holdings and reports the counts', async () => {
    const opened = fresh()
    await upsertHolding(holding({ id: 'h1', market: 'US', symbol: 'AAPL' }), opened)
    await upsertHolding(holding({ id: 'h2', market: 'A', symbol: '600519', currency: 'CNY' }), opened)

    const getQuotes = vi.fn(async () => [
      { key: 'US:AAPL', ok: true, price: 250, currency: 'USD' },
      { key: 'A:600519', ok: false, error: 'not found' },
    ])

    const result = await syncPrices(opened, { getQuotes })
    expect(result.updated).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors[0]).toMatch(/600519/)

    const saved = await listHoldings(opened)
    const aapl = saved.find((h) => h.id === 'h1')!
    expect(aapl.price).toBe(250)
    expect(aapl.priceUpdatedAt).toBeGreaterThan(0)
    const maotai = saved.find((h) => h.id === 'h2')!
    expect(maotai.price).toBe(100)
  })

  it('deduplicates the API request for repeated symbols', async () => {
    const opened = fresh()
    await upsertHolding(holding({ id: 'h1', market: 'US', symbol: 'AAPL' }), opened)
    await upsertHolding(holding({ id: 'h2', market: 'US', symbol: 'AAPL' }), opened)

    const getQuotes = vi.fn(async (items: { market: Market; symbol: string }[]) => {
      expect(items).toHaveLength(1)
      return [{ key: 'US:AAPL', ok: true, price: 300 }]
    })

    const result = await syncPrices(opened, { getQuotes })
    expect(getQuotes).toHaveBeenCalledTimes(1)
    expect(result.updated).toBe(2)
    const saved = await listHoldings(opened)
    expect(saved.every((h) => h.price === 300)).toBe(true)
  })

  it('does nothing when there are no holdings', async () => {
    const opened = fresh()
    const getQuotes = vi.fn()
    const result = await syncPrices(opened, { getQuotes })
    expect(getQuotes).not.toHaveBeenCalled()
    expect(result.updated).toBe(0)
  })
})

describe('syncRates', () => {
  it('merges fetched rates into settings and stamps the time', async () => {
    const opened = fresh()
    await getSettings(opened)
    const getRates = vi.fn(async () => ({ CNY: 1, USD: 7.1, HKD: 0.91 }))
    const result = await syncRates(opened, { getRates })
    expect(getRates).toHaveBeenCalledWith('CNY')

    const settings = await getSettings(opened)
    expect(settings.rates.USD).toBe(7.1)
    expect(settings.rates.HKD).toBe(0.91)
    expect(settings.ratesUpdatedAt).toBeGreaterThan(0)
    expect(result.count).toBe(3)
  })
})

describe('isSyncDue', () => {
  const now = Date.UTC(2026, 0, 1)

  it('is due when it has never synced', () => {
    expect(isSyncDue(undefined, 90, now)).toBe(true)
  })

  it('is not due right after syncing', () => {
    expect(isSyncDue(now, 90, now)).toBe(false)
  })

  it('is due once the interval has elapsed (quarterly = 90 days)', () => {
    const day = 24 * 60 * 60 * 1000
    expect(isSyncDue(now - 89 * day, 90, now)).toBe(false)
    expect(isSyncDue(now - 90 * day, 90, now)).toBe(true)
  })

  it('never auto-syncs when the interval is disabled', () => {
    expect(isSyncDue(undefined, 0, now)).toBe(false)
  })
})
