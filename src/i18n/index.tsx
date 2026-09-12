import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { setFormatLocale } from '@/domain/currency'
import { translate, type Lang } from './translations'

export type { Lang }

export interface I18nValue {
  lang: Lang
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue>({
  lang: 'zh',
  t: (key, params) => translate('zh', key, params),
})

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    setFormatLocale(lang === 'en' ? 'en-US' : 'zh-CN')
  }, [lang])

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      t: (key, params) => translate(lang, key, params),
    }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): I18nValue {
  return useContext(I18nContext)
}
