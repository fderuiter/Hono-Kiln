import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleMysql, type MySql2Database } from 'drizzle-orm/mysql2'
import postgres from 'postgres'
import mysql from 'mysql2/promise'

import * as config from '../../../kiln.json'
import * as schema from './schema'

export function createDatabase(url: string, authToken?: string): Database {
  const provider = config.provider || 'libsql'

  if (url === ':memory:') {
    const client = createClient({ url });
    return drizzleLibsql(client, { schema }) as any;
  }

  if (provider === 'postgresql') {
    const client = postgres(url)
    return drizzlePg(client, { schema }) as any
  }

  if (provider === 'mysql') {
    const pool = mysql.createPool(url)
    return drizzleMysql(pool, { schema, mode: 'default' }) as any
  }

  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  })
  return drizzleLibsql(client, { schema }) as any
}

export type Database = typeof config.provider extends 'postgresql'
  ? PostgresJsDatabase<typeof schema>
  : typeof config.provider extends 'mysql'
  ? MySql2Database<typeof schema>
  : LibSQLDatabase<typeof schema>
