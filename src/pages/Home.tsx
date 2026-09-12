import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { usePortfolioData } from '@/store/usePortfolio'
import { useDataMode } from '@/store/DataMode'
import { useSync } from '@/store/useSync'
import { ACCOUNT_KIND_LABEL, ACCOUNT_KIND_ORDER, LIQUIDITY_LABEL, isLiability } from '@/domain/types'
import { formatMoney, formatPercent } from '@/domain/currency'
import { NetWorthHero, type NetWorthDisplay } from '@/components/NetWorthHero'
import { AllocationDonut, MiniTrend } from '@/components/Charts'
import { Card, Segmented } from '@/components/ui'
import { KIND_COLORS, KIND_ICONS, LIQUIDITY_COLORS } from '@/lib/kindColors'
import { cn } from '@/lib/cn'

export function Home() {
  const { overview } = usePortfolioData()
  const { summary, allocation, liquidity, accountsByKind, series, investments, change30d } =
    overview
  const base = overview.baseCurrency
  const [display, setDisplay] = useState<NetWorthDisplay>('net')
  const [allocView, setAllocView] = useState<'kind' | 'liquidity'>('kind')
  const { mode, realHasData } = useDataMode()
  const navigate = useNavigate()
  const sync = useSync()

  const recentSeries = series.slice(-12)
  const trendPositive = change30d >= 0

  const slices =
    allocView === 'kind'
      ? allocation.map((item) => ({
          key: item.kind,
          name: ACCOUNT_KIND_LABEL[item.kind],
          value: item.value,
          ratio: item.ratio,
          color: KIND_COLORS[item.kind],
        }))
      : liquidity.map((item) => ({
          key: item.class,
          name: LIQUIDITY_LABEL[item.class],
          value: item.value,
          ratio: item.ratio,
          color: LIQUIDITY_COLORS[item.class],
        }))

  return (
    <div>
      <header className="safe-top bg-gradient-to-b from-slate-900 to-slate-800 px-4 pb-6 pt-4 dark:from-slate-950 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            My Portfolio
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">{base}</span>
            <button
              type="button"
              aria-label="更新行情"
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
            <p className="text-[11px] text-slate-400">总资产</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {formatMoney(summary.assets, base)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setDisplay('liabilities')}
            className="rounded-2xl bg-white/5 px-4 py-3 text-left"
          >
            <p className="text-[11px] text-slate-400">总负债</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {formatMoney(summary.liabilities, base)}
            </p>
          </button>
        </div>
      </header>

      <div className="-mt-4 space-y-4 px-4">
        {mode === 'real' && !realHasData && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4 dark:border-brand-800/60 dark:bg-brand-900/20">
            <p className="text-sm font-semibold">开始记录你的资产</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              还没有任何账户，添加第一个账户即可开始。想先体验可点击顶部「查看演示数据」。
            </p>
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              className="mt-3 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500"
            >
              添加账户
            </button>
          </div>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">资产配置</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {allocView === 'kind' ? '各类账户占总资产比例' : '按流动性看资产结构'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/trends')}
              className="flex items-center gap-0.5 text-xs text-brand-600 dark:text-brand-400"
            >
              趋势 <ChevronRight size={14} />
            </button>
          </div>

          <div className="mt-3">
            <Segmented
              size="sm"
              value={allocView}
              options={[
                { value: 'kind', label: '按类型' },
                { value: 'liquidity', label: '按流动性' },
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
              {slices.length === 0 && <li className="text-xs text-slate-400">暂无资产</li>}
            </ul>
          </div>
        </Card>

        {investments.value > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">投资表现</h2>
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
                <p className="text-[11px] text-slate-400">持仓市值</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {formatMoney(investments.value, base)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">累计投入</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {formatMoney(investments.cost, base)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">累计收益</p>
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
              <h2 className="text-sm font-semibold">净资产走势</h2>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MiniTrend points={recentSeries} positive={trendPositive} />
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/trends')}
              className="w-full text-left text-[11px] text-brand-600 dark:text-brand-400"
            >
              查看完整趋势分析 →
            </button>
          </Card>
        )}

        {ACCOUNT_KIND_ORDER.map((kind) => {
          const views = accountsByKind[kind].filter((v) => !v.account.archived)
          if (views.length === 0) return null
          const subtotal = views.reduce((sum, v) => sum + v.valueBase, 0)
          return (
            <Card key={kind} className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span>{KIND_ICONS[kind]}</span>
                  <span className="text-sm font-semibold">{ACCOUNT_KIND_LABEL[kind]}</span>
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isLiability(kind) && 'text-rose-500',
                  )}
                >
                  {isLiability(kind) ? '-' : ''}
                  {formatMoney(subtotal, base)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {views.map((view) => (
                  <button
                    key={view.account.id}
                    type="button"
                    onClick={() => navigate(`/accounts/${view.account.id}`)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-7 w-7 rounded-lg"
                        style={{
                          background: `${view.account.color ?? KIND_COLORS[kind]}22`,
                          border: `1px solid ${view.account.color ?? KIND_COLORS[kind]}55`,
                        }}
                      />
                      <div>
                        <p className="text-sm">{view.account.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {view.account.currency}
                          {view.holdings.length > 0 && ` · ${view.holdings.length} 项持仓`}
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
            </Card>
          )
        })}
      </div>
    </div>
  )
}
