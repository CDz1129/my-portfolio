import { describe, it, expect } from 'vitest'
import type { Account, Holding, Transaction } from './types'
import {
  computePortfolio,
  accountValueInBase,
  summarize,
  allocationByKind,
  netWorthSeries,
  holdingsOfAccount,
} from './portfolio'

const rates = { CNY: 1, USD: 7.2, HKD: 0.92 }

function account(partial: Partial<Account> & Pick<Account, 'id' | 'kind'>): Account {
  return {
    name: partial.id,
    currency: 'CNY',
    openingBalance: 0,
    openingDate: '2024-01-01',
    archived: false,
    createdAt: 0,
    ...partial,
  }
}

function holding(partial: Partial<Holding> & Pick<Holding, 'id' | 'accountId'>): Holding {
  return {
    symbol: partial.id,
    market: 'US',
    currency: 'USD',
    openingShares: 0,
    avgCost: 0,
    price: 0,
    ...partial,
  }
}

function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'accountId'>): Transaction {
  return {
    date: '2024-01-01',
    amount: 0,
    currency: 'CNY',
    createdAt: 0,
    ...partial,
  }
}

describe('computePortfolio', () => {
  it('starts from opening balances', () => {
    const p = computePortfolio(
      [account({ id: 'a', kind: 'cash', openingBalance: 1000 })],
      [],
      [],
      rates,
    )
    expect(p.balances.a).toBe(1000)
  })

  it('applies income and expense', () => {
    const p = computePortfolio(
      [account({ id: 'a', kind: 'cash', openingBalance: 1000 })],
      [],
      [
        tx({ id: 't1', type: 'income', accountId: 'a', amount: 500, date: '2024-02-01' }),
        tx({ id: 't2', type: 'expense', accountId: 'a', amount: 200, date: '2024-02-02' }),
      ],
      rates,
    )
    expect(p.balances.a).toBe(1300)
  })

  it('converts transaction currency into the account currency', () => {
    const p = computePortfolio(
      [account({ id: 'a', kind: 'cash', currency: 'CNY' })],
      [],
      [tx({ id: 't1', type: 'income', accountId: 'a', amount: 100, currency: 'USD' })],
      rates,
    )
    expect(p.balances.a).toBeCloseTo(720)
  })

  it('moves money on transfer without changing the total', () => {
    const accounts = [
      account({ id: 'a', kind: 'cash', openingBalance: 1000 }),
      account({ id: 'b', kind: 'cash', openingBalance: 0 }),
    ]
    const p = computePortfolio(
      accounts,
      [],
      [tx({ id: 't1', type: 'transfer', accountId: 'a', toAccountId: 'b', amount: 300 })],
      rates,
    )
    expect(p.balances.a).toBe(700)
    expect(p.balances.b).toBe(300)
  })

  it('converts transfer amounts into the destination currency', () => {
    const accounts = [
      account({ id: 'a', kind: 'cash', currency: 'USD', openingBalance: 1000 }),
      account({ id: 'b', kind: 'cash', currency: 'CNY', openingBalance: 0 }),
    ]
    const p = computePortfolio(
      accounts,
      [],
      [tx({ id: 't1', type: 'transfer', accountId: 'a', toAccountId: 'b', amount: 100, currency: 'USD' })],
      rates,
    )
    expect(p.balances.a).toBe(900)
    expect(p.balances.b).toBeCloseTo(720)
  })

  it('sets the balance on adjust regardless of the previous value', () => {
    const p = computePortfolio(
      [account({ id: 'a', kind: 'cash', openingBalance: 1000 })],
      [],
      [tx({ id: 't1', type: 'adjust', accountId: 'a', amount: 1234.56 })],
      rates,
    )
    expect(p.balances.a).toBeCloseTo(1234.56)
  })

  it('converts buy/sell cash flow from holding currency to account currency', () => {
    const accounts = [account({ id: 'a', kind: 'investment', currency: 'CNY', openingBalance: 100000 })]
    const holdings = [holding({ id: 'h1', accountId: 'a', currency: 'USD', price: 100 })]
    const p = computePortfolio(
      accounts,
      holdings,
      [
        tx({
          id: 't1',
          type: 'buy',
          accountId: 'a',
          holdingId: 'h1',
          currency: 'USD',
          shares: 10,
          price: 100,
        }),
      ],
      rates,
    )
    expect(p.shares.h1).toBe(10)
    expect(p.balances.a).toBeCloseTo(100000 - 10 * 100 * 7.2)
  })

  it('applies transactions in chronological order, tie-broken by createdAt', () => {
    const p = computePortfolio(
      [account({ id: 'a', kind: 'cash', openingBalance: 0 })],
      [],
      [
        tx({ id: 'late', type: 'expense', accountId: 'a', amount: 100, date: '2024-03-01', createdAt: 1 }),
        tx({ id: 'early', type: 'income', accountId: 'a', amount: 500, date: '2024-02-01', createdAt: 2 }),
        tx({ id: 'sameDayLater', type: 'expense', accountId: 'a', amount: 50, date: '2024-02-01', createdAt: 3 }),
      ],
      rates,
    )
    expect(p.balances.a).toBeCloseTo(350)
  })
})

describe('accountValueInBase', () => {
  it('converts cash balances into the base currency', () => {
    const accounts = [account({ id: 'a', kind: 'cash', currency: 'USD', openingBalance: 100 })]
    const p = computePortfolio(accounts, [], [], rates)
    expect(accountValueInBase(accounts[0], [], p, rates, 'CNY')).toBeCloseTo(720)
  })

  it('adds holdings market value and account cash for investment accounts', () => {
    const accounts = [account({ id: 'a', kind: 'investment', currency: 'CNY', openingBalance: 1000 })]
    const holdings = [holding({ id: 'h1', accountId: 'a', currency: 'USD', price: 200, openingShares: 5 })]
    const p = computePortfolio(accounts, holdings, [], rates)
    // 1000 CNY cash + 5 * 200 USD * 7.2
    expect(accountValueInBase(accounts[0], holdings, p, rates, 'CNY')).toBeCloseTo(1000 + 5 * 200 * 7.2)
  })
})

describe('summarize', () => {
  it('computes assets, liabilities and net worth in base currency', () => {
    const accounts = [
      account({ id: 'cash', kind: 'cash', openingBalance: 10000 }),
      account({ id: 'stock', kind: 'investment', currency: 'USD', openingBalance: 1000 }),
      account({ id: 'loan', kind: 'liability', openingBalance: 30000 }),
    ]
    const p = computePortfolio(accounts, [], [], rates)
    const s = summarize(accounts, [], p, rates, 'CNY')
    expect(s.assets).toBeCloseTo(10000 + 1000 * 7.2)
    expect(s.liabilities).toBeCloseTo(30000)
    expect(s.net).toBeCloseTo(10000 + 1000 * 7.2 - 30000)
  })

  it('ignores archived accounts', () => {
    const accounts = [
      account({ id: 'cash', kind: 'cash', openingBalance: 10000 }),
      account({ id: 'old', kind: 'cash', openingBalance: 99999, archived: true }),
    ]
    const p = computePortfolio(accounts, [], [], rates)
    expect(summarize(accounts, [], p, rates, 'CNY').assets).toBe(10000)
  })
})

describe('allocationByKind', () => {
  it('groups positive asset kinds and computes ratios over total assets', () => {
    const accounts = [
      account({ id: 'cash', kind: 'cash', openingBalance: 300 }),
      account({ id: 'stock', kind: 'investment', openingBalance: 700 }),
      account({ id: 'loan', kind: 'liability', openingBalance: 500 }),
    ]
    const p = computePortfolio(accounts, [], [], rates)
    const items = allocationByKind(accounts, [], p, rates, 'CNY')
    const cash = items.find((i) => i.kind === 'cash')!
    expect(cash.value).toBe(300)
    expect(cash.ratio).toBeCloseTo(0.3)
    expect(items.find((i) => i.kind === 'investment')!.ratio).toBeCloseTo(0.7)
    expect(items.find((i) => i.kind === 'liability')).toBeUndefined()
  })
})

describe('netWorthSeries', () => {
  it('produces one point per event date plus the end date', () => {
    const accounts = [account({ id: 'a', kind: 'cash', openingBalance: 1000 })]
    const txs = [
      tx({ id: 't1', type: 'income', accountId: 'a', amount: 500, date: '2024-02-01' }),
      tx({ id: 't2', type: 'expense', accountId: 'a', amount: 200, date: '2024-03-01' }),
    ]
    const series = netWorthSeries(accounts, [], txs, rates, 'CNY', { end: '2024-04-01' })
    expect(series.map((p) => p.date)).toEqual(['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01'])
    expect(series[0].net).toBe(1000)
    expect(series[1].net).toBe(1500)
    expect(series[2].net).toBe(1300)
    expect(series[3].net).toBe(1300)
    expect(series.at(-1)!.net).toBe(summarize(accounts, [], computePortfolio(accounts, [], txs, rates), rates, 'CNY').net)
  })

  it('keeps net worth unchanged across a transfer', () => {
    const accounts = [
      account({ id: 'a', kind: 'cash', openingBalance: 1000 }),
      account({ id: 'b', kind: 'cash', openingBalance: 0 }),
    ]
    const series = netWorthSeries(
      accounts,
      [],
      [tx({ id: 't1', type: 'transfer', accountId: 'a', toAccountId: 'b', amount: 400, date: '2024-02-01' })],
      rates,
      'CNY',
      { end: '2024-03-01' },
    )
    expect(series.every((p) => Math.abs(p.net - 1000) < 1e-9)).toBe(true)
  })
})

describe('holdingsOfAccount', () => {
  it('filters holdings by account', () => {
    const holdings = [
      holding({ id: 'h1', accountId: 'a' }),
      holding({ id: 'h2', accountId: 'b' }),
    ]
    expect(holdingsOfAccount(holdings, 'a').map((h) => h.id)).toEqual(['h1'])
  })
})
