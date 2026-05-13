import { defineConfig } from 'drizzle-kit'

import { getDatabaseAuthToken, getDatabaseUrl } from './db/config'

const authToken = getDatabaseAuthToken()

export default defineConfig({
  dialect: 'turso',
  schema: './db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: getDatabaseUrl(),
    ...(authToken ? { authToken } : {}),
  },
})
