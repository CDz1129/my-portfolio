import { describe, it, expect, afterEach } from 'vitest'
import { createDatabase, type PortfolioDB } from './database'
import {
  getSettings,
  saveSettings,
  listAccounts,
  upsertAccount,
  removeAccount,
  listTransactions,
  upsertTransaction,
  removeTransaction,
  listHoldings,
  upsertHolding,
  listGroups,
  upsertGroup,
  exportCsv,
  seedDemoData,
  clearAllData,
  migrateLegacyDemoData,
  exportBackup,
  importBackup,
} from './repository'
import type { Account, Settings } from '@/domain/types'

const opened: PortfolioDB[] = []

function fresh(): PortfolioDB {
  const database = createDatabase(`test-${Math.random().toString(36).slice(2)}`)
  opened.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((database) => database.delete()))
})

const sampleAccount: Account = {
  id: 'acc-1',
  name: '招商银行',
  kind: 'cash',
  currency: 'CNY',
  openingBalance: 10000,
  openingDate: '2024-01-01',
  archived: false,
  createdAt: 1,
}

describe('createDatabase', () => {
  it('opens a database with all expected tables', async () => {
    const opened = fresh()
    await opened.open()
    expect(opened.tables.map((t) => t.name).sort()).toEqual(
      ['accounts', 'groups', 'holdings', 'settings', 'transactions'].sort(),
    )
  })
})

describe('settings', () => {
  it('creates defaults on first read', async () => {
    const opened = fresh()
    const settings = await getSettings(opened)
    expect(settings.baseCurrency).toBe('CNY')
    expect(settings.theme).toBe('system')
    expect(settings.rates.CNY).toBe(1)
    expect(settings.rates.USD).toBeGreaterThan(0)
  })

  it('persists patches such as a new base currency', async () => {
    const opened = fresh()
    await getSettings(opened)
    const updated = await saveSettings({ baseCurrency: 'USD' }, opened)
    expect(updated.baseCurrency).toBe('USD')
    expect((await getSettings(opened)).baseCurrency).toBe('USD')
  })
})

describe('accounts', () => {
  it('upserts and lists accounts', async () => {
    const opened = fresh()
    await upsertAccount(sampleAccount, opened)
    const accounts = await listAccounts(opened)
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toMatchObject({ id: 'acc-1', name: '招商银行' })
  })

  it('updates an existing account in place', async () => {
    const opened = fresh()
    await upsertAccount(sampleAccount, opened)
    await upsertAccount({ ...sampleAccount, name: '招行' }, opened)
    const accounts = await listAccounts(opened)
    expect(accounts).toHaveLength(1)
    expect(accounts[0].name).toBe('招行')
  })

  it('archives instead of removing when set', async () => {
    const opened = fresh()
    await upsertAccount(sampleAccount, opened)
    await upsertAccount({ ...sampleAccount, archived: true }, opened)
    expect((await listAccounts(opened))[0].archived).toBe(true)
  })

  it('removes an account', async () => {
    const opened = fresh()
    await upsertAccount(sampleAccount, opened)
    await removeAccount('acc-1', opened)
    expect(await listAccounts(opened)).toHaveLength(0)
  })
})

describe('transactions', () => {
  it('upserts, lists and removes transactions', async () => {
    const opened = fresh()
    await upsertTransaction(
      {
        id: 'tx-1',
        type: 'income',
        date: '2024-02-01',
        accountId: 'acc-1',
        amount: 500,
        currency: 'CNY',
        createdAt: 1,
      },
      opened,
    )
    expect(await listTransactions(opened)).toHaveLength(1)
    await removeTransaction('tx-1', opened)
    expect(await listTransactions(opened)).toHaveLength(0)
  })
})

describe('groups & holdings', () => {
  it('persists groups and holdings', async () => {
    const opened = fresh()
    await upsertGroup({ id: 'g1', name: '券商', createdAt: 1 }, opened)
    await upsertHolding(
      {
        id: 'h1',
        accountId: 'acc-1',
        symbol: 'VTI',
        market: 'US',
        currency: 'USD',
        openingShares: 3,
        avgCost: 200,
        price: 250,
      },
      opened,
    )
    expect(await listGroups(opened)).toHaveLength(1)
    expect(await listHoldings(opened)).toHaveLength(1)
  })
})

describe('exportCsv', () => {
  it('emits a header and one row per transaction', async () => {
    const opened = fresh()
    await upsertAccount(sampleAccount, opened)
    await upsertTransaction(
      {
        id: 'tx-1',
        type: 'income',
        date: '2024-02-01',
        accountId: 'acc-1',
        amount: 500,
        currency: 'CNY',
        note: '工资',
        createdAt: 1,
      },
      opened,
    )
    const csv = await exportCsv(opened)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toContain('日期')
    expect(lines[0]).toContain('类型')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('2024-02-01')
    expect(lines[1]).toContain('工资')
  })
})

describe('seedDemoData', () => {
  it('creates a non-empty demo portfolio only when empty', async () => {
    const database = fresh()
    await seedDemoData(database)
    expect((await listAccounts(database)).length).toBeGreaterThan(0)
    expect((await listTransactions(database)).length).toBeGreaterThan(0)

    const before = (await listAccounts(database)).length
    await seedDemoData(database)
    expect((await listAccounts(database)).length).toBe(before)
  })

  it('does not mark any settings as demo', async () => {
    const database = fresh()
    await seedDemoData(database)
    expect((await getSettings(database)).demoDismissed).toBeUndefined()
  })

  it('is isolated: seeding one database leaves another untouched', async () => {
    const real = fresh()
    const demo = fresh()
    await seedDemoData(demo)
    expect((await listAccounts(demo)).length).toBeGreaterThan(0)
    expect(await listAccounts(real)).toHaveLength(0)
    expect(await listTransactions(real)).toHaveLength(0)
  })
})

describe('clearAllData', () => {
  it('empties every table in the given database only', async () => {
    const real = fresh()
    const demo = fresh()
    await seedDemoData(demo)
    await clearAllData(real)
    expect(await listAccounts(real)).toHaveLength(0)
    expect(await listHoldings(real)).toHaveLength(0)
    expect(await listGroups(real)).toHaveLength(0)
    expect(await listTransactions(real)).toHaveLength(0)
    expect((await listAccounts(demo)).length).toBeGreaterThan(0)
  })

  it('preserves settings when clearing data', async () => {
    const database = fresh()
    await saveSettings({ baseCurrency: 'USD' }, database)
    await seedDemoData(database)
    await clearAllData(database)
    expect((await getSettings(database)).baseCurrency).toBe('USD')
  })
})

describe('migrateLegacyDemoData', () => {
  it('moves legacy demo data into the demo database and empties the real one', async () => {
    const real = fresh()
    const demo = fresh()
    await seedDemoData(real)
    await saveSettings({ demoData: true } as unknown as Partial<Settings>, real)

    const migrated = await migrateLegacyDemoData(real, demo)

    expect(migrated).toBe(true)
    expect(await listAccounts(real)).toHaveLength(0)
    expect((await listAccounts(demo)).length).toBeGreaterThan(0)
    expect((await listTransactions(demo)).length).toBeGreaterThan(0)
    const settings = await getSettings(real)
    expect((settings as { demoData?: boolean }).demoData).toBeUndefined()
    expect(settings.demoDismissed).toBe(false)
    expect(settings.demoSeeded).toBe(true)
  })

  it('does nothing when the legacy flag is absent and data is not demo data', async () => {
    const real = fresh()
    const demo = fresh()
    await upsertAccount(sampleAccount, real)

    expect(await migrateLegacyDemoData(real, demo)).toBe(false)
    expect(await listAccounts(real)).toHaveLength(1)
    expect(await listAccounts(demo)).toHaveLength(0)
  })

  it('detects legacy demo data by its known seed ids even without the flag', async () => {
    const real = fresh()
    const demo = fresh()
    await seedDemoData(real)

    const migrated = await migrateLegacyDemoData(real, demo)

    expect(migrated).toBe(true)
    expect(await listAccounts(real)).toHaveLength(0)
    expect((await listAccounts(demo)).length).toBeGreaterThan(0)
  })

  it('keeps an already-populated demo database intact', async () => {
    const real = fresh()
    const demo = fresh()
    await seedDemoData(demo)
    const demoBefore = (await listAccounts(demo)).length
    await seedDemoData(real)
    await saveSettings({ demoData: true } as unknown as Partial<Settings>, real)

    await migrateLegacyDemoData(real, demo)

    expect((await listAccounts(demo)).length).toBe(demoBefore)
    expect(await listAccounts(real)).toHaveLength(0)
  })
})

describe('exportBackup / importBackup', () => {
  it('round-trips all data and settings into another database', async () => {
    const source = fresh()
    await seedDemoData(source)
    await saveSettings({ baseCurrency: 'USD' }, source)

    const backup = await exportBackup(source)
    expect(backup.app).toBe('my-portfolio')
    expect(backup.accounts.length).toBeGreaterThan(0)

    const target = fresh()
    await importBackup(backup, target)

    expect((await listAccounts(target)).length).toBe(backup.accounts.length)
    expect((await listHoldings(target)).length).toBe(backup.holdings.length)
    expect((await listTransactions(target)).length).toBe(backup.transactions.length)
    expect((await listGroups(target)).length).toBe(backup.groups.length)
    expect((await getSettings(target)).baseCurrency).toBe('USD')
  })

  it('replaces existing data on restore', async () => {
    const target = fresh()
    await upsertAccount(sampleAccount, target)

    const empty = await exportBackup(fresh())
    await importBackup(empty, target)

    expect(await listAccounts(target)).toHaveLength(0)
  })

  it('rejects files that are not a valid backup', async () => {
    await expect(importBackup({ foo: 'bar' }, fresh())).rejects.toThrow()
    await expect(importBackup(null, fresh())).rejects.toThrow()
  })

  it('does not restore demo navigation flags', async () => {
    const source = fresh()
    await seedDemoData(source)
    await saveSettings({ demoDismissed: true, demoSeeded: true }, source)
    const backup = await exportBackup(source)

    const target = fresh()
    await importBackup(backup, target)
    const settings = await getSettings(target)
    expect(settings.demoDismissed).toBeUndefined()
    expect(settings.demoSeeded).toBeUndefined()
  })
})
