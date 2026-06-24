type DatabaseEnv = {
  DATABASE_URL?: string
  DATABASE_AUTH_TOKEN?: string
}

const runtimeEnv: DatabaseEnv =
  typeof Bun !== 'undefined' ? (Bun.env as DatabaseEnv) : (process.env as DatabaseEnv)

export const DEFAULT_DATABASE_URL = 'http://127.0.0.1:8080'

export function getDatabaseUrl(env: DatabaseEnv = runtimeEnv) {
  return env.DATABASE_URL ?? DEFAULT_DATABASE_URL
}

export function getDatabaseAuthToken(env: DatabaseEnv = runtimeEnv) {
  return env.DATABASE_AUTH_TOKEN
}
