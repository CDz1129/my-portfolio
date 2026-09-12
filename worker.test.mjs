import { describe, it, expect } from 'vitest'
import worker from './worker.mjs'

const env = {
  ASSETS: { fetch: () => new Response('asset-body') },
}

describe('cloudflare worker', () => {
  it('responds to /api/health without touching external services', async () => {
    const res = await worker.fetch(new Request('https://example.com/api/health'), env)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('returns 404 for unknown api routes', async () => {
    const res = await worker.fetch(new Request('https://example.com/api/nope'), env)
    expect(res.status).toBe(404)
  })

  it('delegates non-api requests to the static assets binding', async () => {
    const res = await worker.fetch(new Request('https://example.com/accounts/123'), env)
    expect(await res.text()).toBe('asset-body')
  })

  it('answers CORS preflight for the api', async () => {
    const res = await worker.fetch(
      new Request('https://example.com/api/quotes', { method: 'OPTIONS' }),
      env,
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
