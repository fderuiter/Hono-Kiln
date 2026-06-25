import app from './app'

export default app

if (import.meta.main) {
  const missingVars = ['DATABASE_URL', 'DATABASE_AUTH_TOKEN', 'NODE_ENV'].filter(
    (key) => !Bun.env[key]
  )

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`)
    process.exit(1)
  }

  const port = Number(Bun.env.PORT ?? 3000)
  console.log(`API server running on http://localhost:${port}`)
  Bun.serve({
    fetch: app.fetch,
    port,
  })
}
