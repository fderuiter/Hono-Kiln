import type { Database } from './db'
import type { Auth } from './auth'
import type { Session, User } from 'lucia'

/**
 * Environment bindings injected into the Hono application.
 */
export type EnvBindings = {
  DATABASE_URL?: string
  DATABASE_AUTH_TOKEN?: string
  NODE_ENV?: string
}

/**
 * Standardized application environment type for Hono instances.
 * Provides strictly typed access to context variables like db and auth.
 */
export interface AppEnv {
  Bindings: EnvBindings
  Variables: {
    db: Database
    auth: Auth
    user: User | null
    session: Session | null
  }
}
