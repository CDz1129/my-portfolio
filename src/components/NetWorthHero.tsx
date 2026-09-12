import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { formatMoney, formatNumber, formatPercent } from '@/domain/currency'
import type { Summary } from '@/domain/portfolio'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

export type NetWorthDisplay = 'net' | 'assets' | 'liabilities'

export const DISPLAY_ORDER: NetWorthDisplay[] = ['net', 'assets', 'liabilities']

const LABEL_KEYS: Record<NetWorthDisplay, string> = {
  net: 'networth.net',
  assets: 'networth.assets',
  liabilities: 'networth.liabilities',
}

export function nextDisplay(current: NetWorthDisplay): NetWorthDisplay {
  return DISPLAY_ORDER[(DISPLAY_ORDER.indexOf(current) + 1) % DISPLAY_ORDER.length]
}

export function NetWorthHero({
  summary,
  baseCurrency,
  display,
  onDisplayChange,
  change30d = 0,
}: {
  summary: Summary
  baseCurrency: string
  display: NetWorthDisplay
  onDisplayChange: (display: NetWorthDisplay) => void
  change30d?: number
}) {
  const [hidden, setHidden] = useState(false)
  const { t } = useT()
  const value =
    display === 'net'
      ? summary.net
      : display === 'assets'
        ? summary.assets
        : summary.liabilities
  const positive = change30d >= 0
  const base = summary.net !== 0 ? summary.net - change30d : 0
  const changePct = base !== 0 ? change30d / Math.abs(base) : 0

  return (
    <div className="px-1 py-2">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onDisplayChange(nextDisplay(display))}
          className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
        >
          {t(LABEL_KEYS[display])}
        </button>
        <button
          type="button"
          aria-label={hidden ? t('networth.show') : t('networth.hide')}
          onClick={() => setHidden((v) => !v)}
          className="text-slate-400 transition-colors hover:text-slate-200"
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onDisplayChange(nextDisplay(display))}
        className="mt-1 block w-full text-center"
      >
        <span className="text-4xl font-bold tracking-tight text-white">
          {hidden ? '••••••' : formatMoney(value, baseCurrency)}
        </span>
      </button>

      {display === 'net' && change30d !== 0 && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          <span className="text-slate-400">{t('networth.last30')}</span>
          <span
            className={cn(
              'font-semibold',
              positive ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {hidden
              ? '••••'
              : `${positive ? '+' : '-'}${formatNumber(Math.abs(change30d))}`}
          </span>
          <span className={cn(positive ? 'text-emerald-400/70' : 'text-rose-400/70')}>
            {formatPercent(changePct)}
          </span>
        </div>
      )}
    </div>
  )
}
