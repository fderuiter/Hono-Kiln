import { defineConfig } from 'drizzle-kit'

import { getDatabaseAuthToken, getDatabaseUrl } from './db/config'
import config from '../../kiln.json'

const authToken = getDatabaseAuthToken()
const provider = config.provider || 'libsql'
const dialect = provider === 'postgresql' ? 'postgresql' : 'turso'

export default defineConfig({
  dialect,
  schema: './db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: getDatabaseUrl(),
    ...(authToken ? { authToken } : {}),
  },
})
