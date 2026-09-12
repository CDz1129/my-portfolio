import Dexie, { type Table } from 'dexie'
import type { Account, Group, Holding, Settings, Transaction } from '@/domain/types'

export class PortfolioDB extends Dexie {
  accounts!: Table<Account, string>
  holdings!: Table<Holding, string>
  groups!: Table<Group, string>
  transactions!: Table<Transaction, string>
  settings!: Table<Settings, string>

  constructor(name = 'my-portfolio') {
    super(name)
    this.version(1).stores({
      accounts: 'id, kind, groupId, archived, createdAt',
      holdings: 'id, accountId, symbol, market',
      groups: 'id, createdAt',
      transactions: 'id, type, date, accountId, holdingId, createdAt',
      settings: 'id',
    })
  }
}

export function createDatabase(name?: string): PortfolioDB {
  return new PortfolioDB(name)
}

export const REAL_DB_NAME = 'my-portfolio'
export const DEMO_DB_NAME = 'my-portfolio-demo'

export const db = createDatabase(REAL_DB_NAME)
export const demoDb = createDatabase(DEMO_DB_NAME)
