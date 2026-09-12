import { describe, it, expect, afterEach } from 'vitest'
import { createDatabase, type PortfolioDB } from '@/db/database'
import { listAccounts, listTransactions, listHoldings } from '@/db/repository'
import {
  createAccount,
  updateAccount,
  archiveAccount,
  recordTransaction,
  addHolding,
} from './actions'

let db: PortfolioDB
afterEach(async () => {
  if (db) await db.delete()
})
function fresh() {
  db = createDatabase(`act-${Math.random().toString(36).slice(2)}`)
  return db
}

describe('createAccount', () => {
  it('fills in defaults and persists the account', async () => {
    const opened = fresh()
    const account = await createAccount(
      { name: '工资卡', kind: 'cash', currency: 'CNY', openingBalance: 5000 },
      opened,
    )
    expect(account.id).toBeTruthy()
    expect(account.archived).toBe(false)
    expect(account.createdAt).toBeGreaterThan(0)
    expect(account.openingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const saved = await listAccounts(opened)
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('工资卡')
  })

  it('trims the account name and rejects empty names', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: '  备用金  ', kind: 'cash', currency: 'CNY', openingBalance: 0 },
      opened,
    )
    expect(acc.name).toBe('备用金')
    await expect(
      createAccount({ name: '   ', kind: 'cash', currency: 'CNY', openingBalance: 0 }, opened),
    ).rejects.toThrow(/名称/)
  })
})

describe('updateAccount / archiveAccount', () => {
  it('updates fields and archives', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: 'A', kind: 'cash', currency: 'CNY', openingBalance: 0 },
      opened,
    )
    await updateAccount(acc.id, { name: 'B', openingBalance: 100 }, opened)
    let saved = (await listAccounts(opened))[0]
    expect(saved.name).toBe('B')
    expect(saved.openingBalance).toBe(100)

    await archiveAccount(acc.id, true, opened)
    saved = (await listAccounts(opened))[0]
    expect(saved.archived).toBe(true)
  })
})

describe('recordTransaction', () => {
  it('records an income with an id and timestamp', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: '卡', kind: 'cash', currency: 'CNY', openingBalance: 0 },
      opened,
    )
    const tx = await recordTransaction(
      { type: 'income', date: '2024-05-01', amount: 1000, currency: 'CNY', accountId: acc.id },
      opened,
    )
    expect(tx.id).toBeTruthy()
    expect(tx.createdAt).toBeGreaterThan(0)
    expect(await listTransactions(opened)).toHaveLength(1)
  })

  it('rejects a transfer without a destination', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: '卡', kind: 'cash', currency: 'CNY', openingBalance: 0 },
      opened,
    )
    await expect(
      recordTransaction(
        { type: 'transfer', date: '2024-05-01', amount: 10, currency: 'CNY', accountId: acc.id },
        opened,
      ),
    ).rejects.toThrow(/目标/)
  })

  it('rejects a buy without a holding or shares', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: '券商', kind: 'investment', currency: 'CNY', openingBalance: 0 },
      opened,
    )
    await expect(
      recordTransaction(
        { type: 'buy', date: '2024-05-01', amount: 0, currency: 'CNY', accountId: acc.id },
        opened,
      ),
    ).rejects.toThrow()
  })

  it('records a buy that references a holding', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: '券商', kind: 'investment', currency: 'CNY', openingBalance: 100000 },
      opened,
    )
    const h = await addHolding(
      { accountId: acc.id, symbol: 'VTI', market: 'US', currency: 'USD', price: 250 },
      opened,
    )
    const tx = await recordTransaction(
      {
        type: 'buy',
        date: '2024-05-01',
        amount: 0,
        currency: 'USD',
        accountId: acc.id,
        holdingId: h.id,
        shares: 2,
        price: 250,
      },
      opened,
    )
    expect(tx.holdingId).toBe(h.id)
    expect(tx.shares).toBe(2)
  })
})

describe('addHolding', () => {
  it('creates a holding with defaults and persists it', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: '券商', kind: 'investment', currency: 'CNY', openingBalance: 0 },
      opened,
    )
    const h = await addHolding(
      {
        accountId: acc.id,
        symbol: '600519',
        name: '贵州茅台',
        market: 'A',
        currency: 'CNY',
        openingShares: 10,
        avgCost: 1600,
        price: 1720,
      },
      opened,
    )
    expect(h.id).toBeTruthy()
    const saved = await listHoldings(opened)
    expect(saved).toHaveLength(1)
    expect(saved[0].symbol).toBe('600519')
  })

  it('rejects a holding without a symbol', async () => {
    const opened = fresh()
    const acc = await createAccount(
      { name: '券商', kind: 'investment', currency: 'CNY', openingBalance: 0 },
      opened,
    )
    await expect(
      addHolding({ accountId: acc.id, symbol: '  ', market: 'A', currency: 'CNY', price: 1 }, opened),
    ).rejects.toThrow(/代码|名称/)
  })
})
