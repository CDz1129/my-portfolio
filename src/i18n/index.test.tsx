import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider, useT } from './index'

function Probe() {
  const { t, lang } = useT()
  return (
    <span>
      {lang}:{t('common.save')}
    </span>
  )
}

describe('I18nProvider', () => {
  it('translates to English when lang is en', () => {
    render(
      <I18nProvider lang="en">
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByText('en:Save')).toBeInTheDocument()
  })

  it('translates to Chinese when lang is zh', () => {
    render(
      <I18nProvider lang="zh">
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByText('zh:保存')).toBeInTheDocument()
  })
})
