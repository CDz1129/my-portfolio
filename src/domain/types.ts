export type CurrencyCode = string

export type AccountKind = 'cash' | 'investment' | 'fixed' | 'receivable' | 'liability'

export type Market = 'A' | 'HK' | 'US' | 'CRYPTO' | 'CUSTOM'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  currency: CurrencyCode
  openingBalance: number
  openingDate: string
  groupId?: string
  icon?: string
  color?: string
  archived: boolean
  note?: string
  createdAt: number
}

export interface Holding {
  id: string
  accountId: string
  symbol: string
  market: Market
  name?: string
  currency: CurrencyCode
  openingShares: number
  avgCost: number
  price: number
  priceUpdatedAt?: number
}

export interface Group {
  id: string
  name: string
  color?: string
  createdAt: number
}

export type TxType = 'income' | 'expense' | 'transfer' | 'buy' | 'sell' | 'adjust'

export interface Transaction {
  id: string
  type: TxType
  date: string
  accountId: string
  toAccountId?: string
  holdingId?: string
  amount: number
  currency: CurrencyCode
  shares?: number
  price?: number
  note?: string
  createdAt: number
}

export interface Settings {
  id: 'app'
  baseCurrency: CurrencyCode
  theme: 'light' | 'dark' | 'system'
  rates: Record<CurrencyCode, number>
  ratesUpdatedAt?: number
  autoSync?: boolean
  syncIntervalDays?: number
  lastSyncAt?: number
  demoDismissed?: boolean
  demoSeeded?: boolean
}

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  cash: '流动资金',
  investment: '投资',
  fixed: '固定资产',
  receivable: '应收款',
  liability: '负债',
}

export const ACCOUNT_KIND_ORDER: AccountKind[] = [
  'cash',
  'investment',
  'fixed',
  'receivable',
  'liability',
]

export const MARKET_LABEL: Record<Market, string> = {
  A: 'A股',
  HK: '港股',
  US: '美股',
  CRYPTO: '加密货币',
  CUSTOM: '自定义',
}

export const MARKET_CURRENCY: Record<Market, string> = {
  A: 'CNY',
  HK: 'HKD',
  US: 'USD',
  CRYPTO: 'USDT',
  CUSTOM: 'CNY',
}

export const LIABILITY_KINDS: AccountKind[] = ['liability']

export function isLiability(kind: AccountKind): boolean {
  return LIABILITY_KINDS.includes(kind)
}
