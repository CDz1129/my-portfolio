import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountForm } from './AccountForm'
import type { NewAccountInput } from '@/store/actions'

const groups = [
  { id: 'g1', name: '券商', createdAt: 1 },
  { id: 'g2', name: '现金', createdAt: 2 },
]

describe('AccountForm', () => {
  it('submits the entered values', async () => {
    const onSubmit = vi.fn()
    render(<AccountForm groups={groups} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('账户名称'), '招商银行')
    await userEvent.clear(screen.getByLabelText('期初余额'))
    await userEvent.type(screen.getByLabelText('期初余额'), '12345')
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const value = onSubmit.mock.calls[0][0] as NewAccountInput
    expect(value.name).toBe('招商银行')
    expect(value.openingBalance).toBe(12345)
    expect(value.kind).toBe('cash')
    expect(value.currency).toBe('CNY')
  })

  it('lets you pick an account kind and currency', async () => {
    const onSubmit = vi.fn()
    render(<AccountForm groups={groups} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('账户名称'), '美股')
    await userEvent.click(screen.getByRole('button', { name: '投资' }))
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    const value = onSubmit.mock.calls[0][0] as NewAccountInput
    expect(value.kind).toBe('investment')
  })

  it('blocks submission and shows an error for an empty name', async () => {
    const onSubmit = vi.fn()
    render(<AccountForm groups={groups} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/请输入账户名称/)).toBeInTheDocument()
  })

  it('prefills when editing an existing account', () => {
    render(
      <AccountForm
        groups={groups}
        initial={{ id: 'a', name: '旧账户', kind: 'cash', currency: 'USD', openingBalance: 99 }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('账户名称')).toHaveValue('旧账户')
    expect(screen.getByLabelText('期初余额')).toHaveValue(99)
  })
})
