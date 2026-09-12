import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { searchAssets, type AssetSearchResult } from '@/lib/marketApi'
import { useT } from '@/i18n'
import { TextInput } from './ui'

export function AssetSearch({ onSelect }: { onSelect: (result: AssetSearchResult) => void }) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AssetSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setOpen(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const found = await searchAssets(q)
        if (!cancelled) {
          setResults(found)
          setOpen(true)
        }
      } catch {
        if (!cancelled) {
          setError(t('search.failed'))
          setResults([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, t])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <TextInput
          aria-label={t('search.aria')}
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
        />
      </div>

      {loading && <p className="mt-1 text-xs text-slate-400">{t('search.searching')}</p>}
      {error && <p className="mt-1 text-xs text-amber-500">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {results.map((result) => (
            <li key={`${result.market}:${result.symbol}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(result)
                  setOpen(false)
                  setQuery('')
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{result.name || result.symbol}</span>
                  <span className="text-[11px] text-slate-400">
                    {result.symbol} · {t(`market.${result.market}`)}
                    {result.exchange ? ` · ${result.exchange}` : ''}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  {result.market}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
