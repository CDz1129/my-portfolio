import { useState } from 'react'
import { usePortfolioData } from '@/store/usePortfolio'
import { formatMoney, formatPercent } from '@/domain/currency'
import { useT } from '@/i18n'
import { NetWorthChart } from '@/components/Charts'
import { Card, Segmented } from '@/components/ui'
import { KIND_COLORS } from '@/lib/kindColors'
import { cn } from '@/lib/cn'

type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL'

const RANGES: { value: Range; key: string; days: number | null }[] = [
  { value: '1M', key: 'trends.range.1M', days: 30 },
  { value: '3M', key: 'trends.range.3M', days: 90 },
  { value: '6M', key: 'trends.range.6M', days: 180 },
  { value: '1Y', key: 'trends.range.1Y', days: 365 },
  { value: 'ALL', key: 'trends.range.ALL', days: null },
]

function cutoff(range: Range): string {
  const days = RANGES.find((r) => r.value === range)?.days
  if (!days) return '0000-00-00'
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function Trends() {
  const { overview } = usePortfolioData()
  const { t } = useT()
  const base = overview.baseCurrency
  const [range, setRange] = useState<Range>('3M')

  const min = cutoff(range)
  const points = overview.series.filter((p) => p.date >= min)
  const first = points[0] ?? overview.series[0]
  const last = points.at(-1) ?? overview.series.at(-1)
  const change = first && last ? last.net - first.net : 0
  const changePct = first && first.net !== 0 ? change / Math.abs(first.net) : 0
  const positive = change >= 0

  return (
    <div>
      <header className="safe-top px-4 pb-3 pt-6">
        <h1 className="text-xl font-bold">{t('trends.title')}</h1>
        <p className="mt-0.5 text-xs text-slate-400">{t('trends.subtitle')}</p>
      </header>

      <div className="space-y-4 px-4">
        <Card className="p-4">
          <Segmented
            value={range}
            options={RANGES.map((r) => ({ value: r.value, label: t(r.key) }))}
            onChange={setRange}
            size="sm"
          />

          <div className="mt-4">
            <p className="text-3xl font-bold">{formatMoney(last?.net ?? 0, base)}</p>
            <p
              className={cn(
                'mt-1 text-sm font-semibold',
                positive ? 'text-emerald-500' : 'text-rose-500',
              )}
            >
              {positive ? '+' : '-'}
              {formatMoney(Math.abs(change), base)}
              <span className="ml-1.5 text-xs">{formatPercent(changePct)}</span>
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                {t('trends.rangeChange')}
              </span>
            </p>
          </div>

          <div className="mt-4">
            <NetWorthChart points={points} baseCurrency={base} height={200} />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">{t('trends.currentAllocation')}</h2>
          <ul className="mt-3 space-y-2.5">
            {overview.allocation.map((item) => (
              <li key={item.kind} className="flex items-center gap-3 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: KIND_COLORS[item.kind] }}
                />
                <span className="flex-1 text-slate-500">{t(`kind.${item.kind}`)}</span>
                <span className="text-slate-400">{formatPercent(item.ratio)}</span>
                <span className="w-24 text-right font-medium">
                  {formatMoney(item.value, base)}
                </span>
              </li>
            ))}
            {overview.allocation.length === 0 && (
              <li className="text-xs text-slate-400">{t('trends.noData')}</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}
