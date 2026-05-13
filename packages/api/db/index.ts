import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import { getDatabaseAuthToken, getDatabaseUrl } from './config'
import * as schema from './schema'

const authToken = getDatabaseAuthToken()

export const client = createClient({
  url: getDatabaseUrl(),
  ...(authToken ? { authToken } : {}),
})

export const db = drizzle({ client, schema })
