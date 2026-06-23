import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { createHealthRepository } from './repository'
import { InternalServerErrorSchema, ServiceUnavailableSchema } from '@hono-kiln/shared'

import { StatusSchema } from './schema'

export const healthRoutes = new OpenAPIHono()

const healthResponse = {
  200: {
    content: { 'application/json': { schema: StatusSchema } },
    description: 'Health status',
  },
  500: {
    content: { 'application/json': { schema: InternalServerErrorSchema } },
    description: 'Internal server error',
  },
} as const

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Health'],
    summary: 'Health check',
    responses: healthResponse,
  }),
  (c) => c.json({ status: 'ok' as const }),
)

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/live',
    tags: ['Health'],
    summary: 'Liveness probe',
    responses: healthResponse,
  }),
  (c) => c.json({ status: 'ok' as const }),
)

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/ready',
    tags: ['Health'],
    summary: 'Readiness probe',
    responses: {
      ...healthResponse,
      503: {
        content: { 'application/json': { schema: ServiceUnavailableSchema } },
        description: 'Service unavailable',
      },
    },
  }),
  async (c) => {
    const db = c.get('db')
    const repository = createHealthRepository(db)
    
    const isDbReady = await repository.checkDatabase()
    if (!isDbReady) {
      return c.json({ status: 'error' }, 503)
    }

    return c.json({ status: 'ok' as const })
  },
)
