import { integer as sqliteInt, text as sqliteText, sqliteTable, primaryKey as sqlitePK } from 'drizzle-orm/sqlite-core'
import { integer as pgInt, text as pgText, pgTable, primaryKey as pgPK } from 'drizzle-orm/pg-core'

import * as config from '../../../kiln.json'

const provider = (config as any).provider || 'libsql'

export const integer: any = provider === 'postgresql' ? pgInt : sqliteInt
export const text: any = provider === 'postgresql' ? pgText : sqliteText
export const createTable: any = provider === 'postgresql' ? pgTable : sqliteTable
export const primaryKey: any = provider === 'postgresql' ? pgPK : sqlitePK
