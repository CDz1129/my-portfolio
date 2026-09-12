import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { usePortfolioData } from '@/store/usePortfolio'
import { useDataMode } from '@/store/DataMode'
import { useSync } from '@/store/useSync'
import { useCollapsed } from '@/lib/useCollapsed'
import { ACCOUNT_KIND_ORDER, isLiability } from '@/domain/types'
import { CURRENCIES, formatMoney, formatPercent } from '@/domain/currency'
import { saveSettings } from '@/db/repository'
import { useT } from '@/i18n'
import { NetWorthHero, type NetWorthDisplay } from '@/components/NetWorthHero'
import { AllocationDonut, MiniTrend } from '@/components/Charts'
import { AccountBadge } from '@/components/AccountBadge'
import { Card, Segmented } from '@/components/ui'
import { KIND_COLORS, KIND_ICONS, LIQUIDITY_COLORS } from '@/lib/kindColors'
import { cn } from '@/lib/cn'

export function Home() {
  const { overview } = usePortfolioData()
  const { summary, allocation, liquidity, accountsByKind, series, investments, change30d } =
    overview
  const base = overview.baseCurrency
  const { t } = useT()
  const [display, setDisplay] = useState<NetWorthDisplay>('net')
  const [allocView, setAllocView] = useState<'kind' | 'liquidity'>('kind')
  const { mode, realHasData } = useDataMode()
  const { isCollapsed, toggle } = useCollapsed()
  const navigate = useNavigate()
  const sync = useSync()

  const recentSeries = series.slice(-12)
  const trendPositive = change30d >= 0

  const slices =
    allocView === 'kind'
      ? allocation.map((item) => ({
          key: item.kind,
          name: t(`kind.${item.kind}`),
          value: item.value,
          ratio: item.ratio,
          color: KIND_COLORS[item.kind],
        }))
      : liquidity.map((item) => ({
          key: item.class,
          name: t(`liquidity.${item.class}`),
          value: item.value,
          ratio: item.ratio,
          color: LIQUIDITY_COLORS[item.class],
        }))

  const kindSections = ACCOUNT_KIND_ORDER.map((kind) => {
    const views = accountsByKind[kind].filter((v) => !v.account.archived)
    const subtotal = views.reduce((sum, v) => sum + v.valueBase, 0)
    return { kind, views, subtotal }
  }).filter((section) => section.views.length > 0)

  return (
    <div>
      <header className="safe-top bg-gradient-to-b from-slate-900 to-slate-800 px-4 pb-6 pt-4 dark:from-slate-950 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            My Portfolio
          </span>
          <div className="flex items-center gap-2">
            <select
              value={base}
              onChange={(e) => void saveSettings({ baseCurrency: e.target.value })}
              aria-label={t('settings.baseCurrency')}
              className="rounded-lg bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-slate-200 outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="text-slate-900">
                  {c.code}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={t('home.refreshAria')}
              onClick={() => sync.run()}
              disabled={sync.loading}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={14} className={sync.loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {(sync.message || sync.error) && (
          <p
            className={cn(
              'mt-1 text-right text-[10px]',
              sync.error ? 'text-rose-400' : 'text-slate-400',
            )}
          >
            {sync.error ?? sync.message}
          </p>
        )}

        <NetWorthHero
          summary={summary}
          baseCurrency={base}
          display={display}
          onDisplayChange={setDisplay}
          change30d={change30d}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDisplay('assets')}
            className="rounded-2xl bg-white/5 px-4 py-3 text-left"
          >
            <p className="text-[11px] text-slate-400">{t('home.totalAssets')}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {formatMoney(summary.assets, base)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setDisplay('liabilities')}
            className="rounded-2xl bg-white/5 px-4 py-3 text-left"
          >
            <p className="text-[11px] text-slate-400">{t('home.totalLiabilities')}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {formatMoney(summary.liabilities, base)}
            </p>
          </button>
        </div>
      </header>

      <div className="-mt-4 space-y-4 px-4">
        {mode === 'real' && !realHasData && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4 dark:border-brand-800/60 dark:bg-brand-900/20">
            <p className="text-sm font-semibold">{t('home.startTitle')}</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('home.startBody')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              className="mt-3 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500"
            >
              {t('home.addAccount')}
            </button>
          </div>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">{t('home.allocation')}</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {allocView === 'kind' ? t('home.byKindSub') : t('home.byLiquiditySub')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/trends')}
              className="flex items-center gap-0.5 text-xs text-brand-600 dark:text-brand-400"
            >
              {t('home.trend')} <ChevronRight size={14} />
            </button>
          </div>

          <div className="mt-3">
            <Segmented
              size="sm"
              value={allocView}
              options={[
                { value: 'kind', label: t('home.byKind') },
                { value: 'liquidity', label: t('home.byLiquidity') },
              ]}
              onChange={(value) => setAllocView(value as 'kind' | 'liquidity')}
            />
          </div>

          <div className="mt-3 flex items-center gap-4">
            <AllocationDonut data={slices} baseCurrency={base} size={150} />
            <ul className="flex-1 space-y-2">
              {slices.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="flex-1 text-slate-500">{item.name}</span>
                  <span className="font-semibold">{formatPercent(item.ratio)}</span>
                </li>
              ))}
              {slices.length === 0 && <li className="text-xs text-slate-400">{t('home.noAssets')}</li>}
            </ul>
          </div>
        </Card>

        {investments.value > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t('home.perf')}</h2>
              <span
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold',
                  investments.gain >= 0 ? 'text-emerald-500' : 'text-rose-500',
                )}
              >
                {investments.gain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formatPercent(investments.gainPct)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-slate-400">{t('home.holdingsValue')}</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {formatMoney(investments.value, base)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{t('home.invested')}</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {formatMoney(investments.cost, base)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">{t('home.totalGain')}</p>
                <p
                  className={cn(
                    'mt-0.5 text-sm font-semibold',
                    investments.gain >= 0 ? 'text-emerald-500' : 'text-rose-500',
                  )}
                >
                  {investments.gain >= 0 ? '+' : ''}
                  {formatMoney(investments.gain, base)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {recentSeries.length > 1 && (
          <Card className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t('home.netWorthTrend')}</h2>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MiniTrend points={recentSeries} positive={trendPositive} />
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/trends')}
              className="w-full text-left text-[11px] text-brand-600 dark:text-brand-400"
            >
              {t('home.viewFull')}
            </button>
          </Card>
        )}

        {kindSections.map(({ kind, views, subtotal }) => {
          return (
            <Card key={kind} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(kind)}
                aria-expanded={!isCollapsed(kind)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span>{KIND_ICONS[kind]}</span>
                  <span className="text-sm font-semibold">{t(`kind.${kind}`)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isLiability(kind) && 'text-rose-500',
                    )}
                  >
                    {isLiability(kind) ? '-' : ''}
                    {formatMoney(subtotal, base)}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      'text-slate-400 transition-transform',
                      !isCollapsed(kind) && 'rotate-180',
                    )}
                  />
                </div>
              </button>
              {!isCollapsed(kind) && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                  {views.map((view) => (
                    <button
                      key={view.account.id}
                      type="button"
                      onClick={() => navigate(`/accounts/${view.account.id}`)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <AccountBadge
                          name={view.account.name}
                          color={view.account.color ?? KIND_COLORS[kind]}
                        />
                        <div>
                          <p className="text-sm">{view.account.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {view.account.currency}
                            {view.holdings.length > 0 && ` · ${t('home.holdingsCount', { n: view.holdings.length })}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatMoney(view.valueBase, base)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
