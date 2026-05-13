import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'

import { authMiddleware } from './auth/middleware'
import { authRoutes } from './modules/auth/routes'
import { healthRoutes } from './modules/health/routes'
import { rootRoutes } from './modules/root/routes'

const app = new OpenAPIHono()

app.use('*', authMiddleware)
app.route('/', rootRoutes)
app.route('/auth', authRoutes)
app.route('/health', healthRoutes)

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Hono Kiln API',
    version: '1.0.0',
    description: 'Auto-generated OpenAPI specification for the Hono Kiln API.',
  },
})

app.get('/docs', swaggerUI({ url: '/openapi.json' }))

export default app
