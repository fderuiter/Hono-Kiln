import app from './app'
import { runPreflightChecks } from './preflight'

/**
 * The main application router exported for programmatic use or testing.
 */
const exportedApp = app

export type { AppEnv, EnvBindings } from './env'
export { requirePermission } from './auth/guard'
export { registerAuthProvider, authProviders, type AuthProvider } from './auth/index'

export default exportedApp

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000)

  const missingVars = ['DATABASE_URL', 'DATABASE_AUTH_TOKEN', 'NODE_ENV'].filter(
    (key) => {
      if (key === 'DATABASE_AUTH_TOKEN' && Bun.env.DATABASE_URL?.startsWith('file:')) return false
      return !Bun.env[key]
    }
  )

  if (missingVars.length > 0) {
    console.warn(`Warning: Missing required environment variables: ${missingVars.join(', ')}. Core features will fail.`)
  }

  try {
    await runPreflightChecks()
  } catch (err) {
    console.error('Preflight checks failed:', err)
    process.exit(1)
  }

  console.log(`API preflight checks passed.`)
}
