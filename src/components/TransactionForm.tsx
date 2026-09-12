import { useMemo, useState, type FormEvent } from 'react'
import type { Account, Holding, TxType } from '@/domain/types'
import type { NewTransactionInput } from '@/store/actions'
import { useT } from '@/i18n'
import { Button, Field, Segmented, Select, TextInput } from './ui'

const TYPE_KEYS: { value: TxType; key: string }[] = [
  { value: 'expense', key: 'txType.expense' },
  { value: 'income', key: 'txType.income' },
  { value: 'transfer', key: 'txType.transfer' },
  { value: 'buy', key: 'txType.buy' },
  { value: 'sell', key: 'txType.sell' },
  { value: 'adjust', key: 'txType.adjustForm' },
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
  const { t } = useT()
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
  const [errorKey, setErrorKey] = useState('')

  const accountHoldings = useMemo(
    () => holdings.filter((h) => h.accountId === accountId),
    [holdings, accountId],
  )

  const isTrade = type === 'buy' || type === 'sell'
  const showsAmount = !isTrade
  const destinationAccounts = active.filter((a) => a.id !== accountId)

  function reset(next: TxType) {
    setType(next)
    setErrorKey('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!accountId) return setErrorKey('tx.selectAccount')

    const account = accounts.find((a) => a.id === accountId)
    const holding = holdings.find((h) => h.id === holdingId)

    if (isTrade) {
      if (!holdingId) return setErrorKey('tx.selectHolding')
      if (!shares || Number(shares) <= 0) return setErrorKey('tx.invalidShares')
    } else if (type === 'transfer') {
      if (!toAccountId) return setErrorKey('tx.selectToAccount')
      if (Number(amount) <= 0) return setErrorKey('tx.invalidAmount')
    } else if (Number(amount) <= 0) {
      return setErrorKey('tx.invalidAmount')
    }

    setErrorKey('')
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
      <Segmented
        value={type}
        options={TYPE_KEYS.map((k) => ({ value: k.value, label: t(k.key) }))}
        onChange={reset}
        size="sm"
      />

      <Field label={t('tx.accountLabel')}>
        <Select
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value)
            setHoldingId('')
            setToAccountId('')
          }}
        >
          <option value="">{t('common.select')}</option>
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.currency}
            </option>
          ))}
        </Select>
      </Field>

      {type === 'transfer' && (
        <Field
          label={t('tx.toAccountLabel')}
          error={errorKey === 'tx.selectToAccount' ? t(errorKey) : undefined}
        >
          <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            <option value="">{t('common.select')}</option>
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
          <Field
            label={t('tx.holdingLabel')}
            error={errorKey === 'tx.selectHolding' ? t(errorKey) : undefined}
          >
            <Select value={holdingId} onChange={(e) => setHoldingId(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {accountHoldings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name ? `${h.symbol} ${h.name}` : h.symbol}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t('tx.sharesLabel')}
              error={errorKey === 'tx.invalidShares' ? t(errorKey) : undefined}
            >
              <TextInput
                type="number"
                inputMode="decimal"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
            </Field>
            <Field label={t('tx.priceLabel')}>
              <TextInput
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('tx.pricePlaceholder')}
              />
            </Field>
          </div>
        </>
      )}

      {showsAmount && (
        <Field
          label={t('tx.amountLabel')}
          error={errorKey === 'tx.invalidAmount' ? t(errorKey) : undefined}
        >
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
        <Field label={t('tx.dateLabel')}>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('tx.noteLabel')}>
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('common.optional')}
          />
        </Field>
      </div>

      {errorKey === 'tx.selectAccount' && (
        <p className="text-xs text-rose-500">{t(errorKey)}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          {t('common.save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
