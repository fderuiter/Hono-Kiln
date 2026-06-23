import { createClient, type Config } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from './schema'

export function createDatabase(url: string, authToken?: string) {
  const config: Config = {
    url,
  }

  if (authToken) {
    config.authToken = authToken
  }

  const client = createClient(config)

  return drizzle({ client, schema })
}

export type Database = ReturnType<typeof createDatabase>
