import type {
  Account,
  AccountKind,
  Holding,
  Settings,
  Transaction,
} from './types'
import { ACCOUNT_KIND_ORDER, isLiability } from './types'
import { convert } from './currency'
import {
  accountValueInBase,
  allocationByKind,
  allocationByLiquidity,
  computePortfolio,
  holdingsOfAccount,
  netWorthSeries,
  summarize,
  type AllocationItem,
  type LiquidityItem,
  type Portfolio,
  type SeriesPoint,
  type Summary,
} from './portfolio'

export interface HoldingView {
  holding: Holding
  shares: number
  valueBase: number
  costBase: number
  gainBase: number
  gainPct: number
}

export interface AccountView {
  account: Account
  valueBase: number
  nativeValue: number
  ratio: number
  holdings: HoldingView[]
}

export interface InvestmentTotals {
  value: number
  cost: number
  gain: number
  gainPct: number
}

export interface Overview {
  baseCurrency: string
  portfolio: Portfolio
  summary: Summary
  allocation: AllocationItem[]
  liquidity: LiquidityItem[]
  accounts: AccountView[]
  accountsByKind: Record<AccountKind, AccountView[]>
  series: SeriesPoint[]
  investments: InvestmentTotals
  change30d: number
}

export interface OverviewInput {
  accounts: Account[]
  holdings: Holding[]
  transactions: Transaction[]
  settings: Settings
}

function nativeValueOf(
  account: Account,
  holdings: Holding[],
  portfolio: Portfolio,
  rates: Record<string, number>,
): number {
  const cash = portfolio.balances[account.id] ?? 0
  if (account.kind !== 'investment') return cash
  const invested = holdingsOfAccount(holdings, account.id).reduce(
    (sum, h) =>
      sum +
      convert(
        (portfolio.shares[h.id] ?? 0) * h.price,
        h.currency,
        account.currency,
        rates,
      ),
    0,
  )
  return cash + invested
}

function daysBefore(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export function buildOverview(input: OverviewInput): Overview {
  const { accounts, holdings, transactions, settings } = input
  const base = settings.baseCurrency
  const rates = settings.rates

  const portfolio = computePortfolio(accounts, holdings, transactions, rates)
  const summary = summarize(accounts, holdings, portfolio, rates, base)
  const allocation = allocationByKind(accounts, holdings, portfolio, rates, base)
  const liquidity = allocationByLiquidity(accounts, holdings, portfolio, rates, base)
  const series = netWorthSeries(accounts, holdings, transactions, rates, base)

  const accountsByKind = ACCOUNT_KIND_ORDER.reduce(
    (acc, kind) => {
      acc[kind] = []
      return acc
    },
    {} as Record<AccountKind, AccountView[]>,
  )

  const accountViews: AccountView[] = accounts.map((account) => {
    const valueBase = accountValueInBase(account, holdings, portfolio, rates, base)
    const holdingViews: HoldingView[] = holdingsOfAccount(holdings, account.id).map((h) => {
      const shares = portfolio.shares[h.id] ?? 0
      const value = convert(shares * h.price, h.currency, base, rates)
      const cost = convert(shares * h.avgCost, h.currency, base, rates)
      const gain = value - cost
      return {
        holding: h,
        shares,
        valueBase: value,
        costBase: cost,
        gainBase: gain,
        gainPct: cost > 0 ? gain / cost : 0,
      }
    })
    return {
      account,
      valueBase,
      nativeValue: nativeValueOf(account, holdings, portfolio, rates),
      ratio: summary.assets > 0 ? valueBase / summary.assets : 0,
      holdings: holdingViews,
    }
  })

  for (const view of accountViews) {
    accountsByKind[view.account.kind].push(view)
  }
  for (const kind of ACCOUNT_KIND_ORDER) {
    accountsByKind[kind].sort((a, b) => b.valueBase - a.valueBase)
  }

  const investmentTotals: InvestmentTotals = accountViews
    .flatMap((a) => a.holdings)
    .reduce(
      (acc, h) => ({
        value: acc.value + h.valueBase,
        cost: acc.cost + h.costBase,
        gain: acc.gain + h.gainBase,
        gainPct: 0,
      }),
      { value: 0, cost: 0, gain: 0, gainPct: 0 },
    )
  investmentTotals.gainPct =
    investmentTotals.cost > 0 ? investmentTotals.gain / investmentTotals.cost : 0

  const last = series.at(-1)
  const target = last ? daysBefore(last.date, 30) : ''
  const prior = [...series].reverse().find((p) => p.date <= target) ?? series[0]
  const change30d = last && prior ? last.net - prior.net : 0

  return {
    baseCurrency: base,
    portfolio,
    summary,
    allocation,
    liquidity,
    accounts: accountViews,
    accountsByKind,
    series,
    investments: investmentTotals,
    change30d,
  }
}

export function kindAwareRatio(view: AccountView, totalAssets: number): number {
  if (isLiability(view.account.kind)) return totalAssets > 0 ? view.valueBase / totalAssets : 0
  return view.ratio
}
