import { createRoute, OpenAPIHono } from '@hono/zod-openapi'

import { WelcomeSchema } from './schema'

export const rootRoutes = new OpenAPIHono()

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
  (c) => c.json({ message: 'Hono Kiln API' }),
)
