import { integer as sqliteInt, text as sqliteText, sqliteTable, primaryKey as sqlitePK } from 'drizzle-orm/sqlite-core'
import { integer as pgInt, text as pgText, pgTable, primaryKey as pgPK } from 'drizzle-orm/pg-core'
import { int as mysqlInt, text as mysqlText, mysqlTable, primaryKey as mysqlPK } from 'drizzle-orm/mysql-core'

import * as config from '../../../kiln.json'

const provider = (config as any).provider || 'libsql'

export const integer: any = provider === 'postgresql' ? pgInt : provider === 'mysql' ? mysqlInt : sqliteInt
export const text: any = provider === 'postgresql' ? pgText : provider === 'mysql' ? mysqlText : sqliteText
export const createTable: any = provider === 'postgresql' ? pgTable : provider === 'mysql' ? mysqlTable : sqliteTable
export const primaryKey: any = provider === 'postgresql' ? pgPK : provider === 'mysql' ? mysqlPK : sqlitePK
