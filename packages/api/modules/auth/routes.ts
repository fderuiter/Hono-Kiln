import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  BadRequestSchema,
  InternalServerErrorSchema,
  UnauthorizedSchema,
  UnprocessableEntitySchema,
  sessionHelpers,
} from '@hono-kiln/shared'
import { publicAccess } from '../../auth/guard'

import { createAuthService } from './service'
import {
  AuthResponseSchema,
  LoginRequestSchema,
  LogoutResponseSchema,
  RegisterRequestSchema,
} from './schema'

import type { AppEnv } from '../../env';

export const authRoutes = new OpenAPIHono<AppEnv>()

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  summary: 'Register a new user',
  description: 'Registers a new user and logs them in. Session state is maintained via browser cookies.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
          example: {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
          },
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
          example: {
            user: {
              id: 1,
              email: 'john@example.com',
              name: 'John Doe',
            },
          },
        },
      },
      description: 'User registered successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: BadRequestSchema,
          example: {
            error: 'User already exists',
          },
        },
      },
      description: 'User already exists',
    },
    422: {
      content: {
        'application/json': {
          schema: UnprocessableEntitySchema,
        },
      },
      description: 'Validation error',
    },
    500: {
      content: {
        'application/json': {
          schema: InternalServerErrorSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

authRoutes.openapi(registerRoute, publicAccess(async (c) => {
  const db = c.get('db')
  const auth = c.get('auth')
  const service = createAuthService(db, auth)
  const { name, email, password } = c.req.valid('json')

  const result = await service.register(name, email, password)

  if ('error' in result) {
    return c.json({ error: result.error }, 400 as const)
  }

  const sessionCookie = auth.createSessionCookie(result.session.id)
  sessionHelpers.setSessionCookie(c, sessionCookie)

  return c.json(
    {
      user: result.user,
    },
    201 as const
  )
}))

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Login a user',
  description: 'Logs in an existing user. Session state is maintained via browser cookies.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
          example: {
            email: 'john@example.com',
            password: 'password123',
          },
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
          example: {
            user: {
              id: 1,
              email: 'john@example.com',
              name: 'John Doe',
            },
          },
        },
      },
      description: 'User logged in successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: UnauthorizedSchema,
          example: {
            error: 'Invalid credentials',
          },
        },
      },
      description: 'Invalid credentials',
    },
    422: {
      content: {
        'application/json': {
          schema: UnprocessableEntitySchema,
        },
      },
      description: 'Validation error',
    },
    500: {
      content: {
        'application/json': {
          schema: InternalServerErrorSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

authRoutes.openapi(loginRoute, publicAccess(async (c) => {
  const db = c.get('db')
  const auth = c.get('auth')
  const service = createAuthService(db, auth)
  const { email, password } = c.req.valid('json')

  const result = await service.login(email, password)

  if ('error' in result) {
    return c.json({ error: result.error }, 401 as const)
  }

  const sessionCookie = auth.createSessionCookie(result.session.id)
  sessionHelpers.setSessionCookie(c, sessionCookie)

  return c.json(
    {
      user: result.user,
    },
    200 as const
  )
}))

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Auth'],
  summary: 'Logout a user',
  description: 'Logs out the current user by invalidating the session. Session state is maintained via browser cookies.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LogoutResponseSchema,
        },
      },
      description: 'User logged out successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: UnauthorizedSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: InternalServerErrorSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

authRoutes.openapi(logoutRoute, async (c) => {
  const auth = c.get('auth')
  const session = c.get('session')!

  await auth.invalidateSession(session.id)

  const sessionCookie = auth.createBlankSessionCookie()
  sessionHelpers.setSessionCookie(c, sessionCookie)

  return c.json({ message: 'Logged out successfully' }, 200 as const)
})
