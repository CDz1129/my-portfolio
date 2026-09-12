import { fetchQuote, fetchQuotes, parseItemsParam, refreshRates, searchAssets } from './market.mjs'

function send(res, status, data) {
  const body = JSON.stringify(data)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

export async function handleApi(req, res) {
  let url
  try {
    url = new URL(req.url, 'http://localhost')
  } catch {
    return send(res, 400, { error: 'bad request' })
  }

  try {
    if (url.pathname === '/api/health') {
      return send(res, 200, { ok: true, time: Date.now() })
    }

    if (url.pathname === '/api/quote') {
      const market = url.searchParams.get('market') ?? 'CUSTOM'
      const symbol = url.searchParams.get('symbol')
      if (!symbol) return send(res, 400, { error: 'symbol is required' })
      const quote = await fetchQuote(market, symbol)
      return send(res, 200, quote)
    }

    if (url.pathname === '/api/quotes') {
      const items = parseItemsParam(url.searchParams.get('items'))
      if (items.length === 0) return send(res, 400, { error: 'items is required' })
      const quotes = await fetchQuotes(items)
      return send(res, 200, { quotes, updatedAt: Date.now() })
    }

    if (url.pathname === '/api/rates') {
      const base = url.searchParams.get('base') ?? 'CNY'
      const rates = await refreshRates(base)
      return send(res, 200, { base, rates, updatedAt: Date.now() })
    }

    if (url.pathname === '/api/search') {
      const q = url.searchParams.get('q') ?? ''
      const results = await searchAssets(q)
      return send(res, 200, { query: q, results })
    }

    return send(res, 404, { error: 'not found' })
  } catch (error) {
    return send(res, 502, { error: error instanceof Error ? error.message : String(error) })
  }
}

export function marketApiPlugin() {
  return {
    name: 'portfolio-market-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        void handleApi(req, res)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        void handleApi(req, res)
      })
    },
  }
}
