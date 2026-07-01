import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'

import { authMiddleware } from './auth/middleware'
import { globalGuard } from './auth/guard'
import { initMiddleware } from './middleware/init'
import { authRoutes } from './modules/auth/routes'
import { healthRoutes } from './modules/health/routes'
import { rootRoutes } from './modules/root/routes'
import { generateSwaggerUIHtml } from './utils/swagger-ui'

/**
 * The initialized Hono application containing all mounted API routes.
 */
const app = new OpenAPIHono()

app.route('/health', healthRoutes)

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Hono Kiln API',
    version: '1.0.0',
    description: 'Auto-generated OpenAPI specification for the Hono Kiln API.',
  },
})

app.get('/docs', swaggerUI({
  url: '/openapi.json',
  manuallySwaggerUIHtml: generateSwaggerUIHtml
}))

app.use('*', initMiddleware)
app.use('*', authMiddleware)
app.use('*', globalGuard)
app.route('/', rootRoutes)
app.route('/auth', authRoutes)

export default app
