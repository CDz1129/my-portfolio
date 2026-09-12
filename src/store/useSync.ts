import { useCallback, useState } from 'react'
import { db as realDb } from '@/db/database'
import { saveSettings } from '@/db/repository'
import { syncPrices, syncRates } from './sync'
import { useDataMode } from './DataMode'
import { useT } from '@/i18n'

export interface SyncState {
  loading: boolean
  message?: string
  error?: string
}

export function useSync() {
  const { db: dataDb } = useDataMode()
  const { t } = useT()
  const [state, setState] = useState<SyncState>({ loading: false })

  const run = useCallback(async () => {
    setState({ loading: true })
    try {
      const rates = await syncRates(realDb)
      const prices = await syncPrices(dataDb)
      await saveSettings({ lastSyncAt: Date.now() }, realDb)
      const parts = [t('sync.updated', { n: prices.updated }), t('sync.rates', { n: rates.count })]
      if (prices.failed > 0) parts.push(t('sync.failed', { n: prices.failed }))
      setState({ loading: false, message: parts.join(' · ') })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [dataDb, t])

  return { ...state, run }
}
