import type { AccountKind, LiquidityClass } from '@/domain/types'

export const KIND_COLORS: Record<AccountKind, string> = {
  cash: '#10b981',
  investment: '#6366f1',
  fixed: '#0ea5e9',
  receivable: '#14b8a6',
  liability: '#f43f5e',
}

export const LIQUIDITY_COLORS: Record<LiquidityClass, string> = {
  liquid: '#10b981',
  investment: '#6366f1',
  fixed: '#0ea5e9',
  receivable: '#14b8a6',
}

export const KIND_ICONS: Record<AccountKind, string> = {
  cash: '💵',
  investment: '📈',
  fixed: '🏠',
  receivable: '🤝',
  liability: '💳',
}

export const PALETTE = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#0ea5e9',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
  '#ef4444',
]
