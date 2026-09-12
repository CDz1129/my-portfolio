import { Trash2 } from 'lucide-react'
import { usePortfolioData } from '@/store/usePortfolio'
import { deleteTransaction } from '@/store/actions'
import { convert, formatMoney } from '@/domain/currency'
import { useT } from '@/i18n'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'

export function Transactions() {
  const { transactions, accounts, holdings, settings, db } = usePortfolioData()
  const { t } = useT()
  const base = settings.baseCurrency
  const nameOf = new Map(accounts.map((a) => [a.id, a.name]))
  const holdingOf = new Map(holdings.map((h) => [h.id, h.symbol]))

  const groups = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
    ;(acc[tx.date] ??= []).push(tx)
    return acc
  }, {})
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <header className="safe-top px-4 pb-3 pt-6">
        <h1 className="text-xl font-bold">{t('tx.title')}</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {t('tx.count', { n: transactions.length })}
        </p>
      </header>

      <div className="space-y-4 px-4">
        {dates.map((date) => (
          <div key={date}>
            <p className="mb-1.5 px-1 text-xs font-medium text-slate-400">{date}</p>
            <Card className="overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {groups[date].map((tx) => {
                  const account = accounts.find((a) => a.id === tx.accountId)
                  const nativeToBase = account
                    ? convert(tx.amount, tx.currency, base, settings.rates)
                    : tx.amount
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm">
                          {t(`txType.${tx.type}`)}
                          {tx.type === 'transfer' && tx.toAccountId
                            ? ` · ${nameOf.get(tx.accountId)} → ${nameOf.get(tx.toAccountId)}`
                            : ` · ${nameOf.get(tx.accountId) ?? ''}`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {tx.type === 'buy' || tx.type === 'sell'
                            ? `${holdingOf.get(tx.holdingId ?? '') ?? ''} ${tx.shares} @ ${tx.price}`
                            : tx.note || ''}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          tx.type === 'expense' && 'text-rose-500',
                          tx.type === 'income' && 'text-emerald-500',
                        )}
                      >
                        {tx.type === 'buy' || tx.type === 'sell'
                          ? `${tx.shares} × ${tx.price}`
                          : formatMoney(nativeToBase, base)}
                      </p>
                      <button
                        type="button"
                        aria-label={t('common.delete')}
                        onClick={() => deleteTransaction(tx.id, db)}
                        className="text-slate-300 transition-colors hover:text-rose-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        ))}

        {transactions.length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-400">{t('tx.empty')}</Card>
        )}
      </div>
    </div>
  )
}
