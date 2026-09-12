import { describe, it, expect } from 'vitest'
import type { Account, Holding, Settings, Transaction } from './types'
import { buildOverview } from './overview'

const settings: Settings = {
  id: 'app',
  baseCurrency: 'CNY',
  theme: 'system',
  rates: { CNY: 1, USD: 7.2 },
}

function account(p: Partial<Account> & Pick<Account, 'id' | 'kind'>): Account {
  return {
    name: p.id,
    currency: 'CNY',
    openingBalance: 0,
    openingDate: '2024-01-01',
    archived: false,
    createdAt: 0,
    ...p,
  }
}

function holding(p: Partial<Holding> & Pick<Holding, 'id' | 'accountId'>): Holding {
  return {
    symbol: p.id,
    market: 'US',
    currency: 'USD',
    openingShares: 0,
    avgCost: 0,
    price: 0,
    ...p,
  }
}

function tx(p: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'accountId'>): Transaction {
  return { date: '2024-01-01', amount: 0, currency: 'CNY', createdAt: 0, ...p }
}

const accounts: Account[] = [
  account({ id: 'cash', kind: 'cash', openingBalance: 10000 }),
  account({
    id: 'broker',
    kind: 'investment',
    currency: 'USD',
    openingBalance: 1000,
  }),
  account({ id: 'house', kind: 'fixed', openingBalance: 500000 }),
  account({ id: 'loan', kind: 'liability', openingBalance: 200000 }),
]

const holdings: Holding[] = [
  holding({
    id: 'vti',
    accountId: 'broker',
    openingShares: 10,
    avgCost: 200,
    price: 250,
    currency: 'USD',
  }),
]

describe('buildOverview', () => {
  const overview = buildOverview({ accounts, holdings, transactions: [], settings })

  it('reports the summary in the base currency', () => {
    const invested = 10 * 250 * 7.2
    expect(overview.summary.assets).toBeCloseTo(10000 + 1000 * 7.2 + invested + 500000)
    expect(overview.summary.liabilities).toBeCloseTo(200000)
    expect(overview.summary.net).toBeCloseTo(overview.summary.assets - 200000)
  })

  it('computes each account share of total assets', () => {
    const broker = overview.accounts.find((a) => a.account.id === 'broker')!
    expect(broker.ratio).toBeCloseTo(broker.valueBase / overview.summary.assets)
    const sum = overview.accounts
      .filter((a) => a.account.kind !== 'liability')
      .reduce((s, a) => s + a.ratio, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('groups accounts by kind', () => {
    expect(overview.accountsByKind.cash.map((a) => a.account.id)).toEqual(['cash'])
    expect(overview.accountsByKind.investment.map((a) => a.account.id)).toEqual(['broker'])
  })

  it('exposes holdings with cost, value and gain', () => {
    const accountView = overview.accounts.find((a) => a.account.id === 'broker')!
    const vti = accountView.holdings.find((h) => h.holding.id === 'vti')!
    expect(vti.shares).toBe(10)
    expect(vti.costBase).toBeCloseTo(10 * 200 * 7.2)
    expect(vti.valueBase).toBeCloseTo(10 * 250 * 7.2)
    expect(vti.gainBase).toBeCloseTo(10 * 50 * 7.2)
    expect(vti.gainPct).toBeCloseTo(0.25)
  })

  it('aggregates investment totals', () => {
    expect(overview.investments.cost).toBeCloseTo(10 * 200 * 7.2)
    expect(overview.investments.value).toBeCloseTo(10 * 250 * 7.2)
    expect(overview.investments.gain).toBeCloseTo(10 * 50 * 7.2)
    expect(overview.investments.gainPct).toBeCloseTo(0.25)
  })

  it('includes a trend series ending at the current net worth', () => {
    expect(overview.series.length).toBeGreaterThan(0)
    expect(overview.series.at(-1)!.net).toBeCloseTo(overview.summary.net)
  })

  it('reflects transactions in the current balances', () => {
    const withIncome = buildOverview({
      accounts,
      holdings,
      transactions: [tx({ id: 't1', type: 'income', accountId: 'cash', amount: 5000 })] as Transaction[],
      settings,
    })
    const cash = withIncome.accounts.find((a) => a.account.id === 'cash')!
    expect(cash.nativeValue).toBe(15000)
  })

  it('computes the change over the last 30 days when a past series point exists', () => {
    expect(typeof overview.change30d).toBe('number')
  })
})
