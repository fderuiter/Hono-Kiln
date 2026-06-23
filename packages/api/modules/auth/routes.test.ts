import { describe, expect, it, mock } from 'bun:test'
import { OpenAPIHono } from '@hono/zod-openapi'

const mockRepo = {
  findUserByEmail: mock(async () => undefined),
  createUser: mock(async (data: any) => ({
    id: 'test-id',
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
}

mock.module('./repository', () => ({
  createAuthRepository: () => mockRepo,
}))

import { authRoutes } from './routes'

describe('auth routes', () => {
  it('registers a user successfully using mocked repository', async () => {
    const mockAuth = {
      createSession: mock(async () => ({ id: 'session-id' })),
      createSessionCookie: mock(() => ({
        name: 'session',
        value: 'session-val',
        attributes: {},
      })),
      invalidateSession: mock(async () => {}),
      createBlankSessionCookie: mock(() => ({
        name: 'session',
        value: '',
        attributes: {},
      })),
    }

    const app = new OpenAPIHono()
    app.use('*', (c, next) => {
      c.set('db', {}) // Ignored by mock
      c.set('auth', mockAuth)
      return next()
    })
    app.route('/', authRoutes)

    const response = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    expect(response.status).toBe(201)
    expect(mockRepo.createUser).toHaveBeenCalled()
  })
})
