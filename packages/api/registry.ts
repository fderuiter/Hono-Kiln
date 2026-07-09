import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from './env'
import { authRoutes } from './modules/auth/routes'
import { documentsRoutes } from './modules/documents/routes'
import { organizationsRoutes } from './modules/organizations/routes'
import { rootRoutes } from './modules/root/routes'

export const registry = new OpenAPIHono<AppEnv>()
  .route('/', rootRoutes)
  .route('/auth', authRoutes)
  .route('/organizations', organizationsRoutes)
  .route('/documents', documentsRoutes)

export type AppType = typeof registry
