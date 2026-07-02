import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { HttpStatusCodes, InternalServerErrorSchema, UnauthorizedSchema, UnprocessableEntitySchema } from '@hono-kiln/shared'

import { createOrganizationsService } from './service'
import { OrganizationSchema } from './schema'

export const organizationsRoutes = new OpenAPIHono()

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Organizations'],
  summary: 'Retrieve a list of organizations.',
  description: 'API endpoints for managing organizations.',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(OrganizationSchema).openapi({ description: 'List of Organizations objects' }),
          }).openapi('OrganizationsListResponse'),
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
  },
})

organizationsRoutes.openapi(listRoute, async (c) => {
  const db = c.get('db')
  const service = createOrganizationsService(db)

  return c.json(
    {
      data: await service.list(),
    },
    HttpStatusCodes.OK as any,
  )
})
