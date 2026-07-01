import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { InternalServerErrorSchema } from '@hono-kiln/shared'

import { StatusSchema } from './schema'

import type { AppEnv } from '../../env';

export const healthRoutes = new OpenAPIHono<AppEnv>()

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
  (c) => c.json({ status: 'ok' as const }, 200 as const),
)

healthRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/live',
    tags: ['Health'],
    summary: 'Liveness probe',
    responses: healthResponse,
  }),
  (c) => c.json({ status: 'ok' as const }, 200 as const),
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
    },
  }),
  async (c) => {
    return c.json({ status: 'ok' as const }, 200 as const)
  },
)
