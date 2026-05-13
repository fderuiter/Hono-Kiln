import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

export const healthRoutes = new OpenAPIHono()

const StatusSchema = z.object({ status: z.literal('ok') })

const healthResponse = {
  200: {
    content: { 'application/json': { schema: StatusSchema } },
    description: 'Health status',
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
  (c) => c.json({ status: 'ok' }),
)

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/live',
    tags: ['Health'],
    summary: 'Liveness probe',
    responses: healthResponse,
  }),
  (c) => c.json({ status: 'ok' }),
)

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/ready',
    tags: ['Health'],
    summary: 'Readiness probe',
    responses: healthResponse,
  }),
  (c) => c.json({ status: 'ok' }),
)
