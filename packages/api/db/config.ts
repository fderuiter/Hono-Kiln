type DatabaseEnv = {
  DATABASE_URL?: string
  DATABASE_AUTH_TOKEN?: string
}

export const DEFAULT_DATABASE_URL = 'http://127.0.0.1:8080'

/**
 * Returns the environment object, safely falling back to global Bun.env or process.env
 * when no environment is provided. This is primarily for local tooling and tests.
 */
function getSafeEnv(env?: DatabaseEnv): DatabaseEnv {
  if (env) return env

  // Safely check for Bun.env and process.env at runtime
  if (typeof Bun !== 'undefined') return Bun.env
  if (typeof process !== 'undefined') return process.env

  return {}
}

export function getDatabaseUrl(env?: DatabaseEnv) {
  const safeEnv = getSafeEnv(env)
  return safeEnv.DATABASE_URL ?? DEFAULT_DATABASE_URL
}

export function getDatabaseAuthToken(env?: DatabaseEnv) {
  const safeEnv = getSafeEnv(env)
  return safeEnv.DATABASE_AUTH_TOKEN
}
