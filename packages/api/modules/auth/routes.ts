import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { setCookie } from 'hono/cookie'
import {
  BadRequestSchema,
  InternalServerErrorSchema,
  UnauthorizedSchema,
  UnprocessableEntitySchema,
} from '@hono-kiln/shared'
import { publicAccess } from '../../auth/guard'

import { createAuthRepository } from './repository'
import {
  AuthResponseSchema,
  LoginRequestSchema,
  LogoutResponseSchema,
  RegisterRequestSchema,
} from './schema'

export const authRoutes = new OpenAPIHono()

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
  const repository = createAuthRepository(db)
  const { name, email, password } = c.req.valid('json')

  const existingUser = await repository.findUserByEmail(email)

  if (existingUser) {
    return c.json({ error: 'User already exists' }, 400)
  }

  const passwordHash = await Bun.password.hash(password)

  const newUser = await repository.createUser({
    name,
    email,
    passwordHash,
  })

  const session = await auth.createSession(newUser.id, {})
  const sessionCookie = auth.createSessionCookie(session.id)

  setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

  return c.json(
    {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    },
    201
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
  const repository = createAuthRepository(db)
  const { email, password } = c.req.valid('json')

  const user = await repository.findUserByEmail(email)

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const isPasswordValid = await Bun.password.verify(password, user.passwordHash)

  if (!isPasswordValid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const session = await auth.createSession(user.id, {})
  const sessionCookie = auth.createSessionCookie(session.id)

  setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

  return c.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
    200
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
  setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

  return c.json({ message: 'Logged out successfully' }, 200)
})
