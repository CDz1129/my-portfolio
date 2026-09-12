import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssetSearch } from './AssetSearch'
import { searchAssets } from '@/lib/marketApi'

vi.mock('@/lib/marketApi', () => ({
  searchAssets: vi.fn(),
}))

const mockedSearch = vi.mocked(searchAssets)

describe('AssetSearch', () => {
  beforeEach(() => {
    mockedSearch.mockReset()
  })

  it('searches by keyword and reports the selection', async () => {
    mockedSearch.mockResolvedValue([
      { market: 'A', symbol: '600519', name: '贵州茅台', exchange: 'sh' },
    ])
    const onSelect = vi.fn()
    render(<AssetSearch onSelect={onSelect} />)

    await userEvent.type(screen.getByLabelText('搜索资产'), '茅台')
    const item = await screen.findByText('贵州茅台', undefined, { timeout: 3000 })
    await userEvent.click(item)

    expect(mockedSearch).toHaveBeenCalledWith('茅台')
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ market: 'A', symbol: '600519' }),
    )
  })

  it('shows a friendly message when the search fails', async () => {
    mockedSearch.mockRejectedValue(new Error('offline'))
    render(<AssetSearch onSelect={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('搜索资产'), 'AAPL')
    expect(await screen.findByText(/搜索失败/, undefined, { timeout: 3000 })).toBeInTheDocument()
  })

  it('does not query for an empty keyword', async () => {
    render(<AssetSearch onSelect={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('搜索资产'), '   ')
    await new Promise((r) => setTimeout(r, 400))
    expect(mockedSearch).not.toHaveBeenCalled()
  })
})
