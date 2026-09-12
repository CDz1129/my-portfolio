const YAHOO_HOST = 'https://query1.finance.yahoo.com'
const FX_HOST = 'https://open.er-api.com/v6/latest'

function upper(value) {
  return String(value ?? '').trim().toUpperCase()
}

export function yahooSymbol(market, symbol) {
  const raw = upper(symbol)
  if (!raw) throw new Error('symbol is required')
  switch (market) {
    case 'A': {
      if (/\.(SS|SZ|BJ)$/.test(raw)) return raw
      if (/^(6|5|9)/.test(raw)) return `${raw}.SS`
      if (/^(4|8)/.test(raw)) return `${raw}.BJ`
      return `${raw}.SZ`
    }
    case 'HK': {
      const code = raw.replace(/\.HK$/, '').replace(/^0+/, '')
      return `${code.padStart(4, '0')}.HK`
    }
    case 'CRYPTO': {
      if (raw.includes('-')) return raw
      return `${raw}-USD`
    }
    case 'US':
    case 'CUSTOM':
    default:
      return raw
  }
}

export function parseYahooChart(json) {
  const error = json?.chart?.error
  if (error) throw new Error(error.description || error.code || 'Yahoo error')
  const result = json?.chart?.result
  if (!Array.isArray(result) || result.length === 0) {
    throw new Error('No data found for symbol')
  }
  const meta = result[0]?.meta ?? {}
  const price = meta.regularMarketPrice
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error('No price data for symbol')
  }
  return {
    symbol: meta.symbol,
    price,
    previousClose:
      typeof meta.previousClose === 'number' && Number.isFinite(meta.previousClose)
        ? meta.previousClose
        : undefined,
    currency: meta.currency,
    name: meta.longName || meta.shortName || undefined,
  }
}

export function parseTencentQuote(text) {
  const match = String(text).match(/"([^"]*)"/)
  if (!match) throw new Error('No Tencent quote data')
  const fields = match[1].split('~')
  const price = Number(fields[3])
  if (!Number.isFinite(price) || price <= 0) throw new Error('No Tencent price data')
  return {
    name: fields[1] || undefined,
    code: fields[2] || undefined,
    price,
    previousClose: Number(fields[4]) || undefined,
  }
}

export function tencentSymbol(market, symbol) {
  const raw = upper(symbol)
  if (!raw) return null
  switch (market) {
    case 'A': {
      const code = raw.replace(/\.(SS|SZ|BJ)$/, '')
      if (/^(6|5|9)/.test(code)) return `sh${code}`
      if (/^(4|8)/.test(code)) return `bj${code}`
      return `sz${code}`
    }
    case 'HK': {
      const code = raw.replace(/\.HK$/, '')
      return `hk${code.padStart(5, '0')}`
    }
    case 'US':
      return `us${raw}`
    default:
      return null
  }
}

export function okxInstId(symbol) {
  const raw = upper(symbol)
  if (!raw) return null
  const base = raw.split('-')[0]
  return `${base}-USDT`
}

export function parseOkxTicker(json) {
  const price = Number(json?.data?.[0]?.last)
  if (!Number.isFinite(price) || price <= 0) throw new Error('No OKX price data')
  return { price }
}

export function invertApiRates(base, apiRates) {
  const out = { [base]: 1 }
  for (const [code, value] of Object.entries(apiRates ?? {})) {
    if (code === base) continue
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    out[code] = 1 / value
  }
  return out
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  return undefined
}

export async function fetchYahooQuote(market, symbol, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const mapped = yahooSymbol(market, symbol)
  const url = `${YAHOO_HOST}/v8/finance/chart/${encodeURIComponent(mapped)}?interval=1d&range=5d`
  const res = await fetchImpl(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Portfolio/0.1',
      Accept: 'application/json',
    },
    signal: timeoutSignal(timeoutMs),
  })
  if (!res.ok) {
    const body = typeof res.text === 'function' ? await res.text().catch(() => '') : ''
    throw new Error(`Yahoo ${res.status} ${res.statusText ?? ''} ${body ?? ''}`.trim())
  }
  const json = await res.json()
  const parsed = parseYahooChart(json)
  return { ...parsed, market, requestedSymbol: symbol, source: 'yahoo' }
}

const TENCENT_HOST = 'https://qt.gtimg.cn/q='
const TENCENT_CURRENCY = { A: 'CNY', HK: 'HKD', US: 'USD' }

/**
 * Tencent endpoints return GBK. Some runtimes (e.g. Cloudflare Workers) only
 * guarantee UTF-8 for TextDecoder, so fall back gracefully instead of crashing.
 */
function decodeGbk(buffer) {
  try {
    return new TextDecoder('gbk').decode(buffer)
  } catch {
    return new TextDecoder('utf-8').decode(buffer)
  }
}

export async function fetchTencentQuote(market, symbol, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const mapped = tencentSymbol(market, symbol)
  if (!mapped) throw new Error(`Tencent does not support market ${market}`)
  const res = await fetchImpl(`${TENCENT_HOST}${mapped}`, {
    headers: { Referer: 'https://finance.qq.com', Accept: '*/*' },
    signal: timeoutSignal(timeoutMs),
  })
  if (!res.ok) throw new Error(`Tencent ${res.status} ${res.statusText ?? ''}`.trim())
  const buffer = await res.arrayBuffer()
  const text = decodeGbk(buffer)
  const parsed = parseTencentQuote(text)
  return {
    symbol: parsed.code ?? mapped,
    price: parsed.price,
    previousClose: parsed.previousClose,
    currency: TENCENT_CURRENCY[market],
    name: parsed.name,
    market,
    requestedSymbol: symbol,
    source: 'tencent',
  }
}

const OKX_HOST = 'https://www.okx.com/api/v5/market/ticker?instId='

export async function fetchOkxQuote(symbol, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const instId = okxInstId(symbol)
  const res = await fetchImpl(`${OKX_HOST}${encodeURIComponent(instId)}`, {
    signal: timeoutSignal(timeoutMs),
  })
  if (!res.ok) throw new Error(`OKX ${res.status} ${res.statusText ?? ''}`.trim())
  const json = await res.json()
  const parsed = parseOkxTicker(json)
  return {
    symbol: instId,
    price: parsed.price,
    currency: 'USD',
    market: 'CRYPTO',
    requestedSymbol: symbol,
    source: 'okx',
  }
}

export async function fetchQuote(market, symbol, options = {}) {
  try {
    return await fetchYahooQuote(market, symbol, options)
  } catch (yahooError) {
    try {
      if (market === 'CRYPTO') return await fetchOkxQuote(symbol, options)
      return await fetchTencentQuote(market, symbol, options)
    } catch {
      throw yahooError
    }
  }
}

export async function fetchFiatRates(base, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const url = `${FX_HOST}/${encodeURIComponent(base)}`
  const res = await fetchImpl(url, { signal: timeoutSignal(timeoutMs) })
  if (!res.ok) throw new Error(`FX ${res.status} ${res.statusText ?? ''}`.trim())
  const json = await res.json()
  if (json?.result !== 'success' || !json.rates) {
    throw new Error(`FX failed for ${base}: ${json?.['error-type'] ?? 'unknown'}`)
  }
  return invertApiRates(base, json.rates)
}

export async function fetchCryptoRatesInBase(
  baseRates,
  { fetchImpl = fetch, coins = ['BTC', 'ETH', 'USDT'] } = {},
) {
  const usd = baseRates?.USD
  if (!usd) return {}
  const out = {}
  for (const coin of coins) {
    try {
      const quote = await fetchQuote('CRYPTO', coin, { fetchImpl })
      if (typeof quote.price === 'number' && quote.price > 0) {
        out[coin] = quote.price * usd
      }
    } catch {
      // ignore individual coin failures
    }
  }
  return out
}

export async function refreshRates(base, options = {}) {
  const fiat = await fetchFiatRates(base, options)
  const crypto = await fetchCryptoRatesInBase(fiat, options)
  return { ...fiat, ...crypto, [base]: 1 }
}

function decodeUnicodeEscapes(value) {
  return String(value).replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
}

export function mapYahooSymbolToMarket(symbol, quoteType, exchange) {
  const s = upper(symbol)
  if (quoteType === 'CRYPTOCURRENCY' || /-USD$/.test(s)) {
    return { market: 'CRYPTO', symbol: s.replace(/-USD$/, '') }
  }
  if (/\.(SS|SZ|BJ)$/.test(s)) return { market: 'A', symbol: s.replace(/\.(SS|SZ|BJ)$/, '') }
  if (/\.HK$/.test(s)) return { market: 'HK', symbol: s.replace(/\.HK$/, '') }
  void exchange
  return { market: 'US', symbol: s }
}

export function parseTencentSearch(text) {
  const match = String(text).match(/"([^"]*)"/)
  if (!match || !match[1]) return []
  return match[1]
    .split('^')
    .map((entry) => entry.split('~'))
    .filter((fields) => fields.length >= 3 && fields[0] && fields[1])
    .filter((fields) => fields[4] !== 'QZ' && fields[4] !== 'ZS')
    .map(([prefix, code, name]) => {
      const p = prefix.toLowerCase()
      const decoded = decodeUnicodeEscapes(name).trim()
      if (p === 'hk') return { market: 'HK', symbol: code, name: decoded, exchange: 'hk' }
      if (p === 'us') {
        return { market: 'US', symbol: code.split('.')[0].toUpperCase(), name: decoded, exchange: 'us' }
      }
      if (p === 'sh' || p === 'sz' || p === 'bj') {
        return { market: 'A', symbol: code, name: decoded, exchange: p }
      }
      return null
    })
    .filter(Boolean)
}

export function parseYahooSearch(json) {
  const quotes = json?.quotes
  if (!Array.isArray(quotes)) return []
  const allowed = new Set(['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'MUTUALFUND'])
  return quotes
    .filter((q) => q?.symbol && allowed.has(q.quoteType))
    .map((q) => {
      const mapped = mapYahooSymbolToMarket(q.symbol, q.quoteType, q.exchange)
      return {
        ...mapped,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange,
      }
    })
}

async function readBody(res) {
  if (typeof res.arrayBuffer === 'function') {
    return decodeGbk(await res.arrayBuffer())
  }
  if (typeof res.text === 'function') return res.text()
  return ''
}

export async function fetchTencentSearch(query, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const url = `https://smartbox.gtimg.cn/s3/?v=2&t=all&q=${encodeURIComponent(query)}`
  const res = await fetchImpl(url, {
    headers: { Referer: 'https://finance.qq.com', Accept: '*/*' },
    signal: timeoutSignal(timeoutMs),
  })
  if (!res.ok) throw new Error(`Tencent search ${res.status}`)
  return parseTencentSearch(await readBody(res))
}

export async function fetchYahooSearch(query, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const url = `${YAHOO_HOST}/v1/finance/search?q=${encodeURIComponent(
    query,
  )}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`
  const res = await fetchImpl(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Portfolio/0.1',
      Accept: 'application/json',
    },
    signal: timeoutSignal(timeoutMs),
  })
  if (!res.ok) throw new Error(`Yahoo search ${res.status}`)
  return parseYahooSearch(await res.json())
}

export async function searchAssets(query, options = {}) {
  const q = String(query ?? '').trim()
  if (!q) return []
  const [tencent, yahoo] = await Promise.all([
    fetchTencentSearch(q, options).catch(() => []),
    fetchYahooSearch(q, options).catch(() => []),
  ])
  const seen = new Set()
  const merged = []
  for (const result of [...tencent, ...yahoo]) {
    const key = `${result.market}:${result.symbol}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(result)
  }
  return merged.slice(0, 15)
}

export function quoteKey(market, symbol) {
  return `${market}:${symbol}`
}

export function parseItemsParam(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const idx = item.indexOf(':')
      if (idx < 0) return { market: 'CUSTOM', symbol: item }
      return { market: item.slice(0, idx), symbol: item.slice(idx + 1) }
    })
}

export async function fetchQuotes(items, options = {}) {
  const results = await Promise.all(
    items.map(async ({ market, symbol }) => {
      try {
        const quote = await fetchQuote(market, symbol, options)
        return { key: quoteKey(market, symbol), ok: true, ...quote }
      } catch (error) {
        return {
          key: quoteKey(market, symbol),
          ok: false,
          market,
          symbol,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }),
  )
  return results
}
