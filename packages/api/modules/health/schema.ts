import { z } from '@hono/zod-openapi'

export const StatusSchema = z.object({
  status: z.literal('ok').openapi({ description: 'The service is healthy', example: 'ok' })
}).openapi('HealthStatus')
