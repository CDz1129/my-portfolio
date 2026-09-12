import { useEffect, useRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Accounts } from './pages/Accounts'
import { AccountDetail } from './pages/AccountDetail'
import { Transactions } from './pages/Transactions'
import { Trends } from './pages/Trends'
import { SettingsPage } from './pages/Settings'
import { db as realDb } from './db/database'
import { saveSettings } from './db/repository'
import { syncPrices, syncRates, isSyncDue } from './store/sync'
import { DataModeProvider, useDataMode } from './store/DataMode'
import { applyTheme, watchSystemTheme, type ThemePreference } from './lib/theme'

const DEFAULT_SYNC_INTERVAL_DAYS = 90

export default function App() {
  return (
    <DataModeProvider>
      <AppShell />
    </DataModeProvider>
  )
}

function AppShell() {
  const { db: dataDb } = useDataMode()
  const settings = useLiveQuery(() => realDb.settings.get('app'), [])
  const autoSynced = useRef(false)

  useEffect(() => {
    const preference = (settings?.theme ?? 'system') as ThemePreference
    applyTheme(preference)
    return watchSystemTheme(() => applyTheme(preference))
  }, [settings?.theme])

  useEffect(() => {
    if (!settings || autoSynced.current) return
    if (settings.autoSync === false) return
    const days = settings.syncIntervalDays ?? DEFAULT_SYNC_INTERVAL_DAYS
    if (!isSyncDue(settings.lastSyncAt, days)) return
    autoSynced.current = true
    void (async () => {
      try {
        await syncRates(realDb)
        await syncPrices(dataDb)
        await saveSettings({ lastSyncAt: Date.now() }, realDb)
      } catch {
        // offline or API unavailable; keep local data
      }
    })()
  }, [settings, dataDb])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/:id" element={<AccountDetail />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}
