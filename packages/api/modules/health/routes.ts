import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { createHealthRepository } from './repository'
import { InternalServerErrorSchema, ServiceUnavailableSchema } from '@hono-kiln/shared'
import { publicAccess } from '../../auth/guard'

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
  publicAccess((c) => c.json({ status: 'ok' as const }, 200 as const)),
)

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/live',
    tags: ['Health'],
    summary: 'Liveness probe',
    responses: healthResponse,
  }),
  publicAccess((c) => c.json({ status: 'ok' as const }, 200 as const)),
)

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/ready',
    tags: ['Health'],
    summary: 'Readiness probe',
    responses: {
      200: {
        content: { 'application/json': { schema: StatusSchema } },
        description: 'Health status',
      },
      500: {
        content: { 'application/json': { schema: InternalServerErrorSchema } },
        description: 'Internal server error',
      },
      503: {
        content: { 'application/json': { schema: ServiceUnavailableSchema } },
        description: 'Service unavailable',
      },
    },
  }),
  publicAccess(async (c) => {
    const db = c.get('db')
    const repository = createHealthRepository(db)
    
    const isDbReady = await repository.checkDatabase()
    if (!isDbReady) {
      return c.json({ status: 'error' }, 503 as const)
    }

    return c.json({ status: 'ok' as const }, 200 as const)
  }),
)
