import type { Database } from './db'
import type { Auth } from './auth'
import type { Session, User } from 'lucia'

export type EnvBindings = {
  DATABASE_URL?: string
  DATABASE_AUTH_TOKEN?: string
  NODE_ENV?: string
}

export interface AppEnv {
  Bindings: EnvBindings
  Variables: {
    db: Database
    auth: Auth
    user: User | null
    session: Session | null
  }
}
