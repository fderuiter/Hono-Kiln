import app from './app'

export default app

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000)
  console.log(`API server running on http://localhost:${port}`)
  Bun.serve({
    fetch: app.fetch,
    port,
  })
}
