import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCollapsed } from './useCollapsed'

beforeEach(() => localStorage.clear())

describe('useCollapsed', () => {
  it('starts expanded', () => {
    const { result } = renderHook(() => useCollapsed())
    expect(result.current.isCollapsed('cash')).toBe(false)
  })

  it('toggles and remembers the collapsed state', () => {
    const { result } = renderHook(() => useCollapsed())
    act(() => result.current.toggle('cash'))
    expect(result.current.isCollapsed('cash')).toBe(true)

    const { result: reloaded } = renderHook(() => useCollapsed())
    expect(reloaded.current.isCollapsed('cash')).toBe(true)
  })

  it('toggles back to expanded', () => {
    const { result } = renderHook(() => useCollapsed())
    act(() => result.current.toggle('investment'))
    act(() => result.current.toggle('investment'))
    expect(result.current.isCollapsed('investment')).toBe(false)
  })
})
