import { describe, it, expect } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('resolves an explicit light theme', () => {
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('resolves an explicit dark theme', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
