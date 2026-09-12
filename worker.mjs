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
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
}

// Cache successful market responses at the edge to cut upstream calls.
const CACHE_TTL_SECONDS = {
  '/api/quotes': 60,
  '/api/quote': 60,
  '/api/rates': 300,
  '/api/search': 300,
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

function withHeader(res, name, value) {
  const headers = new Headers(res.headers)
  headers.set(name, value)
  return new Response(res.body, { status: res.status, headers })
}

function authorized(request, url, env) {
  if (!env.API_TOKEN) return true
  return (
    request.headers.get('x-api-token') === env.API_TOKEN ||
    url.searchParams.get('token') === env.API_TOKEN
  )
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    if (!authorized(request, url, env)) {
      return json({ error: 'unauthorized' }, 401)
    }

    // Optional native rate limiting (Cloudflare Rate Limiting binding).
    // Fails open so the proxy keeps working if the binding is absent.
    if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
      const key = request.headers.get('CF-Connecting-IP') ?? 'anonymous'
      try {
        const { success } = await env.RATE_LIMITER.limit({ key })
        if (!success) {
          return withHeader(json({ error: 'rate limit exceeded' }, 429), 'Retry-After', '60')
        }
      } catch {
        // limiter unavailable: continue without limiting
      }
    }

    const ttl = CACHE_TTL_SECONDS[url.pathname] ?? 0
    const cache = typeof caches !== 'undefined' ? caches.default : undefined

    if (ttl > 0 && cache) {
      const cacheKey = new Request(url.toString(), { method: 'GET' })
      const hit = await cache.match(cacheKey)
      if (hit) return withHeader(hit, 'X-Cache', 'HIT')

      const res = await handleApi(url)
      if (res.ok) {
        const cacheable = res.clone()
        cacheable.headers.set('Cache-Control', `public, max-age=${ttl}`)
        cacheable.headers.set('X-Cache', 'MISS')
        if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, cacheable))
      }
      return withHeader(res, 'X-Cache', 'MISS')
    }

    return handleApi(url)
  },
}
