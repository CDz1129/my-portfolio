import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NetWorthHero } from './NetWorthHero'

const summary = { assets: 15000, liabilities: 2000, net: 13000 }

function setup(display: 'net' | 'assets' | 'liabilities' = 'net') {
  const onDisplayChange = vi.fn()
  render(
    <NetWorthHero
      summary={summary}
      baseCurrency="CNY"
      display={display}
      onDisplayChange={onDisplayChange}
      change30d={500}
    />,
  )
  return { onDisplayChange }
}

describe('NetWorthHero', () => {
  it('shows the net worth and its label by default', () => {
    setup('net')
    expect(screen.getByText('我的净资产')).toBeInTheDocument()
    expect(screen.getByText(/13,000/)).toBeInTheDocument()
  })

  it('shows total assets when display is assets', () => {
    setup('assets')
    expect(screen.getByText('我的总资产')).toBeInTheDocument()
    expect(screen.getByText(/15,000/)).toBeInTheDocument()
  })

  it('shows total liabilities when display is liabilities', () => {
    setup('liabilities')
    expect(screen.getByText('我的总负债')).toBeInTheDocument()
    expect(screen.getByText(/2,000/)).toBeInTheDocument()
  })

  it('advances to the next display when the hero is clicked', async () => {
    const { onDisplayChange } = setup('net')
    await userEvent.click(screen.getByRole('button', { name: /我的净资产/ }))
    expect(onDisplayChange).toHaveBeenCalledWith('assets')
  })

  it('shows the 30 day change when on the net display', () => {
    setup('net')
    expect(screen.getByText(/\+500/)).toBeInTheDocument()
  })
})
