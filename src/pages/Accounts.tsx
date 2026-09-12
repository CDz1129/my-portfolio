import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { usePortfolioData } from '@/store/usePortfolio'
import { createAccount, updateAccount } from '@/store/actions'
import { ACCOUNT_KIND_LABEL, ACCOUNT_KIND_ORDER, isLiability, type Account } from '@/domain/types'
import { formatMoney } from '@/domain/currency'
import { AccountForm } from '@/components/AccountForm'
import { Button, Card, Sheet } from '@/components/ui'
import { KIND_COLORS, KIND_ICONS } from '@/lib/kindColors'
import { cn } from '@/lib/cn'

export function Accounts() {
  const { accounts, groups, overview, db } = usePortfolioData()
  const base = overview.baseCurrency
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>()

  const active = accounts.filter((a) => !a.archived)
  const archived = accounts.filter((a) => a.archived)

  function openNew() {
    setEditing(undefined)
    setSheetOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setSheetOpen(true)
  }

  return (
    <div>
      <header className="safe-top flex items-center justify-between px-4 pb-3 pt-6">
        <h1 className="text-xl font-bold">账户</h1>
        <Button onClick={openNew} className="px-3 py-2">
          <Plus size={16} /> 添加
        </Button>
      </header>

      <div className="space-y-4 px-4">
        {ACCOUNT_KIND_ORDER.map((kind) => {
          const views = overview.accountsByKind[kind].filter((v) => !v.account.archived)
          if (views.length === 0) return null
          const subtotal = views.reduce((sum, v) => sum + v.valueBase, 0)
          return (
            <Card key={kind} className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span>{KIND_ICONS[kind]}</span>
                  <span className="text-sm font-semibold">{ACCOUNT_KIND_LABEL[kind]}</span>
                </div>
                <span className={cn('text-sm font-semibold', isLiability(kind) && 'text-rose-500')}>
                  {isLiability(kind) ? '-' : ''}
                  {formatMoney(subtotal, base)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {views.map((view) => (
                  <div
                    key={view.account.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg"
                      style={{
                        background: `${view.account.color ?? KIND_COLORS[kind]}22`,
                        border: `1px solid ${view.account.color ?? KIND_COLORS[kind]}55`,
                      }}
                    />
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => navigate(`/accounts/${view.account.id}`)}
                    >
                      <p className="text-sm">{view.account.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {view.account.currency}
                        {view.holdings.length > 0 && ` · ${view.holdings.length} 项持仓`}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(view.account)}
                      className="text-right"
                    >
                      <p className="text-sm font-medium">
                        {formatMoney(view.valueBase, base)}
                      </p>
                      <p className="text-[11px] text-slate-400">编辑</p>
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}

        {active.length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-400">
            还没有账户，点击右上角添加
          </Card>
        )}

        {archived.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-4 py-3 text-xs font-medium text-slate-400">已归档</div>
            <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {archived.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between px-4 py-3 opacity-60"
                >
                  <div>
                    <p className="text-sm line-through">{account.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {ACCOUNT_KIND_LABEL[account.kind]} · {account.currency}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => updateAccount(account.id, { archived: false }, db)}
                  >
                    恢复
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        title={editing ? '编辑账户' : '添加账户'}
        onClose={() => setSheetOpen(false)}
      >
        <AccountForm
          groups={groups}
          initial={editing}
          onCancel={() => setSheetOpen(false)}
          onSubmit={async (input) => {
            if (editing) {
              await updateAccount(
                editing.id,
                {
                  name: input.name,
                  kind: input.kind,
                  currency: input.currency,
                  openingBalance: input.openingBalance,
                  groupId: input.groupId,
                },
                db,
              )
            } else {
              await createAccount(input, db)
            }
            setSheetOpen(false)
          }}
        />
      </Sheet>
    </div>
  )
}
