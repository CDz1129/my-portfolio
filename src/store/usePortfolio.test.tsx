import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePortfolioData } from './usePortfolio'

describe('usePortfolioData', () => {
  it('resolves settings without a ReadOnlyError from the live query', async () => {
    const { result } = renderHook(() => usePortfolioData())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 })
    expect(result.current.settings.baseCurrency).toBeTruthy()
    expect(result.current.overview.summary).toHaveProperty('net')
  })
})
