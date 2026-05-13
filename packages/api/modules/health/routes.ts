import { Hono } from 'hono'

export const healthRoutes = new Hono()

healthRoutes.get('/', (c) => c.json({ status: 'ok' }))
healthRoutes.get('/live', (c) => c.json({ status: 'ok' }))
healthRoutes.get('/ready', (c) => c.json({ status: 'ok' }))
