import { SwaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { requestId } from 'hono/request-id'
import { pino } from 'pino'
import type { AppEnv } from './env'
import { serve } from 'inngest/hono'
import { inngest } from './inngest/client'
import { functions } from './inngest/functions'

import { authMiddleware } from './auth/middleware'
import { globalGuard } from './auth/guard'
import { initMiddleware } from './middleware/init'
import { localeMiddleware } from './middleware/locale'
import { corsMiddleware, rateLimitMiddleware, securityHeadersMiddleware } from './middleware/security'
import { authRoutes } from './modules/auth/routes'
import { healthRoutes } from './modules/health/routes'
import { rootRoutes } from './modules/root/routes'
import { generateSwaggerUIHtml } from './utils/swagger-ui'
import { organizationsRoutes } from './modules/organizations/routes'
import { documentsRoutes } from './modules/documents/routes'

const pinoLogger = pino()

/**
 * The initialized Hono application containing all mounted API routes.
 */
const app = new OpenAPIHono<AppEnv>()

app.use('*', requestId())
app.use('*', async (c, next) => {
  const reqId = c.get('requestId')
  const reqLogger = pinoLogger.child({ correlation_id: reqId })
  c.set('logger', reqLogger)
  reqLogger.info({ method: c.req.method, url: c.req.url }, 'Request started')
  await next()
  reqLogger.info({ status: c.res.status }, 'Request completed')
})

app.onError((err, c) => {
  const reqLogger = c.get('logger') || pinoLogger
  reqLogger.error({ err: err.message, stack: err.stack }, 'An unhandled error occurred')
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

app.use('*', localeMiddleware)
app.use('*', securityHeadersMiddleware)
app.use('*', corsMiddleware)

const infraApp = new OpenAPIHono<AppEnv>()
const coreApp = new OpenAPIHono<AppEnv>()

infraApp.route('/health', healthRoutes)
infraApp.all('/api/inngest', serve({ client: inngest, functions }))

infraApp.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Hono Kiln API',
    version: '1.0.0',
    description: 'Auto-generated OpenAPI specification for the Hono Kiln API.',
  },
})

infraApp.get('/docs', async (c) => {
  const html = SwaggerUI({
    url: '/openapi.json',
    manuallySwaggerUIHtml: (asset) => generateSwaggerUIHtml(asset, c.var.locale)
  })
  return c.html(html)
})

coreApp.use('*', rateLimitMiddleware)
coreApp.use('*', initMiddleware)
coreApp.use('*', authMiddleware)
coreApp.use('*', globalGuard)
coreApp.route('/', rootRoutes)
coreApp.route('/auth', authRoutes)
coreApp.route('/organizations', organizationsRoutes)
coreApp.route('/documents', documentsRoutes)

app.route('/', infraApp)
app.route('/', coreApp)

export default app
