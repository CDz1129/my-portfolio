import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db as realDb, type PortfolioDB } from '@/db/database'
import { getSettings } from '@/db/repository'
import { DEFAULT_BASE_CURRENCY, DEFAULT_RATES } from '@/domain/currency'
import type { Account, Group, Holding, Settings, Transaction } from '@/domain/types'
import { buildOverview, type Overview } from '@/domain/overview'
import { useOptionalDataMode, type DataMode } from './DataMode'

export interface PortfolioData {
  accounts: Account[]
  holdings: Holding[]
  groups: Group[]
  transactions: Transaction[]
  settings: Settings
  overview: Overview
  loading: boolean
  db: PortfolioDB
  mode: DataMode
}

export const FALLBACK_SETTINGS: Settings = {
  id: 'app',
  baseCurrency: DEFAULT_BASE_CURRENCY,
  theme: 'system',
  rates: { ...DEFAULT_RATES },
  autoSync: true,
  syncIntervalDays: 90,
}

export function usePortfolioData(): PortfolioData {
  const ctx = useOptionalDataMode()
  const dataDb = ctx?.db ?? realDb
  const mode: DataMode = ctx?.mode ?? 'real'
  const accounts = useLiveQuery(() => dataDb.accounts.toArray(), [dataDb], [] as Account[])
  const holdings = useLiveQuery(() => dataDb.holdings.toArray(), [dataDb], [] as Holding[])
  const groups = useLiveQuery(() => dataDb.groups.toArray(), [dataDb], [] as Group[])
  const transactions = useLiveQuery(
    () => dataDb.transactions.toArray(),
    [dataDb],
    [] as Transaction[],
  )
  // Settings are app-level preferences and always live in the real database.
  // NOTE: the live-query querier must stay read-only; defaults are persisted here instead.
  const storedSettings = useLiveQuery(() => realDb.settings.get('app'), [])
  const settings = storedSettings ?? FALLBACK_SETTINGS

  useEffect(() => {
    void getSettings(realDb)
  }, [])

  const overview = useMemo(
    () => buildOverview({ accounts, holdings, transactions, settings }),
    [accounts, holdings, transactions, settings],
  )

  return {
    accounts,
    holdings,
    groups,
    transactions,
    settings,
    overview,
    loading: storedSettings === undefined,
    db: dataDb,
    mode,
  }
}
