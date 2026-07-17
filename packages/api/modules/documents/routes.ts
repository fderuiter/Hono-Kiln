import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { HttpStatusCodes, InternalServerErrorSchema, UnauthorizedSchema, UnprocessableEntitySchema } from '@hono-kiln/shared'

import { createDocumentsService } from './service'
import { documentsSchema } from './schema'
import type { AppEnv } from '../../env'

export const documentsRoutes = new OpenAPIHono<AppEnv>()

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Documents'],
  summary: 'Retrieve a list of documentss.',
  description: 'API endpoints for managing documentss.',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(documentsSchema).openapi({ description: 'List of Documents objects' }),
          }).openapi('DocumentsListResponse'),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UnauthorizedSchema,
        },
      },
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      description: 'Validation Error',
      content: {
        'application/json': {
          schema: UnprocessableEntitySchema,
        },
      },
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: InternalServerErrorSchema,
        },
      },
    },
  },
})

documentsRoutes.openapi(listRoute, 
// @ts-ignore
async (c) => {
  const db = c.get('db')
  const service = createDocumentsService(db)
  const orgId = c.get('organizationId')
  if (!orgId) {
    return c.json({ error: 'Unauthorized' }, HttpStatusCodes.UNAUTHORIZED as any)
  }
  return c.json({ data: await service.list(orgId) }, HttpStatusCodes.OK as any)
})
