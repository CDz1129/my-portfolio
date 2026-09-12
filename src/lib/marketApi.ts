import type { Market } from '@/domain/types'

const API_BASE: string = import.meta.env.VITE_MARKET_API ?? ''

export interface QuoteResult {
  key: string
  ok: boolean
  market?: string
  symbol?: string
  price?: number
  currency?: string
  name?: string
  previousClose?: number
  error?: string
}

export interface QuoteItem {
  market: Market
  symbol: string
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}${path}?${query}`)
  if (!res.ok) {
    let message = `请求失败 (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export async function getQuotes(items: QuoteItem[]): Promise<QuoteResult[]> {
  if (items.length === 0) return []
  const param = items.map((i) => `${i.market}:${i.symbol}`).join(',')
  const data = await apiGet<{ quotes: QuoteResult[] }>('/api/quotes', { items: param })
  return data.quotes ?? []
}

export async function getRates(base: string): Promise<Record<string, number>> {
  const data = await apiGet<{ rates: Record<string, number> }>('/api/rates', { base })
  return data.rates ?? {}
}

export interface AssetSearchResult {
  market: Market
  symbol: string
  name?: string
  exchange?: string
}

export async function searchAssets(query: string): Promise<AssetSearchResult[]> {
  const data = await apiGet<{ results: AssetSearchResult[] }>('/api/search', { q: query })
  return data.results ?? []
}

export async function checkHealth(): Promise<boolean> {
  try {
    const data = await apiGet<{ ok: boolean }>('/api/health', {})
    return Boolean(data.ok)
  } catch {
    return false
  }
}
