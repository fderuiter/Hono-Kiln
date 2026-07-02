import { createMiddleware } from 'hono/factory'
import { env } from 'hono/adapter'

import { createAuth } from '../auth'
import { createDatabase } from '../db'
import type { AppEnv, EnvBindings } from '../env'

export const initMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const bindings = env<EnvBindings>(c)
  const { DATABASE_URL, DATABASE_AUTH_TOKEN, NODE_ENV, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } = bindings

  if (!DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL')
  }
  const isLite = DATABASE_URL.startsWith('file:')

  if (!isLite && !DATABASE_AUTH_TOKEN) {
    throw new Error('Missing required environment variable: DATABASE_AUTH_TOKEN')
  }
  if (!NODE_ENV) {
    throw new Error('Missing required environment variable: NODE_ENV')
  }

  if (RATE_LIMIT_MAX !== undefined && isNaN(parseInt(RATE_LIMIT_MAX, 10))) {
    throw new Error('Invalid environment variable: RATE_LIMIT_MAX must be a number')
  }
  if (RATE_LIMIT_WINDOW_MS !== undefined && isNaN(parseInt(RATE_LIMIT_WINDOW_MS, 10))) {
    throw new Error('Invalid environment variable: RATE_LIMIT_WINDOW_MS must be a number')
  }

  const dbUrl = DATABASE_URL
  const db = createDatabase(dbUrl, DATABASE_AUTH_TOKEN)
  const isProd = NODE_ENV === 'production'
  const auth = createAuth(db, isProd)

  c.set('db', db)
  c.set('auth', auth)

  await next()
})
