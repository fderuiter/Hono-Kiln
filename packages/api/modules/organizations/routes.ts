import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { HttpStatusCodes, UnauthorizedSchema } from '@hono-kiln/shared'

import { createOrganizationsService } from './service'
import { OrganizationSchema } from './schema'
import type { AppEnv } from '../../env'

export const organizationsRoutes = new OpenAPIHono<AppEnv>()

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

const CreateOrganizationRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').openapi({ description: 'Organization name', example: 'Acme Corp' })
}).openapi('CreateOrganizationRequest')

const createOrgRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Organizations'],
  summary: 'Create a new organization',
  description: 'Creates a new organization and assigns the current user as an admin.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateOrganizationRequestSchema
        }
      }
    }
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: 'Organization created successfully',
      content: {
        'application/json': {
          schema: OrganizationSchema
        }
      }
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UnauthorizedSchema
        }
      }
    }
  }
})

organizationsRoutes.openapi(createOrgRoute, async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, HttpStatusCodes.UNAUTHORIZED as any)
  }

  const { name } = c.req.valid('json')
  const service = createOrganizationsService(db)
  const newOrg = await service.create(name, user.id)

  return c.json(newOrg, HttpStatusCodes.CREATED as any)
})
