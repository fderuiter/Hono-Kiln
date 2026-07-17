import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '../env'
import type { Session, User } from 'lucia'
import { createMockAuth, createTestApp as createHarnessApp } from '@hono-kiln/testing'

import { authMiddleware } from './middleware'

function createTestApp(
  validateSession: (sessionId: string) => Promise<{
    user: User | null
    session: Session | null
  }>,
) {
  const router = new Hono<AppEnv>()
  router.use('*', authMiddleware)
  router.get('/me', (c) =>
    c.json({
      user: c.get('user'),
      session: c.get('session')
        ? {
            id: c.get('session')?.id,
            userId: c.get('session')?.userId,
            fresh: c.get('session')?.fresh,
          }
        : null,
    }),
  )

  return createHarnessApp(router, {
    auth: createMockAuth({ validateSession }),
  })
}

describe('auth middleware', () => {
  it('injects null user and session when the request has no session cookie', async () => {
    const app = createTestApp(async () => {
      throw new Error('validateSession should not be called without a cookie')
    })

    const response = await app.request('/me')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: null,
      session: null,
    })
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('injects the validated user and session and refreshes fresh sessions', async () => {
    const app = createTestApp(async (sessionId) => ({
      user: {
        id: 1,
        email: 'ada@example.com',
        permissions: [],
        name: 'Ada Lovelace',
      },
      session: {
        id: sessionId,
        userId: 1,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        fresh: true,
      },
    }))

    const response = await app.request('/me', {
      headers: {
        Cookie: 'auth_session=session-123',
      },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: {
        id: 1,
        email: 'ada@example.com',
        permissions: [],
        name: 'Ada Lovelace',
      },
      session: {
        id: 'session-123',
        userId: 1,
        fresh: true,
      },
    })
    expect(response.headers.get('set-cookie')).toContain('auth_session=session-123')
  })

  it('clears the session cookie when validation fails', async () => {
    const app = createTestApp(async () => ({
      user: null,
      session: null,
    }))

    const response = await app.request('/me', {
      headers: {
        Cookie: 'auth_session=expired-session',
      },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: null,
      session: null,
    })
    expect(response.headers.get('set-cookie')).toContain('auth_session=')
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('authenticates with a valid bearer token if cookie is missing, without setting cookies', async () => {
    const app = createTestApp(async (sessionId) => ({
      user: {
        id: 2,
        email: 'bob@example.com',
        name: 'Bob',
        permissions: [],
      },
      session: {
        id: sessionId,
        userId: 2,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        fresh: true,
      },
    }))

    const response = await app.request('/me', {
      headers: {
        Authorization: 'Bearer token-456',
      },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: {
        id: 2,
        email: 'bob@example.com',
        name: 'Bob',
        permissions: [],
      },
      session: {
        id: 'token-456',
        userId: 2,
        fresh: true,
      },
    })
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('rejects invalid bearer token without clearing cookies', async () => {
    const app = createTestApp(async () => ({
      user: null,
      session: null,
    }))

    const response = await app.request('/me', {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: null,
      session: null,
    })
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
