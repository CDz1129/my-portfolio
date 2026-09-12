import type { Account, AccountKind, Holding, Transaction } from './types'
import { ACCOUNT_KIND_ORDER, isLiability } from './types'
import { convert } from './currency'

export interface Portfolio {
  /** accountId -> cash balance in the account's own currency */
  balances: Record<string, number>
  /** holdingId -> number of shares */
  shares: Record<string, number>
}

export function holdingsOfAccount(holdings: Holding[], accountId: string): Holding[] {
  return holdings.filter((h) => h.accountId === accountId)
}

function sortTransactions(txs: Transaction[]): Transaction[] {
  return [...txs].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt,
  )
}

export function computePortfolio(
  accounts: Account[],
  holdings: Holding[],
  txs: Transaction[],
  rates: Record<string, number>,
): Portfolio {
  const balances: Record<string, number> = {}
  for (const a of accounts) balances[a.id] = a.openingBalance

  const shares: Record<string, number> = {}
  for (const h of holdings) shares[h.id] = h.openingShares

  for (const t of sortTransactions(txs)) {
    const account = accounts.find((a) => a.id === t.accountId)
    if (!account) continue

    switch (t.type) {
      case 'income': {
        balances[t.accountId] += convert(t.amount, t.currency, account.currency, rates)
        break
      }
      case 'expense': {
        balances[t.accountId] -= convert(t.amount, t.currency, account.currency, rates)
        break
      }
      case 'transfer': {
        if (!t.toAccountId) break
        const to = accounts.find((a) => a.id === t.toAccountId)
        if (!to) break
        balances[t.accountId] -= convert(t.amount, t.currency, account.currency, rates)
        balances[t.toAccountId] += convert(t.amount, t.currency, to.currency, rates)
        break
      }
      case 'adjust': {
        balances[t.accountId] = convert(t.amount, t.currency, account.currency, rates)
        break
      }
      case 'buy':
      case 'sell': {
        if (!t.holdingId) break
        const holding = holdings.find((h) => h.id === t.holdingId)
        const shareCount = t.shares ?? 0
        const price = t.price ?? 0
        const cost = shareCount * price
        const costCurrency = holding?.currency ?? t.currency
        const cash = convert(cost, costCurrency, account.currency, rates)
        if (t.type === 'buy') {
          balances[t.accountId] -= cash
          shares[t.holdingId] = (shares[t.holdingId] ?? 0) + shareCount
        } else {
          balances[t.accountId] += cash
          shares[t.holdingId] = (shares[t.holdingId] ?? 0) - shareCount
        }
        break
      }
    }
  }

  return { balances, shares }
}

export function holdingMarketValue(
  holding: Holding,
  shares: number,
  rates: Record<string, number>,
  base: string,
): number {
  return convert(shares * holding.price, holding.currency, base, rates)
}

export function accountValueInBase(
  account: Account,
  holdings: Holding[],
  portfolio: Portfolio,
  rates: Record<string, number>,
  base: string,
): number {
  const cash = convert(portfolio.balances[account.id] ?? 0, account.currency, base, rates)
  if (account.kind !== 'investment') return cash

  const invested = holdingsOfAccount(holdings, account.id).reduce(
    (sum, h) => sum + holdingMarketValue(h, portfolio.shares[h.id] ?? 0, rates, base),
    0,
  )
  return cash + invested
}

export interface Summary {
  assets: number
  liabilities: number
  net: number
}

export function summarize(
  accounts: Account[],
  holdings: Holding[],
  portfolio: Portfolio,
  rates: Record<string, number>,
  base: string,
): Summary {
  let assets = 0
  let liabilities = 0
  for (const account of accounts) {
    if (account.archived) continue
    const value = accountValueInBase(account, holdings, portfolio, rates, base)
    if (isLiability(account.kind)) liabilities += value
    else assets += value
  }
  return { assets, liabilities, net: assets - liabilities }
}

export interface AllocationItem {
  kind: AccountKind
  value: number
  ratio: number
}

export function allocationByKind(
  accounts: Account[],
  holdings: Holding[],
  portfolio: Portfolio,
  rates: Record<string, number>,
  base: string,
): AllocationItem[] {
  const totals = new Map<AccountKind, number>()
  let totalAssets = 0

  for (const account of accounts) {
    if (account.archived || isLiability(account.kind)) continue
    const value = accountValueInBase(account, holdings, portfolio, rates, base)
    totals.set(account.kind, (totals.get(account.kind) ?? 0) + value)
    totalAssets += value
  }

  return ACCOUNT_KIND_ORDER.filter((k) => (totals.get(k) ?? 0) > 0).map((kind) => {
    const value = totals.get(kind)!
    return { kind, value, ratio: totalAssets > 0 ? value / totalAssets : 0 }
  })
}

export interface SeriesPoint extends Summary {
  date: string
}

export function netWorthSeries(
  accounts: Account[],
  holdings: Holding[],
  txs: Transaction[],
  rates: Record<string, number>,
  base: string,
  options: { end?: string } = {},
): SeriesPoint[] {
  const end = options.end ?? new Date().toISOString().slice(0, 10)
  const dates = new Set<string>()
  for (const a of accounts) if (a.openingDate <= end) dates.add(a.openingDate)
  for (const t of txs) if (t.date <= end) dates.add(t.date)
  dates.add(end)

  const sorted = [...dates].sort()
  return sorted.map((date) => {
    const portfolio = computePortfolio(
      accounts,
      holdings,
      txs.filter((t) => t.date <= date),
      rates,
    )
    return { date, ...summarize(accounts, holdings, portfolio, rates, base) }
  })
}

export function investmentCost(
  holdings: Holding[],
  shares: Record<string, number>,
  rates: Record<string, number>,
  base: string,
): number {
  return holdings.reduce(
    (sum, h) => sum + convert((shares[h.id] ?? 0) * h.avgCost, h.currency, base, rates),
    0,
  )
}

export function investmentValue(
  holdings: Holding[],
  shares: Record<string, number>,
  rates: Record<string, number>,
  base: string,
): number {
  return holdings.reduce(
    (sum, h) => sum + convert((shares[h.id] ?? 0) * h.price, h.currency, base, rates),
    0,
  )
}
