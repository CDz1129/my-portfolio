import { useState, type FormEvent } from 'react'
import type { Account, AccountKind, Group } from '@/domain/types'
import { CURRENCIES } from '@/domain/currency'
import type { NewAccountInput } from '@/store/actions'
import { Button, Field, Segmented, Select, TextInput } from './ui'

const KIND_OPTIONS: { value: AccountKind; label: string }[] = [
  { value: 'cash', label: '现金' },
  { value: 'investment', label: '投资' },
  { value: 'fixed', label: '固定资产' },
  { value: 'receivable', label: '应收款' },
  { value: 'liability', label: '负债' },
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
      setError('请输入账户名称')
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="账户名称" error={error}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：招商银行、美股券商"
        />
      </Field>

      <Field label="类型">
        <Segmented value={kind} options={KIND_OPTIONS} onChange={setKind} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="币种">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={kind === 'investment' ? '现金余额' : '期初余额'}
          hint={
            kind === 'investment'
              ? '这里填账户里的现金，持仓市值请到账户里单独添加，避免重复计算'
              : undefined
          }
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
        <Field label="分组">
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">不分组</option>
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
