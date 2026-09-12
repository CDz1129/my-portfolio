import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { demoDb, db as realDb, type PortfolioDB } from '@/db/database'
import {
  clearAllData,
  migrateLegacyDemoData,
  saveSettings,
  seedDemoData,
} from '@/db/repository'

export type DataMode = 'real' | 'demo'

export interface DataModeValue {
  mode: DataMode
  db: PortfolioDB
  realHasData: boolean
  demoHasData: boolean
  loading: boolean
  openDemo: () => Promise<void>
  switchToReal: () => Promise<void>
  resetDemo: () => Promise<void>
}

const DataModeContext = createContext<DataModeValue | null>(null)

export interface InitialDemoInput {
  realHasData: boolean
  dismissed: boolean
  seeded: boolean
}

/**
 * The demo is only auto-shown once, for a brand-new install. After that the
 * real account is always the default view — never derived from data counts, so
 * clearing your data can not silently bounce you back into the demo.
 */
export function shouldShowInitialDemo({
  realHasData,
  dismissed,
  seeded,
}: InitialDemoInput): boolean {
  return !realHasData && !dismissed && !seeded
}

export function DataModeProvider({ children }: { children: ReactNode }) {
  const realCount = useLiveQuery(() => realDb.accounts.count(), [])
  const demoCount = useLiveQuery(() => demoDb.accounts.count(), [])
  const realSettings = useLiveQuery(() => realDb.settings.get('app'), [])
  const [manualDemo, setManualDemo] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)

  const loading = realCount === undefined || demoCount === undefined || realSettings === undefined
  const realHasData = (realCount ?? 0) > 0
  const demoHasData = (demoCount ?? 0) > 0
  const dismissed = realSettings?.demoDismissed === true
  const seeded = realSettings?.demoSeeded === true

  // One-time migration: move demo data that older builds wrote into the real
  // database over to the isolated demo database.
  useEffect(() => {
    void migrateLegacyDemoData(realDb, demoDb)
  }, [])

  // One-time first-run showcase.
  useEffect(() => {
    if (loading || bootstrapped) return
    setBootstrapped(true)
    if (!shouldShowInitialDemo({ realHasData, dismissed, seeded })) return
    void (async () => {
      if ((await demoDb.accounts.count()) === 0) await seedDemoData(demoDb)
      await saveSettings({ demoSeeded: true, demoDismissed: false }, realDb)
      setManualDemo(true)
    })()
  }, [loading, bootstrapped, realHasData, dismissed, seeded])

  const mode: DataMode = manualDemo ? 'demo' : 'real'

  const value = useMemo<DataModeValue>(
    () => ({
      mode,
      db: mode === 'demo' ? demoDb : realDb,
      realHasData,
      demoHasData,
      loading,
      openDemo: async () => {
        if ((await demoDb.accounts.count()) === 0) await seedDemoData(demoDb)
        await saveSettings({ demoDismissed: false, demoSeeded: true }, realDb)
        setManualDemo(true)
      },
      switchToReal: async () => {
        setManualDemo(false)
        await saveSettings({ demoDismissed: true }, realDb)
      },
      resetDemo: async () => {
        await clearAllData(demoDb)
        await seedDemoData(demoDb)
        await saveSettings({ demoDismissed: false, demoSeeded: true }, realDb)
        setManualDemo(true)
      },
    }),
    [mode, realHasData, demoHasData, loading],
  )

  return <DataModeContext.Provider value={value}>{children}</DataModeContext.Provider>
}

export function useOptionalDataMode(): DataModeValue | null {
  return useContext(DataModeContext)
}

export function useDataMode(): DataModeValue {
  const value = useContext(DataModeContext)
  if (!value) throw new Error('useDataMode must be used within a DataModeProvider')
  return value
}

export function useActiveDb(): PortfolioDB {
  return useDataMode().db
}
