import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from './schema'

export function createDatabase(url: string, authToken?: string) {
  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  })

  return drizzle({ client, schema })
}

export type Database = ReturnType<typeof createDatabase>
