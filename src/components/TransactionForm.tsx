import { useMemo, useState, type FormEvent } from 'react'
import type { Account, Holding, TxType } from '@/domain/types'
import type { NewTransactionInput } from '@/store/actions'
import { Button, Field, Segmented, Select, TextInput } from './ui'

const TYPE_OPTIONS: { value: TxType; label: string }[] = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' },
  { value: 'transfer', label: '转账' },
  { value: 'buy', label: '买入' },
  { value: 'sell', label: '卖出' },
  { value: 'adjust', label: '调整' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionForm({
  accounts,
  holdings,
  defaultType = 'expense',
  onSubmit,
  onCancel,
}: {
  accounts: Account[]
  holdings: Holding[]
  defaultType?: TxType
  onSubmit: (input: NewTransactionInput) => void | Promise<void>
  onCancel?: () => void
}) {
  const active = accounts.filter((a) => !a.archived)
  const [type, setType] = useState<TxType>(defaultType)
  const [date, setDate] = useState(today())
  const [accountId, setAccountId] = useState(active[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [holdingId, setHoldingId] = useState('')
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const accountHoldings = useMemo(
    () => holdings.filter((h) => h.accountId === accountId),
    [holdings, accountId],
  )

  const isTrade = type === 'buy' || type === 'sell'
  const showsAmount = !isTrade
  const destinationAccounts = active.filter((a) => a.id !== accountId)

  function reset(next: TxType) {
    setType(next)
    setError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!accountId) return setError('请选择账户')

    const account = accounts.find((a) => a.id === accountId)
    const holding = holdings.find((h) => h.id === holdingId)

    if (isTrade) {
      if (!holdingId) return setError('请选择持仓')
      if (!shares || Number(shares) <= 0) return setError('请输入有效股数')
    } else if (type === 'transfer') {
      if (!toAccountId) return setError('请选择目标账户')
      if (Number(amount) <= 0) return setError('请输入有效金额')
    } else if (Number(amount) <= 0) {
      return setError('请输入有效金额')
    }

    setError('')
    const input: NewTransactionInput = {
      type,
      date,
      accountId,
      amount: isTrade ? 0 : Number(amount) || 0,
      currency: isTrade ? (holding?.currency ?? account?.currency ?? 'CNY') : (account?.currency ?? 'CNY'),
      note: note || undefined,
    }
    if (type === 'transfer') input.toAccountId = toAccountId
    if (isTrade) {
      input.holdingId = holdingId
      input.shares = Number(shares) || 0
      input.price = Number(price) || holding?.price || 0
    }
    await onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Segmented value={type} options={TYPE_OPTIONS} onChange={reset} size="sm" />

      <Field label="账户">
        <Select
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value)
            setHoldingId('')
            setToAccountId('')
          }}
        >
          <option value="">请选择</option>
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.currency}
            </option>
          ))}
        </Select>
      </Field>

      {type === 'transfer' && (
        <Field label="目标账户" error={error.startsWith('请选择目标') ? error : undefined}>
          <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            <option value="">请选择</option>
            {destinationAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {isTrade && (
        <>
          <Field label="持仓" error={error.startsWith('请选择持仓') ? error : undefined}>
            <Select value={holdingId} onChange={(e) => setHoldingId(e.target.value)}>
              <option value="">请选择</option>
              {accountHoldings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name ? `${h.symbol} ${h.name}` : h.symbol}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="股数" error={error.startsWith('请输入有效股数') ? error : undefined}>
              <TextInput
                type="number"
                inputMode="decimal"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
            </Field>
            <Field label="价格">
              <TextInput
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="留空用现价"
              />
            </Field>
          </div>
        </>
      )}

      {showsAmount && (
        <Field label="金额" error={error.startsWith('请输入有效金额') ? error : undefined}>
          <TextInput
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="日期">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="备注">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" />
        </Field>
      </div>

      {error && !error.startsWith('请选择目标') && !error.startsWith('请选择持仓') && !error.startsWith('请输入有效股数') && !error.startsWith('请输入有效金额') && (
        <p className="text-xs text-rose-500">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          保存
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </Button>
        )}
      </div>
    </form>
  )
}
