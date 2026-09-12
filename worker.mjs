import {
  fetchQuote,
  fetchQuotes,
  parseItemsParam,
  refreshRates,
  searchAssets,
} from './server/market.mjs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS,
    },
  })
}

async function handleApi(url) {
  try {
    if (url.pathname === '/api/health') {
      return json({ ok: true, time: Date.now() })
    }

    if (url.pathname === '/api/quote') {
      const market = url.searchParams.get('market') ?? 'CUSTOM'
      const symbol = url.searchParams.get('symbol')
      if (!symbol) return json({ error: 'symbol is required' }, 400)
      return json(await fetchQuote(market, symbol))
    }

    if (url.pathname === '/api/quotes') {
      const items = parseItemsParam(url.searchParams.get('items'))
      if (items.length === 0) return json({ error: 'items is required' }, 400)
      return json({ quotes: await fetchQuotes(items), updatedAt: Date.now() })
    }

    if (url.pathname === '/api/rates') {
      const base = url.searchParams.get('base') ?? 'CNY'
      return json({ base, rates: await refreshRates(base), updatedAt: Date.now() })
    }

    if (url.pathname === '/api/search') {
      const q = url.searchParams.get('q') ?? ''
      return json({ query: q, results: await searchAssets(q) })
    }

    return json({ error: 'not found' }, 404)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 502)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS })
      }
      return handleApi(url)
    }

    return env.ASSETS.fetch(request)
  },
}
