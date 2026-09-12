import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountBadge } from './AccountBadge'

describe('AccountBadge', () => {
  it('shows the first character of the account name', () => {
    render(<AccountBadge name="招商银行" />)
    expect(screen.getByText('招')).toBeInTheDocument()
  })

  it('uppercases latin initials', () => {
    render(<AccountBadge name="apple" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('falls back to a placeholder for empty names', () => {
    render(<AccountBadge name="   " />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
