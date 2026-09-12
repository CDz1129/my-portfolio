import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { usePortfolioData } from '@/store/usePortfolio'
import {
  addHolding,
  archiveAccount,
  deleteAccount,
  deleteHolding,
  recordTransaction,
  today,
  updateHolding,
} from '@/store/actions'
import {
  ACCOUNT_KIND_LABEL,
  MARKET_CURRENCY,
  type Account,
  type Holding,
  type Market,
} from '@/domain/types'
import { CURRENCIES, convert, formatMoney } from '@/domain/currency'
import { getQuotes, type AssetSearchResult } from '@/lib/marketApi'
import { useT } from '@/i18n'
import { AssetSearch } from '@/components/AssetSearch'
import { Button, Card, Field, Select, Sheet, TextInput } from '@/components/ui'
import { cn } from '@/lib/cn'

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accounts, transactions, overview, settings, db } = usePortfolioData()
  const { t } = useT()
  const base = settings.baseCurrency

  const account = accounts.find((a) => a.id === id)
  const view = overview.accounts.find((v) => v.account.id === id)
  const accountTxs = transactions.filter((t) => t.accountId === id || t.toAccountId === id)

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [holdingOpen, setHoldingOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | undefined>()

  if (!account || !view) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        {t('detail.notFound')}
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/accounts')}>
          {t('common.back')}
        </Button>
      </div>
    )
  }

  const nativeToBase = (amount: number) =>
    convert(amount, account.currency, base, settings.rates)

  return (
    <div>
      <header className="safe-top px-4 pb-4 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 text-sm text-slate-400"
        >
          <ChevronLeft size={16} /> {t('common.back')}
        </button>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">
              {ACCOUNT_KIND_LABEL[account.kind]} · {account.currency}
            </p>
            <h1 className="mt-0.5 text-xl font-bold">{account.name}</h1>
          </div>
          <p className="text-right text-2xl font-bold">
            {formatMoney(view.valueBase, base)}
          </p>
        </div>
        {account.currency !== base && (
          <p className="mt-1 text-right text-xs text-slate-400">
            {formatMoney(view.nativeValue, account.currency)}
          </p>
        )}
      </header>

      <div className="space-y-4 px-4">
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setAdjustOpen(true)}>
            <Pencil size={15} /> {t('detail.adjustBalance')}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await archiveAccount(account.id, !account.archived, db)
            }}
          >
            {account.archived ? t('detail.unarchive') : t('detail.archive')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm(t('detail.deleteConfirm', { name: account.name }))) return
              await deleteAccount(account.id, db)
              navigate('/accounts')
            }}
          >
            <Trash2 size={15} />
          </Button>
        </div>

        {account.kind === 'investment' && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-semibold">{t('detail.holdings')}</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingHolding(undefined)
                  setHoldingOpen(true)
                }}
                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400"
              >
                <Plus size={14} /> {t('common.add')}
              </button>
            </div>
            <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {view.holdings.map((h) => (
                <button
                  key={h.holding.id}
                  type="button"
                  onClick={() => {
                    setEditingHolding(h.holding)
                    setHoldingOpen(true)
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{h.holding.symbol}</p>
                    <p className="text-[11px] text-slate-400">
                      {t('detail.sharesCost', {
                        shares: h.shares,
                        cost: formatMoney(h.holding.avgCost, h.holding.currency),
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatMoney(h.valueBase, base)}</p>
                    <p
                      className={cn(
                        'text-[11px]',
                        h.gainBase >= 0 ? 'text-emerald-500' : 'text-rose-500',
                      )}
                    >
                      {h.gainBase >= 0 ? '+' : ''}
                      {formatMoney(h.gainBase, base)}
                    </p>
                  </div>
                </button>
              ))}
              {view.holdings.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-slate-400">{t('detail.noHoldings')}</p>
              )}
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="px-4 py-3 text-sm font-semibold">{t('detail.transactions')}</div>
          <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {accountTxs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm">{t(`txType.${tx.type}`)}</p>
                  <p className="text-[11px] text-slate-400">
                    {tx.date}
                    {tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      tx.type === 'expense' && 'text-rose-500',
                      tx.type === 'income' && 'text-emerald-500',
                    )}
                  >
                    {tx.type === 'buy' || tx.type === 'sell'
                      ? `${tx.shares} @ ${tx.price}`
                      : formatMoney(nativeToBase(tx.amount), base)}
                  </p>
                </div>
              </div>
            ))}
            {accountTxs.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">{t('detail.noTransactions')}</p>
            )}
          </div>
        </Card>
      </div>

      <AdjustBalanceSheet
        open={adjustOpen}
        account={account}
        current={overview.portfolio.balances[account.id] ?? 0}
        onClose={() => setAdjustOpen(false)}
        onSubmit={async (amount) => {
          await recordTransaction(
            {
              type: 'adjust',
              date: today(),
              accountId: account.id,
              amount,
              currency: account.currency,
              note: t('detail.adjustNote'),
            },
            db,
          )
          setAdjustOpen(false)
        }}
      />

      <HoldingSheet
        open={holdingOpen}
        account={account}
        holding={editingHolding}
        onClose={() => setHoldingOpen(false)}
        onDelete={
          editingHolding
            ? async () => {
                if (!confirm(t('detail.deleteHoldingConfirm', { symbol: editingHolding.symbol }))) return
                await deleteHolding(editingHolding.id, db)
                setHoldingOpen(false)
              }
            : undefined
        }
        onSubmit={async (values) => {
          if (editingHolding) {
            await updateHolding(editingHolding.id, values, db)
          } else {
            await addHolding({ accountId: account.id, ...values }, db)
          }
          setHoldingOpen(false)
        }}
      />
    </div>
  )
}

function AdjustBalanceSheet({
  open,
  account,
  current,
  onClose,
  onSubmit,
}: {
  open: boolean
  account: Account
  current: number
  onClose: () => void
  onSubmit: (amount: number) => void | Promise<void>
}) {
  const [value, setValue] = useState(String(current))
  const { t } = useT()
  useEffect(() => {
    if (open) setValue(String(current))
  }, [open, current])
  return (
    <Sheet open={open} title={t('detail.adjustTitle')} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          {t('detail.adjustHint', { currency: account.currency })}
        </p>
        <Field label={t('detail.currentBalance', { currency: account.currency })}>
          <TextInput
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Button className="w-full" onClick={() => onSubmit(Number(value) || 0)}>
          {t('common.save')}
        </Button>
      </div>
    </Sheet>
  )
}

function HoldingSheet({
  open,
  account,
  holding,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean
  account: Account
  holding?: Holding
  onClose: () => void
  onSubmit: (values: {
    symbol: string
    name?: string
    market: Market
    currency: string
    openingShares: number
    avgCost: number
    price: number
  }) => void | Promise<void>
  onDelete?: () => void
}) {
  const [symbol, setSymbol] = useState(holding?.symbol ?? '')
  const [name, setName] = useState(holding?.name ?? '')
  const [market, setMarket] = useState(holding?.market ?? 'A')
  const [currency, setCurrency] = useState(holding?.currency ?? account.currency)
  const [shares, setShares] = useState(String(holding?.openingShares ?? 0))
  const [avgCost, setAvgCost] = useState(String(holding?.avgCost ?? 0))
  const [price, setPrice] = useState(String(holding?.price ?? 0))
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceAuto, setPriceAuto] = useState(false)
  const { t } = useT()

  useEffect(() => {
    if (!open) return
    setSymbol(holding?.symbol ?? '')
    setName(holding?.name ?? '')
    setMarket(holding?.market ?? 'A')
    setCurrency(holding?.currency ?? account.currency)
    setShares(String(holding?.openingShares ?? 0))
    setAvgCost(String(holding?.avgCost ?? 0))
    setPrice(String(holding?.price ?? 0))
    setPriceAuto(false)
    setPriceLoading(false)
  }, [open, holding, account.currency])

  async function loadPrice(nextMarket: Market, nextSymbol: string) {
    if (!nextSymbol.trim()) return
    setPriceLoading(true)
    try {
      const [quote] = await getQuotes([{ market: nextMarket, symbol: nextSymbol.trim() }])
      if (quote?.ok && typeof quote.price === 'number') {
        setPrice(String(quote.price))
        if (quote.currency) setCurrency(quote.currency)
        if (quote.name && !name) setName(quote.name)
      }
    } catch {
      // offline or unknown symbol: keep manual entry
    } finally {
      setPriceLoading(false)
    }
  }

  async function handleSelect(result: AssetSearchResult) {
    setSymbol(result.symbol)
    if (result.name) setName(result.name)
    setMarket(result.market)
    setCurrency(MARKET_CURRENCY[result.market])
    setPriceAuto(true)
    await loadPrice(result.market, result.symbol)
  }

  return (
    <Sheet open={open} title={holding ? t('detail.editHolding') : t('detail.addHolding')} onClose={onClose}>
      <div className="space-y-4">
        {!holding && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('detail.searchHint')}
            </p>
            <AssetSearch onSelect={handleSelect} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('detail.code')}>
            <TextInput value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </Field>
          <Field label={t('detail.name')}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('detail.market')}>
            <Select value={market} onChange={(e) => setMarket(e.target.value as Holding['market'])}>
              <option value="A">{t('market.A')}</option>
              <option value="HK">{t('market.HK')}</option>
              <option value="US">{t('market.US')}</option>
              <option value="CRYPTO">{t('market.CRYPTO')}</option>
              <option value="CUSTOM">{t('market.CUSTOM')}</option>
            </Select>
          </Field>
          <Field label={t('detail.currency')}>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('detail.openingShares')}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </Field>
          <Field label={t('detail.avgCost')}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
            />
          </Field>
          <Field
            label={t('detail.price')}
            hint={priceAuto ? t('detail.priceAuto') : undefined}
          >
            <div className="flex gap-1.5">
              <TextInput
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <button
                type="button"
                aria-label={t('detail.refreshPrice')}
                disabled={priceLoading}
                onClick={() => loadPrice(market, symbol)}
                className="flex w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RefreshCw size={15} className={priceLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </Field>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() =>
              onSubmit({
                symbol: symbol.trim(),
                name: name.trim() || undefined,
                market,
                currency,
                openingShares: Number(shares) || 0,
                avgCost: Number(avgCost) || 0,
                price: Number(price) || 0,
              })
            }
          >
            {t('common.save')}
          </Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
