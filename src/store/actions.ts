import type {
  Account,
  AccountKind,
  Group,
  Holding,
  Market,
  Transaction,
  TxType,
} from '@/domain/types'
import {
  newId,
  removeAccount,
  removeGroup,
  removeHolding,
  removeTransaction,
  upsertAccount,
  upsertGroup,
  upsertHolding,
  upsertTransaction,
} from '@/db/repository'
import { db as defaultDb, type PortfolioDB } from '@/db/database'

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface NewAccountInput {
  name: string
  kind: AccountKind
  currency: string
  openingBalance: number
  openingDate?: string
  groupId?: string
  color?: string
  icon?: string
  note?: string
}

export async function createAccount(
  input: NewAccountInput,
  database: PortfolioDB = defaultDb,
): Promise<Account> {
  const name = input.name.trim()
  if (!name) throw new Error('账户名称不能为空')
  const account: Account = {
    id: newId('acc'),
    name,
    kind: input.kind,
    currency: input.currency,
    openingBalance: Number(input.openingBalance) || 0,
    openingDate: input.openingDate ?? today(),
    groupId: input.groupId,
    color: input.color,
    icon: input.icon,
    note: input.note,
    archived: false,
    createdAt: Date.now(),
  }
  await upsertAccount(account, database)
  return account
}

export async function updateAccount(
  id: string,
  patch: Partial<Account>,
  database: PortfolioDB = defaultDb,
): Promise<Account> {
  const existing = await database.accounts.get(id)
  if (!existing) throw new Error('账户不存在')
  const next: Account = { ...existing, ...patch, id }
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new Error('账户名称不能为空')
    next.name = name
  }
  await upsertAccount(next, database)
  return next
}

export async function archiveAccount(
  id: string,
  archived = true,
  database: PortfolioDB = defaultDb,
): Promise<Account> {
  return updateAccount(id, { archived }, database)
}

export async function deleteAccount(
  id: string,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await removeAccount(id, database)
}

export interface NewTransactionInput {
  type: TxType
  date: string
  amount: number
  currency: string
  accountId: string
  toAccountId?: string
  holdingId?: string
  shares?: number
  price?: number
  note?: string
}

export async function recordTransaction(
  input: NewTransactionInput,
  database: PortfolioDB = defaultDb,
): Promise<Transaction> {
  if (!input.accountId) throw new Error('请选择账户')
  if (input.type === 'transfer') {
    if (!input.toAccountId) throw new Error('请选择目标账户')
    if (input.toAccountId === input.accountId) throw new Error('转出和转入账户不能相同')
  }
  if (input.type === 'buy' || input.type === 'sell') {
    if (!input.holdingId) throw new Error('请选择持仓')
    if (!input.shares || input.shares <= 0) throw new Error('请输入有效股数')
  }
  if (input.type === 'income' || input.type === 'expense') {
    if (!input.amount || input.amount <= 0) throw new Error('请输入有效金额')
  }

  const tx: Transaction = {
    id: newId('tx'),
    createdAt: Date.now(),
    ...input,
    amount: Number(input.amount) || 0,
  }
  await upsertTransaction(tx, database)
  return tx
}

export async function deleteTransaction(
  id: string,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await removeTransaction(id, database)
}

export interface NewHoldingInput {
  accountId: string
  symbol: string
  name?: string
  market: Market
  currency: string
  openingShares?: number
  avgCost?: number
  price: number
}

export async function addHolding(
  input: NewHoldingInput,
  database: PortfolioDB = defaultDb,
): Promise<Holding> {
  const symbol = input.symbol.trim()
  if (!symbol) throw new Error('股票/资产代码不能为空')
  const holding: Holding = {
    id: newId('hold'),
    accountId: input.accountId,
    symbol,
    name: input.name?.trim() || undefined,
    market: input.market,
    currency: input.currency,
    openingShares: Number(input.openingShares) || 0,
    avgCost: Number(input.avgCost) || 0,
    price: Number(input.price) || 0,
    priceUpdatedAt: Date.now(),
  }
  await upsertHolding(holding, database)
  return holding
}

export async function updateHolding(
  id: string,
  patch: Partial<Holding>,
  database: PortfolioDB = defaultDb,
): Promise<Holding> {
  const existing = await database.holdings.get(id)
  if (!existing) throw new Error('持仓不存在')
  const next: Holding = { ...existing, ...patch, id, priceUpdatedAt: Date.now() }
  await upsertHolding(next, database)
  return next
}

export async function deleteHolding(
  id: string,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await removeHolding(id, database)
}

export async function createGroup(
  name: string,
  color?: string,
  database: PortfolioDB = defaultDb,
): Promise<Group> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('分组名称不能为空')
  const group: Group = { id: newId('grp'), name: trimmed, color, createdAt: Date.now() }
  await upsertGroup(group, database)
  return group
}

export async function deleteGroup(
  id: string,
  database: PortfolioDB = defaultDb,
): Promise<void> {
  await removeGroup(id, database)
}
