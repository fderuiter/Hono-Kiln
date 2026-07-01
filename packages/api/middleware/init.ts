import { createMiddleware } from 'hono/factory'
import { env } from 'hono/adapter'

import { createAuth } from '../auth'
import { createDatabase } from '../db'
import type { AppEnv, EnvBindings } from '../env'

export const initMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN, NODE_ENV } = env<EnvBindings>(c)

  if (!DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL')
  }
  if (!DATABASE_AUTH_TOKEN) {
    throw new Error('Missing required environment variable: DATABASE_AUTH_TOKEN')
  }
  if (!NODE_ENV) {
    throw new Error('Missing required environment variable: NODE_ENV')
  }

  const dbUrl = DATABASE_URL
  const db = createDatabase(dbUrl, DATABASE_AUTH_TOKEN)
  const isProd = NODE_ENV === 'production'
  const auth = createAuth(db, isProd)

  c.set('db', db)
  c.set('auth', auth)

  await next()
})
