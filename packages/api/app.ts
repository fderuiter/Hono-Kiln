import { Hono } from 'hono'

import { authMiddleware } from './auth/middleware'
import { healthRoutes } from './modules/health/routes'
import { rootRoutes } from './modules/root/routes'

const app = new Hono()

app.use('*', authMiddleware)
app.route('/', rootRoutes)
app.route('/health', healthRoutes)

export default app
