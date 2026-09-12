import { useEffect, useState } from 'react'
import { ArrowLeftRight, PlusCircle, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { usePortfolioData } from '@/store/usePortfolio'
import { createAccount, recordTransaction } from '@/store/actions'
import { useT } from '@/i18n'
import { AccountForm } from './AccountForm'
import { TransactionForm } from './TransactionForm'
import { Sheet } from './ui'

type Mode = 'menu' | 'tx' | 'account'

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { accounts, holdings, groups, db } = usePortfolioData()
  const { t } = useT()
  const [mode, setMode] = useState<Mode>('menu')

  useEffect(() => {
    if (open) setMode('menu')
  }, [open])

  const titles: Record<Mode, string> = {
    menu: t('tx.quickAddTitle'),
    tx: t('tx.quickAddTx'),
    account: t('tx.quickAddAccount'),
  }

  return (
    <Sheet open={open} title={titles[mode]} onClose={onClose}>
      {mode === 'menu' && (
        <div className="grid grid-cols-2 gap-3">
          <MenuButton
            icon={<PlusCircle size={22} />}
            title={t('tx.menuTx')}
            subtitle={t('tx.menuTxSub')}
            onClick={() => setMode('tx')}
          />
          <MenuButton
            icon={<Wallet size={22} />}
            title={t('tx.menuAccount')}
            subtitle={t('tx.menuAccountSub')}
            onClick={() => setMode('account')}
          />
          <MenuButton
            icon={<ArrowLeftRight size={22} />}
            title={t('tx.menuAdjust')}
            subtitle={t('tx.menuAdjustSub')}
            onClick={() => setMode('tx')}
          />
          <MenuButton
            icon={<TrendingUp size={22} />}
            title={t('tx.menuHolding')}
            subtitle={t('tx.menuHoldingSub')}
            onClick={() => setMode('tx')}
          />
        </div>
      )}

      {mode === 'tx' && (
        <>
          <BackButton label={t('common.back')} onClick={() => setMode('menu')} />
          <TransactionForm
            accounts={accounts}
            holdings={holdings}
            onCancel={onClose}
            onSubmit={async (input) => {
              await recordTransaction(input, db)
              onClose()
            }}
          />
        </>
      )}

      {mode === 'account' && (
        <>
          <BackButton label={t('common.back')} onClick={() => setMode('menu')} />
          <AccountForm
            groups={groups}
            onCancel={onClose}
            onSubmit={async (input) => {
              await createAccount(input, db)
              onClose()
            }}
          />
        </>
      )}
    </Sheet>
  )
}

function MenuButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 p-3.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-500 dark:hover:bg-slate-800"
    >
      <span className="text-brand-600 dark:text-brand-400">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11px] text-slate-400">{subtitle}</span>
    </button>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
    >
      <RefreshCw size={12} /> {label}
    </button>
  )
}
