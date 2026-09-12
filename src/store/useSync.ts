import { useCallback, useState } from 'react'
import { db as realDb } from '@/db/database'
import { saveSettings } from '@/db/repository'
import { syncPrices, syncRates } from './sync'
import { useDataMode } from './DataMode'

export interface SyncState {
  loading: boolean
  message?: string
  error?: string
}

export function useSync() {
  const { db: dataDb } = useDataMode()
  const [state, setState] = useState<SyncState>({ loading: false })

  const run = useCallback(async () => {
    setState({ loading: true })
    try {
      const rates = await syncRates(realDb)
      const prices = await syncPrices(dataDb)
      await saveSettings({ lastSyncAt: Date.now() }, realDb)
      const parts = [`已更新 ${prices.updated} 项持仓`, `${rates.count} 个汇率`]
      if (prices.failed > 0) parts.push(`${prices.failed} 项失败`)
      setState({ loading: false, message: parts.join(' · ') })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [dataDb])

  return { ...state, run }
}
