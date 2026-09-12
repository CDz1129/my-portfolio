import { describe, it, expect } from 'vitest'
import { shouldShowInitialDemo } from './DataMode'

describe('shouldShowInitialDemo', () => {
  it('shows the showcase only for a brand-new install', () => {
    expect(
      shouldShowInitialDemo({ realHasData: false, dismissed: false, seeded: false }),
    ).toBe(true)
  })

  it('never shows the demo when my account already has data', () => {
    expect(
      shouldShowInitialDemo({ realHasData: true, dismissed: false, seeded: false }),
    ).toBe(false)
  })

  it('does not re-show the demo after it was dismissed', () => {
    expect(
      shouldShowInitialDemo({ realHasData: false, dismissed: true, seeded: true }),
    ).toBe(false)
  })

  it('does not re-show the demo once the first run happened', () => {
    expect(
      shouldShowInitialDemo({ realHasData: false, dismissed: false, seeded: true }),
    ).toBe(false)
  })
})
