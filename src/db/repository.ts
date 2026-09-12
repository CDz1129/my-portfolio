import type { Account, Group, Holding, Settings, Transaction } from '@/domain/types'
import { DEFAULT_BASE_CURRENCY, DEFAULT_RATES } from '@/domain/currency'
import { db as defaultDb, type PortfolioDB } from './database'

const SETTINGS_ID = 'app' as const

export function newId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}_${rand}`
}

function byCreatedAt<T extends { createdAt: number }>(a: T, b: T): number {
  return a.createdAt - b.createdAt
}

export async function getSettings(database: PortfolioDB = defaultDb): Promise<Settings> {
  const existing = await database.settings.get(SETTINGS_ID)
  if (existing) return existing
  const defaults: Settings = {
    id: SETTINGS_ID,
    baseCurrency: DEFAULT_BASE_CURRENCY,
    theme: 'system',
    rates: { ...DEFAULT_RATES },
    autoSync: true,
    syncIntervalDays: 90,
  }
  await database.settings.put(defaults)
  return defaults
}

export async function saveSettings(
  patch: Partial<Settings>,
  database: PortfolioDB = defaultDb,
): Promise<Settings> {
  const current = await getSettings(database)
  const next: Settings = { ...current, ...patch, id: SETTINGS_ID }
  await database.settings.put(next)
  return next
}

export async function listAccounts(database: PortfolioDB = defaultDb): Promise<Account[]> {
  const rows = await database.accounts.toArray()
  return rows.sort(byCreatedAt)
}

export async function upsertAccount(
  account: Account,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await database.accounts.put(account)
}

export async function removeAccount(id: string, database: PortfolioDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.accounts, database.holdings, database.transactions, async () => {
    const holdingIds = (await database.holdings.where('accountId').equals(id).toArray()).map(
      (h) => h.id,
    )
    await database.holdings.bulkDelete(holdingIds)
    const txs = await database.transactions.toArray()
    await database.transactions.bulkDelete(
      txs.filter((t) => t.accountId === id || t.toAccountId === id).map((t) => t.id),
    )
    await database.accounts.delete(id)
  })
}

export async function listHoldings(database: PortfolioDB = defaultDb): Promise<Holding[]> {
  return database.holdings.toArray()
}

export async function upsertHolding(
  holding: Holding,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await database.holdings.put(holding)
}

export async function removeHolding(
  id: string,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await database.holdings.delete(id)
}

export async function listGroups(database: PortfolioDB = defaultDb): Promise<Group[]> {
  const rows = await database.groups.toArray()
  return rows.sort(byCreatedAt)
}

export async function upsertGroup(group: Group, database: PortfolioDB = defaultDb): Promise<void> {
  await database.groups.put(group)
}

export async function removeGroup(id: string, database: PortfolioDB = defaultDb): Promise<void> {
  await database.groups.delete(id)
}

export async function listTransactions(
  database: PortfolioDB = defaultDb,
): Promise<Transaction[]> {
  const rows = await database.transactions.toArray()
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export async function upsertTransaction(
  tx: Transaction,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await database.transactions.put(tx)
}

export async function removeTransaction(
  id: string,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await database.transactions.delete(id)
}

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportCsv(database: PortfolioDB = defaultDb): Promise<string> {
  const [txs, accounts] = await Promise.all([
    database.transactions.toArray(),
    database.accounts.toArray(),
  ])
  const nameOf = new Map(accounts.map((a) => [a.id, a.name]))
  const header = ['日期', '类型', '账户', '目标账户', '金额', '币种', '股数', '价格', '备注']
  const ordered = txs.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  const rows = ordered.map((t) => [
    t.date,
    t.type,
    nameOf.get(t.accountId) ?? t.accountId,
    t.toAccountId ? (nameOf.get(t.toAccountId) ?? t.toAccountId) : '',
    t.amount,
    t.currency,
    t.shares ?? '',
    t.price ?? '',
    t.note ?? '',
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}

function isoDate(monthsAgo: number, day = 1): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  d.setDate(day)
  return d.toISOString().slice(0, 10)
}

export async function seedDemoData(database: PortfolioDB = defaultDb): Promise<void> {
  if ((await database.accounts.count()) > 0) return

  const now = Date.now()
  const base = (offset: number) => ({ createdAt: now + offset })

  const groups: Group[] = [
    { id: 'grp_cash', name: '现金', color: '#22c55e', createdAt: now },
    { id: 'grp_broker', name: '券商', color: '#6366f1', createdAt: now + 1 },
    { id: 'grp_crypto', name: '数字资产', color: '#f59e0b', createdAt: now + 2 },
  ]

  const accounts: Account[] = [
    {
      id: 'acc_cmb',
      name: '招商银行',
      kind: 'cash',
      currency: 'CNY',
      groupId: 'grp_cash',
      openingBalance: 50000,
      openingDate: isoDate(5),
      color: '#ef4444',
      archived: false,
      ...base(0),
    },
    {
      id: 'acc_alipay',
      name: '支付宝',
      kind: 'cash',
      currency: 'CNY',
      groupId: 'grp_cash',
      openingBalance: 8000,
      openingDate: isoDate(5),
      color: '#3b82f6',
      archived: false,
      ...base(1),
    },
    {
      id: 'acc_us',
      name: '美股券商',
      kind: 'investment',
      currency: 'USD',
      groupId: 'grp_broker',
      openingBalance: 2000,
      openingDate: isoDate(5),
      color: '#6366f1',
      archived: false,
      ...base(2),
    },
    {
      id: 'acc_ashare',
      name: 'A股账户',
      kind: 'investment',
      currency: 'CNY',
      groupId: 'grp_broker',
      openingBalance: 30000,
      openingDate: isoDate(5),
      color: '#f97316',
      archived: false,
      ...base(3),
    },
    {
      id: 'acc_crypto',
      name: '币安',
      kind: 'investment',
      currency: 'USDT',
      groupId: 'grp_crypto',
      openingBalance: 1000,
      openingDate: isoDate(5),
      color: '#eab308',
      archived: false,
      ...base(4),
    },
    {
      id: 'acc_house',
      name: '自住房',
      kind: 'fixed',
      currency: 'CNY',
      openingBalance: 2000000,
      openingDate: isoDate(5),
      color: '#0ea5e9',
      archived: false,
      ...base(5),
    },
    {
      id: 'acc_friend',
      name: '借给朋友',
      kind: 'receivable',
      currency: 'CNY',
      openingBalance: 5000,
      openingDate: isoDate(4),
      color: '#14b8a6',
      archived: false,
      ...base(6),
    },
    {
      id: 'acc_mortgage',
      name: '房贷',
      kind: 'liability',
      currency: 'CNY',
      openingBalance: 800000,
      openingDate: isoDate(5),
      color: '#dc2626',
      archived: false,
      ...base(7),
    },
  ]

  const holdings: Holding[] = [
    {
      id: 'hold_vti',
      accountId: 'acc_us',
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      market: 'US',
      currency: 'USD',
      openingShares: 20,
      avgCost: 235,
      price: 285,
    },
    {
      id: 'hold_aapl',
      accountId: 'acc_us',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'US',
      currency: 'USD',
      openingShares: 30,
      avgCost: 180,
      price: 225,
    },
    {
      id: 'hold_maotai',
      accountId: 'acc_ashare',
      symbol: '600519',
      name: '贵州茅台',
      market: 'A',
      currency: 'CNY',
      openingShares: 100,
      avgCost: 1600,
      price: 1720,
    },
    {
      id: 'hold_etf300',
      accountId: 'acc_ashare',
      symbol: '510300',
      name: '沪深300ETF',
      market: 'A',
      currency: 'CNY',
      openingShares: 5000,
      avgCost: 3.6,
      price: 4.05,
    },
    {
      id: 'hold_btc',
      accountId: 'acc_crypto',
      symbol: 'BTC',
      name: 'Bitcoin',
      market: 'CRYPTO',
      currency: 'USDT',
      openingShares: 0.5,
      avgCost: 42000,
      price: 68000,
    },
  ]

  const transactions: Transaction[] = [
    {
      id: 'tx_salary_1',
      type: 'income',
      date: isoDate(4, 10),
      accountId: 'acc_cmb',
      amount: 30000,
      currency: 'CNY',
      note: '工资',
      createdAt: now,
    },
    {
      id: 'tx_salary_2',
      type: 'income',
      date: isoDate(3, 10),
      accountId: 'acc_cmb',
      amount: 30000,
      currency: 'CNY',
      note: '工资',
      createdAt: now + 1,
    },
    {
      id: 'tx_salary_3',
      type: 'income',
      date: isoDate(2, 10),
      accountId: 'acc_cmb',
      amount: 32000,
      currency: 'CNY',
      note: '工资',
      createdAt: now + 2,
    },
    {
      id: 'tx_rent_1',
      type: 'expense',
      date: isoDate(4, 15),
      accountId: 'acc_cmb',
      amount: 6000,
      currency: 'CNY',
      note: '房租',
      createdAt: now + 3,
    },
    {
      id: 'tx_rent_2',
      type: 'expense',
      date: isoDate(3, 15),
      accountId: 'acc_cmb',
      amount: 6000,
      currency: 'CNY',
      note: '房租',
      createdAt: now + 4,
    },
    {
      id: 'tx_rent_3',
      type: 'expense',
      date: isoDate(2, 15),
      accountId: 'acc_cmb',
      amount: 6000,
      currency: 'CNY',
      note: '房租',
      createdAt: now + 5,
    },
    {
      id: 'tx_mortgage_1',
      type: 'expense',
      date: isoDate(3, 20),
      accountId: 'acc_cmb',
      amount: 4800,
      currency: 'CNY',
      note: '房贷还款',
      createdAt: now + 6,
    },
    {
      id: 'tx_mortgage_2',
      type: 'expense',
      date: isoDate(2, 20),
      accountId: 'acc_cmb',
      amount: 4800,
      currency: 'CNY',
      note: '房贷还款',
      createdAt: now + 7,
    },
    {
      id: 'tx_transfer_broker',
      type: 'transfer',
      date: isoDate(3, 5),
      accountId: 'acc_cmb',
      toAccountId: 'acc_ashare',
      amount: 20000,
      currency: 'CNY',
      note: '转入券商',
      createdAt: now + 8,
    },
    {
      id: 'tx_buy_maotai',
      type: 'buy',
      date: isoDate(3, 6),
      accountId: 'acc_ashare',
      holdingId: 'hold_maotai',
      amount: 0,
      currency: 'CNY',
      shares: 20,
      price: 1650,
      note: '买入贵州茅台',
      createdAt: now + 9,
    },
    {
      id: 'tx_adjust_alipay',
      type: 'adjust',
      date: isoDate(1, 1),
      accountId: 'acc_alipay',
      amount: 12000,
      currency: 'CNY',
      note: '月末盘点',
      createdAt: now + 10,
    },
  ]

  await database.transaction(
    'rw',
    database.accounts,
    database.holdings,
    database.groups,
    database.transactions,
    async () => {
      await database.groups.bulkPut(groups)
      await database.accounts.bulkPut(accounts)
      await database.holdings.bulkPut(holdings)
      await database.transactions.bulkPut(transactions)
    },
  )
}

export async function clearAllData(database: PortfolioDB = defaultDb): Promise<void> {
  await database.transaction(
    'rw',
    database.accounts,
    database.holdings,
    database.groups,
    database.transactions,
    async () => {
      await Promise.all([
        database.accounts.clear(),
        database.holdings.clear(),
        database.groups.clear(),
        database.transactions.clear(),
      ])
    },
  )
}

/**
 * Older builds seeded demo data into the real database. Move that content into
 * the isolated demo database and leave the real one empty, so "my data" and
 * "demo data" are cleanly separated. Detected either by the legacy `demoData`
 * flag or by the well-known seed account ids.
 */
export const DEMO_ACCOUNT_IDS = [
  'acc_cmb',
  'acc_alipay',
  'acc_us',
  'acc_ashare',
  'acc_crypto',
  'acc_house',
  'acc_friend',
  'acc_mortgage',
] as const

export async function migrateLegacyDemoData(
  real: PortfolioDB,
  demo: PortfolioDB,
): Promise<boolean> {
  const raw = (await real.settings.get(SETTINGS_ID)) as
    | (Settings & { demoData?: boolean })
    | undefined
  const realAccounts = await real.accounts.toArray()
  const hasDemoIds = realAccounts.some((a) =>
    (DEMO_ACCOUNT_IDS as readonly string[]).includes(a.id),
  )
  if (raw?.demoData !== true && !hasDemoIds) return false

  const [groups, holdings, transactions] = await Promise.all([
    real.groups.toArray(),
    real.holdings.toArray(),
    real.transactions.toArray(),
  ])

  await demo.transaction(
    'rw',
    demo.groups,
    demo.accounts,
    demo.holdings,
    demo.transactions,
    async () => {
      if ((await demo.accounts.count()) === 0) {
        await demo.groups.bulkPut(groups)
        await demo.accounts.bulkPut(realAccounts)
        await demo.holdings.bulkPut(holdings)
        await demo.transactions.bulkPut(transactions)
      }
    },
  )

  await clearAllData(real)

  const base = raw ?? (await getSettings(real))
  const rest = { ...base } as Settings & { demoData?: boolean }
  delete rest.demoData
  await real.settings.put({
    ...rest,
    id: SETTINGS_ID,
    demoDismissed: false,
    demoSeeded: true,
  })
  return true
}

export const BACKUP_APP = 'my-portfolio'
export const BACKUP_VERSION = 1

export interface BackupPayload {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  settings: Settings
  accounts: Account[]
  holdings: Holding[]
  groups: Group[]
  transactions: Transaction[]
}

export async function exportBackup(database: PortfolioDB = defaultDb): Promise<BackupPayload> {
  const [accounts, holdings, groups, transactions, settings] = await Promise.all([
    listAccounts(database),
    listHoldings(database),
    listGroups(database),
    listTransactions(database),
    getSettings(database),
  ])
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    accounts,
    holdings,
    groups,
    transactions,
  }
}

function assertArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`备份文件缺少有效的「${field}」列表`)
  return value
}

export function validateBackup(value: unknown): BackupPayload {
  if (!value || typeof value !== 'object') throw new Error('备份文件格式不正确')
  const payload = value as Partial<BackupPayload>
  if (payload.app !== BACKUP_APP) throw new Error('这不是本应用的备份文件')
  const accounts = assertArray(payload.accounts, '账户') as Account[]
  const holdings = assertArray(payload.holdings, '持仓') as Holding[]
  const groups = assertArray(payload.groups, '分组') as Group[]
  const transactions = assertArray(payload.transactions, '流水') as Transaction[]
  if (accounts.some((a) => !a || typeof a.id !== 'string')) {
    throw new Error('备份中的账户数据损坏')
  }
  return {
    app: BACKUP_APP,
    version: payload.version ?? BACKUP_VERSION,
    exportedAt: payload.exportedAt ?? new Date().toISOString(),
    settings: payload.settings as Settings,
    accounts,
    holdings,
    groups,
    transactions,
  }
}

export async function importBackup(
  value: unknown,
  database: PortfolioDB = defaultDb,
): Promise<BackupPayload> {
  const payload = validateBackup(value)

  await database.transaction(
    'rw',
    database.accounts,
    database.holdings,
    database.groups,
    database.transactions,
    async () => {
      await Promise.all([
        database.accounts.clear(),
        database.holdings.clear(),
        database.groups.clear(),
        database.transactions.clear(),
      ])
      await database.groups.bulkPut(payload.groups)
      await database.accounts.bulkPut(payload.accounts)
      await database.holdings.bulkPut(payload.holdings)
      await database.transactions.bulkPut(payload.transactions)
    },
  )

  if (payload.settings) {
    // Only restore user-facing preferences; never restore demo navigation flags.
    await saveSettings(
      {
        baseCurrency: payload.settings.baseCurrency,
        theme: payload.settings.theme,
        rates: payload.settings.rates,
        ratesUpdatedAt: payload.settings.ratesUpdatedAt,
        autoSync: payload.settings.autoSync,
        syncIntervalDays: payload.settings.syncIntervalDays,
        lastSyncAt: payload.settings.lastSyncAt,
      },
      database,
    )
  }

  return payload
}
