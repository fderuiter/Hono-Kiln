import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

export const rootRoutes = new OpenAPIHono()

const WelcomeSchema = z.object({ message: z.literal('Hono Kiln API') })

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
