import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionForm } from './TransactionForm'
import type { Account, Holding } from '@/domain/types'
import type { NewTransactionInput } from '@/store/actions'

const accounts: Account[] = [
  {
    id: 'a1',
    name: '招商银行',
    kind: 'cash',
    currency: 'CNY',
    openingBalance: 1000,
    openingDate: '2024-01-01',
    archived: false,
    createdAt: 1,
  },
  {
    id: 'a2',
    name: '美股券商',
    kind: 'investment',
    currency: 'USD',
    openingBalance: 0,
    openingDate: '2024-01-01',
    archived: false,
    createdAt: 2,
  },
]

const holdings: Holding[] = [
  {
    id: 'h1',
    accountId: 'a2',
    symbol: 'VTI',
    market: 'US',
    currency: 'USD',
    openingShares: 1,
    avgCost: 200,
    price: 250,
  },
]

function submitButton() {
  return screen.getByRole('button', { name: '保存' })
}

describe('TransactionForm', () => {
  it('records an expense by default', async () => {
    const onSubmit = vi.fn()
    render(<TransactionForm accounts={accounts} holdings={holdings} onSubmit={onSubmit} />)

    await userEvent.selectOptions(screen.getByLabelText('账户'), 'a1')
    await userEvent.type(screen.getByLabelText('金额'), '88')
    await userEvent.click(submitButton())

    const value = onSubmit.mock.calls[0][0] as NewTransactionInput
    expect(value.type).toBe('expense')
    expect(value.accountId).toBe('a1')
    expect(value.amount).toBe(88)
  })

  it('switches to a transfer and requires a destination account', async () => {
    const onSubmit = vi.fn()
    render(<TransactionForm accounts={accounts} holdings={holdings} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: '转账' }))
    await userEvent.selectOptions(screen.getByLabelText('账户'), 'a1')
    await userEvent.type(screen.getByLabelText('金额'), '50')

    await userEvent.click(submitButton())
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/请选择目标账户/)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('目标账户'), 'a2')
    await userEvent.click(submitButton())
    const value = onSubmit.mock.calls.at(-1)![0] as NewTransactionInput
    expect(value.type).toBe('transfer')
    expect(value.toAccountId).toBe('a2')
  })

  it('shows a holding picker for buy/sell transactions', async () => {
    const onSubmit = vi.fn()
    render(<TransactionForm accounts={accounts} holdings={holdings} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: '买入' }))
    await userEvent.selectOptions(screen.getByLabelText('账户'), 'a2')
    expect(screen.getByLabelText('持仓')).toBeInTheDocument()
    expect(screen.getByText('VTI')).toBeInTheDocument()
  })
})
