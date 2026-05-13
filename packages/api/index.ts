import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Hono Kiln API' }))
app.get('/health', (c) => c.json({ status: 'ok' }))
app.get('/health/live', (c) => c.json({ status: 'ok' }))
app.get('/health/ready', (c) => c.json({ status: 'ok' }))

export default app

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000)
  console.log(`API server running on http://localhost:${port}`)
  Bun.serve({
    fetch: app.fetch,
    port,
  })
}
