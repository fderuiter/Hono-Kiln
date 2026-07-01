import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from './env'

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
const app = new OpenAPIHono<AppEnv>()

const infraApp = new OpenAPIHono<AppEnv>()
const coreApp = new OpenAPIHono<AppEnv>()

infraApp.route('/health', healthRoutes)

infraApp.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Hono Kiln API',
    version: '1.0.0',
    description: 'Auto-generated OpenAPI specification for the Hono Kiln API.',
  },
})

infraApp.get('/docs', swaggerUI({
  url: '/openapi.json',
  manuallySwaggerUIHtml: generateSwaggerUIHtml
}))

coreApp.use('*', initMiddleware)
coreApp.use('*', authMiddleware)
coreApp.use('*', globalGuard)
coreApp.route('/', rootRoutes)
coreApp.route('/auth', authRoutes)

app.route('/', infraApp)
app.route('/', coreApp)

export default app
