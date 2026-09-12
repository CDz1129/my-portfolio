import { describe, it, expect, vi } from 'vitest'
import {
  yahooSymbol,
  tencentSymbol,
  parseYahooChart,
  parseTencentQuote,
  parseTencentSearch,
  parseYahooSearch,
  mapYahooSymbolToMarket,
  searchAssets,
  okxInstId,
  parseOkxTicker,
  invertApiRates,
  fetchQuote,
  fetchFiatRates,
  quoteKey,
  parseItemsParam,
} from './market.mjs'

const chartOk = {
  chart: {
    result: [
      {
        meta: {
          symbol: 'AAPL',
          regularMarketPrice: 225.5,
          previousClose: 220,
          currency: 'USD',
          longName: 'Apple Inc.',
        },
      },
    ],
    error: null,
  },
}

describe('yahooSymbol', () => {
  it('maps US tickers to upper case', () => {
    expect(yahooSymbol('US', 'aapl')).toBe('AAPL')
  })

  it('maps Shanghai and Shenzhen A-shares', () => {
    expect(yahooSymbol('A', '600519')).toBe('600519.SS')
    expect(yahooSymbol('A', '510300')).toBe('510300.SS')
    expect(yahooSymbol('A', '000001')).toBe('000001.SZ')
    expect(yahooSymbol('A', '300750')).toBe('300750.SZ')
  })

  it('keeps an explicit exchange suffix for A-shares', () => {
    expect(yahooSymbol('A', '600519.SS')).toBe('600519.SS')
  })

  it('pads Hong Kong codes to four digits', () => {
    expect(yahooSymbol('HK', '700')).toBe('0700.HK')
    expect(yahooSymbol('HK', '0700.HK')).toBe('0700.HK')
  })

  it('maps crypto to a USD pair', () => {
    expect(yahooSymbol('CRYPTO', 'btc')).toBe('BTC-USD')
    expect(yahooSymbol('CRYPTO', 'BTC-USD')).toBe('BTC-USD')
  })
})

describe('parseYahooChart', () => {
  it('extracts the market price and metadata', () => {
    expect(parseYahooChart(chartOk)).toEqual({
      symbol: 'AAPL',
      price: 225.5,
      previousClose: 220,
      currency: 'USD',
      name: 'Apple Inc.',
    })
  })

  it('throws when Yahoo reports an error', () => {
    expect(() =>
      parseYahooChart({
        chart: { result: null, error: { code: 'Not Found', description: 'No data found' } },
      }),
    ).toThrow(/No data|Not Found/)
  })

  it('throws when there is no result', () => {
    expect(() => parseYahooChart({ chart: { result: [], error: null } })).toThrow()
  })
})

describe('invertApiRates', () => {
  it('turns "1 base = X" into "1 X = ? base"', () => {
    const rates = invertApiRates('CNY', { USD: 0.1388, HKD: 0.1087 })
    expect(rates.CNY).toBe(1)
    expect(rates.USD).toBeCloseTo(1 / 0.1388, 6)
    expect(rates.HKD).toBeCloseTo(1 / 0.1087, 6)
  })

  it('ignores non-positive or non-numeric entries', () => {
    const rates = invertApiRates('CNY', { USD: 0.1, BAD: 0, WORSE: 'x' })
    expect(rates.BAD).toBeUndefined()
    expect(rates.WORSE).toBeUndefined()
    expect(rates.USD).toBeCloseTo(10)
  })
})

describe('tencentSymbol', () => {
  it('maps A-shares to sh/sz/bj prefixes', () => {
    expect(tencentSymbol('A', '600519')).toBe('sh600519')
    expect(tencentSymbol('A', '000001')).toBe('sz000001')
    expect(tencentSymbol('A', '300750')).toBe('sz300750')
    expect(tencentSymbol('A', '830799')).toBe('bj830799')
  })

  it('maps Hong Kong codes to five digits', () => {
    expect(tencentSymbol('HK', '700')).toBe('hk00700')
  })

  it('maps US tickers with a us prefix', () => {
    expect(tencentSymbol('US', 'aapl')).toBe('usAAPL')
  })

  it('returns null for unsupported markets', () => {
    expect(tencentSymbol('CRYPTO', 'BTC')).toBeNull()
  })
})

describe('parseTencentQuote', () => {
  it('extracts name, price and previous close', () => {
    const body = 'v_sh600519="1~贵州茅台~600519~1275.16~1285.13~1285.15~";'
    const parsed = parseTencentQuote(body)
    expect(parsed.price).toBe(1275.16)
    expect(parsed.previousClose).toBe(1285.13)
    expect(parsed.code).toBe('600519')
  })

  it('throws when the price is missing or zero', () => {
    expect(() => parseTencentQuote('v_sh600519="";')).toThrow()
    expect(() => parseTencentQuote('v_sh600519="1~x~600519~0.00~0.00~";')).toThrow()
  })
})

describe('fetchQuote', () => {
  it('requests the mapped Yahoo symbol and parses the quote', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => chartOk,
      text: async () => '',
      url,
    }))
    const quote = await fetchQuote('US', 'aapl', { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('AAPL')
    expect(quote.price).toBe(225.5)
    expect(quote.market).toBe('US')
    expect(quote.source).toBe('yahoo')
  })

  it('falls back to Tencent when Yahoo fails', async () => {
    const tencentBody = 'v_usAAPL="1~Apple~AAPL~225.5~220.0~221.0~";'
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => ({}),
        text: async () => 'nope',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => Buffer.from(tencentBody, 'utf8'),
      })
    const quote = await fetchQuote('US', 'AAPL', { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(String(fetchImpl.mock.calls[1][0])).toContain('qt.gtimg.cn')
    expect(quote.source).toBe('tencent')
    expect(quote.price).toBe(225.5)
    expect(quote.previousClose).toBe(220)
  })

  it('throws a helpful error on a non-ok response', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: false,
      status: 429,
      json: async () => ({}),
      text: async () => 'Too Many Requests',
      url,
    }))
    await expect(fetchQuote('US', 'AAPL', { fetchImpl })).rejects.toThrow(/429/)
  })

  it('falls back to OKX for crypto when Yahoo fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502, text: async () => 'x' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ last: '68000.5' }] }),
      })
    const quote = await fetchQuote('CRYPTO', 'BTC', { fetchImpl })
    expect(String(fetchImpl.mock.calls[1][0])).toContain('okx.com')
    expect(quote.source).toBe('okx')
    expect(quote.price).toBe(68000.5)
  })
})

describe('okx helpers', () => {
  it('maps a coin to a USDT instrument id', () => {
    expect(okxInstId('btc')).toBe('BTC-USDT')
    expect(okxInstId('BTC-USD')).toBe('BTC-USDT')
  })

  it('parses the ticker last price', () => {
    expect(parseOkxTicker({ data: [{ last: '68000.5' }] }).price).toBe(68000.5)
    expect(() => parseOkxTicker({ data: [] })).toThrow()
  })
})

describe('fetchFiatRates', () => {
  it('fetches rates for the base and inverts them', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => ({ result: 'success', rates: { USD: 0.1388, HKD: 0.1087 } }),
      text: async () => '',
      url,
    }))
    const rates = await fetchFiatRates('CNY', { fetchImpl })
    expect(rates.CNY).toBe(1)
    expect(rates.USD).toBeCloseTo(1 / 0.1388, 6)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('CNY')
  })

  it('throws when the API result is not successful', async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => ({ result: 'error', 'error-type': 'unsupported-code' }),
      text: async () => '',
      url,
    }))
    await expect(fetchFiatRates('XYZ', { fetchImpl })).rejects.toThrow(/XYZ|unsupported/)
  })
})

describe('quoteKey / parseItemsParam', () => {
  it('round-trips a list of market:symbol items', () => {
    expect(quoteKey('US', 'AAPL')).toBe('US:AAPL')
    expect(parseItemsParam('US:AAPL,CRYPTO:BTC,A:600519')).toEqual([
      { market: 'US', symbol: 'AAPL' },
      { market: 'CRYPTO', symbol: 'BTC' },
      { market: 'A', symbol: '600519' },
    ])
  })

  it('returns an empty array for missing input', () => {
    expect(parseItemsParam(undefined)).toEqual([])
    expect(parseItemsParam('')).toEqual([])
  })
})

describe('parseTencentSearch', () => {
  it('parses and decodes \\u escaped results for A/HK/US', () => {
    const body =
      'v_hint="sh~600519~\\u8d35\\u5dde\\u8305\\u53f0~gzmt~GP-A^hk~00700~\\u817e\\u8baf\\u63a7\\u80a1~txkg~GP^us~aapl.oq~\\u82f9\\u679c~pg~GP";'
    expect(parseTencentSearch(body)).toEqual([
      { market: 'A', symbol: '600519', name: '贵州茅台', exchange: 'sh' },
      { market: 'HK', symbol: '00700', name: '腾讯控股', exchange: 'hk' },
      { market: 'US', symbol: 'AAPL', name: '苹果', exchange: 'us' },
    ])
  })

  it('filters out warrants (QZ)', () => {
    const body =
      'v_hint="hk~13005~\\u817e\\u8baf\\u6cd5\\u5174\\u4e03\\u4e09\\u8d2dA~txfxqsga~QZ^hk~00700~\\u817e\\u8baf\\u63a7\\u80a1~txkg~GP";'
    expect(parseTencentSearch(body).map((r) => r.symbol)).toEqual(['00700'])
  })

  it('returns [] for empty or malformed input', () => {
    expect(parseTencentSearch('v_hint="";')).toEqual([])
    expect(parseTencentSearch('')).toEqual([])
    expect(parseTencentSearch('garbage')).toEqual([])
  })
})

describe('mapYahooSymbolToMarket', () => {
  it('classifies A/HK/US/crypto symbols', () => {
    expect(mapYahooSymbolToMarket('600519.SS', 'EQUITY', 'SHH')).toEqual({
      market: 'A',
      symbol: '600519',
    })
    expect(mapYahooSymbolToMarket('0700.HK', 'EQUITY', 'HKG')).toEqual({
      market: 'HK',
      symbol: '0700',
    })
    expect(mapYahooSymbolToMarket('AAPL', 'EQUITY', 'NMS')).toEqual({
      market: 'US',
      symbol: 'AAPL',
    })
    expect(mapYahooSymbolToMarket('BTC-USD', 'CRYPTOCURRENCY', 'CCC')).toEqual({
      market: 'CRYPTO',
      symbol: 'BTC',
    })
  })
})

describe('parseYahooSearch', () => {
  it('maps supported quote types', () => {
    const json = {
      quotes: [
        { symbol: '600519.SS', shortname: '贵州茅台', quoteType: 'EQUITY', exchDisp: '上海' },
        { symbol: 'BTC-USD', shortname: 'Bitcoin USD', quoteType: 'CRYPTOCURRENCY', exchDisp: 'CCC' },
        { symbol: '^GSPC', quoteType: 'INDEX', shortname: 'S&P 500' },
      ],
    }
    expect(parseYahooSearch(json)).toEqual([
      { market: 'A', symbol: '600519', name: '贵州茅台', exchange: '上海' },
      { market: 'CRYPTO', symbol: 'BTC', name: 'Bitcoin USD', exchange: 'CCC' },
    ])
  })
})

describe('searchAssets', () => {
  it('merges Tencent and Yahoo results without duplicates', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('smartbox')) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () =>
            Buffer.from('v_hint="us~aapl.oq~\\u82f9\\u679c~pg~GP";', 'utf8'),
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          quotes: [
            { symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY', exchDisp: 'NASDAQ' },
            { symbol: 'BTC-USD', shortname: 'Bitcoin USD', quoteType: 'CRYPTOCURRENCY', exchDisp: 'CCC' },
          ],
        }),
      }
    })
    const results = await searchAssets('apple', { fetchImpl })
    expect(results.map((r) => `${r.market}:${r.symbol}`)).toEqual(['US:AAPL', 'CRYPTO:BTC'])
    expect(results[0].name).toBe('苹果')
  })

  it('returns [] when both sources fail', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => '',
      arrayBuffer: async () => Buffer.from(''),
    }))
    expect(await searchAssets('zzz', { fetchImpl })).toEqual([])
  })

  it('returns [] for an empty query', async () => {
    const fetchImpl = vi.fn()
    expect(await searchAssets('   ', { fetchImpl })).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('search refinements', () => {
  it('normalizes five-digit Hong Kong codes for Yahoo', () => {
    expect(yahooSymbol('HK', '00700')).toBe('0700.HK')
    expect(yahooSymbol('HK', '0700.HK')).toBe('0700.HK')
  })

  it('filters out indices (ZS) from Tencent search', () => {
    const body =
      'v_hint="sh~000847~\\u817e\\u8baf\\u6d4e\\u5b89~txja~ZS^hk~00700~\\u817e\\u8baf\\u63a7\\u80a1~txkg~GP";'
    expect(parseTencentSearch(body).map((r) => r.symbol)).toEqual(['00700'])
  })
})
