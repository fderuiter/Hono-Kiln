import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { setCookie } from 'hono/cookie'

import { createAuthRepository } from './repository'
import {
  AuthResponseSchema,
  ErrorResponseSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
} from './schema'

export const authRoutes = new OpenAPIHono()

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  summary: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'User registered successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User already exists',
    },
  },
})

authRoutes.openapi(registerRoute, async (c) => {
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
})

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  summary: 'Login a user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'User logged in successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid credentials',
    },
  },
})

authRoutes.openapi(loginRoute, async (c) => {
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
})

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  summary: 'Logout a user',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ message: z.string() }),
        },
      },
      description: 'User logged out successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
  },
})

authRoutes.openapi(logoutRoute, async (c) => {
  const auth = c.get('auth')
  const session = c.get('session')

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await auth.invalidateSession(session.id)

  const sessionCookie = auth.createBlankSessionCookie()
  setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

  return c.json({ message: 'Logged out successfully' }, 200)
})
