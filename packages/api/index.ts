import app from './app'
import { runPreflightChecks } from './preflight'

/**
 * The main application router exported for programmatic use or testing.
 */
const exportedApp = app

export type { AppEnv, EnvBindings } from './env'
export default exportedApp

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000)
  console.log(`API server running on http://localhost:${port}`)
  Bun.serve({
    fetch: app.fetch,
    port,
  })

  const missingVars = ['DATABASE_URL', 'DATABASE_AUTH_TOKEN', 'NODE_ENV'].filter(
    (key) => !Bun.env[key]
  )

  if (missingVars.length > 0) {
    console.warn(`Warning: Missing required environment variables: ${missingVars.join(', ')}. Core features will fail.`)
  } else {
    runPreflightChecks().catch((err) => {
      console.error('Preflight checks failed:', err)
    })
  }
}
