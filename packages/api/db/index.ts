import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

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

  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  })
  return drizzleLibsql(client, { schema }) as any
}

export type Database = typeof config.provider extends 'postgresql'
  ? PostgresJsDatabase<typeof schema>
  : LibSQLDatabase<typeof schema>
