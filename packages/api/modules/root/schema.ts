import { z } from '@hono/zod-openapi'

export const WelcomeSchema = z.object({
  message: z.literal('Hono Kiln API').openapi({
    description: 'A static welcome message from the API',
    example: 'Hono Kiln API',
  }),
}).openapi('WelcomeResponse')
