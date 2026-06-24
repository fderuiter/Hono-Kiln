import { describe, expect, it, mock } from 'bun:test'
import { OpenAPIHono } from '@hono/zod-openapi'

import { authRoutes } from './routes'

describe('auth routes', () => {
  it('registers a user successfully and strips extra database fields from response', async () => {
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

    const mockDb = {
      query: {
        users: {
          findFirst: mock(async () => undefined),
        },
      },
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(async () => [{
            id: 1,
            email: 'test@example.com',
            name: 'Test',
            passwordHash: 'hashedpassword',
            internalAuditFlag: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }])
        }))
      }))
    }

    const app = new OpenAPIHono()
    app.use('*', (c, next) => {
      c.set('db', mockDb)
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
    
    const body = await response.json()
    expect(body).toEqual({
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
      }
    })
    expect(body.user).not.toHaveProperty('passwordHash')
    expect(body.user).not.toHaveProperty('internalAuditFlag')
  })
})
