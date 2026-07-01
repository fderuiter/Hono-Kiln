import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { publicAccess } from '../../auth/guard'

import { WelcomeSchema } from './schema'

import type { AppEnv } from '../../env';

export const rootRoutes = new OpenAPIHono<AppEnv>()

rootRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['General'],
    summary: 'Welcome',
    responses: {
      200: {
        content: { 'application/json': { schema: WelcomeSchema } },
        description: 'Welcome message',
      },
    },
  }),
  publicAccess((c) => c.json({ message: 'Hono Kiln API' as const }, 200 as const)),
)
