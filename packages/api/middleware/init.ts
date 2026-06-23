import { createMiddleware } from 'hono/factory'
import { env } from 'hono/adapter'

import type { Bindings } from '../app'
import { createAuth, type Auth } from '../auth'
import { createDatabase, type Database } from '../db'
import { DEFAULT_DATABASE_URL } from '../db/config'

declare module 'hono' {
  interface ContextVariableMap {
    db: Database
    auth: Auth
  }
}

export const initMiddleware = createMiddleware<{ Bindings: Bindings }>(
  async (c, next) => {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN, NODE_ENV } = env(c)

    const dbUrl = DATABASE_URL ?? DEFAULT_DATABASE_URL
    const db = createDatabase(dbUrl, DATABASE_AUTH_TOKEN)
    const isProd = NODE_ENV === 'production'
    const auth = createAuth(db, isProd)

    c.set('db', db)
    c.set('auth', auth)

    await next()
  }
)
