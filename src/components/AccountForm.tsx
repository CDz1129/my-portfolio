import { useState, type FormEvent } from 'react'
import type { Account, AccountKind, Group } from '@/domain/types'
import { CURRENCIES } from '@/domain/currency'
import type { NewAccountInput } from '@/store/actions'
import { useT } from '@/i18n'
import { Button, Field, Segmented, Select, TextInput } from './ui'

const KIND_KEYS: { value: AccountKind; key: string }[] = [
  { value: 'cash', key: 'kind.cashForm' },
  { value: 'investment', key: 'kind.investment' },
  { value: 'fixed', key: 'kind.fixed' },
  { value: 'receivable', key: 'kind.receivable' },
  { value: 'liability', key: 'kind.liability' },
]

export function AccountForm({
  groups,
  initial,
  onSubmit,
  onCancel,
}: {
  groups: Group[]
  initial?: Partial<Account>
  onSubmit: (input: NewAccountInput) => void | Promise<void>
  onCancel?: () => void
}) {
  const { t } = useT()
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? 'cash')
  const [currency, setCurrency] = useState(initial?.currency ?? 'CNY')
  const [openingBalance, setOpeningBalance] = useState(
    String(initial?.openingBalance ?? 0),
  )
  const [groupId, setGroupId] = useState(initial?.groupId ?? '')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('accountForm.nameRequired'))
      return
    }
    setError('')
    await onSubmit({
      name: name.trim(),
      kind,
      currency,
      openingBalance: Number(openingBalance) || 0,
      groupId: groupId || undefined,
    })
  }

  const isInvestment = kind === 'investment'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label={t('accountForm.name')} error={error}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('accountForm.namePlaceholder')}
        />
      </Field>

      <Field label={t('accountForm.type')}>
        <Segmented
          value={kind}
          options={KIND_KEYS.map((k) => ({ value: k.value, label: t(k.key) }))}
          onChange={setKind}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('accountForm.currency')}>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {t(`currency.${c.code}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t(isInvestment ? 'accountForm.cashBalance' : 'accountForm.openingBalance')}
          hint={isInvestment ? t('accountForm.cashHint') : undefined}
        >
          <TextInput
            type="number"
            inputMode="decimal"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </Field>
      </div>

      {groups.length > 0 && (
        <Field label={t('accountForm.group')}>
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">{t('accountForm.noGroup')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
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
