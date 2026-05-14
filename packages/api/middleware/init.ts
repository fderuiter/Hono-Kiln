import { createMiddleware } from 'hono/factory'
import { env } from 'hono/adapter'

import { createAuth, type Auth } from '../auth'
import { createDatabase, type Database } from '../db'
import { DEFAULT_DATABASE_URL } from '../db/config'

declare module 'hono' {
  interface ContextVariableMap {
    db: Database
    auth: Auth
  }
}

type EnvBindings = {
  DATABASE_URL?: string
  DATABASE_AUTH_TOKEN?: string
  NODE_ENV?: string
}

export const initMiddleware = createMiddleware(async (c, next) => {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN, NODE_ENV } = env<EnvBindings>(c)

  const dbUrl = DATABASE_URL ?? DEFAULT_DATABASE_URL
  const db = createDatabase(dbUrl, DATABASE_AUTH_TOKEN)
  const isProd = NODE_ENV === 'production'
  const auth = createAuth(db, isProd)

  c.set('db', db)
  c.set('auth', auth)

  await next()
})
