import { OpenAPIHono } from '@hono/zod-openapi'
import { mock } from 'bun:test'
import type { Hono } from 'hono'
import { Cookie, type Session, type User } from 'lucia'

export type MockAuthOptions = {
  validateSession?: (sessionId: string) => Promise<{ user: User | null; session: Session | null }>
}

export function createMockAuth(options: MockAuthOptions = {}) {
  const validateSession =
    options.validateSession ??
    mock(async () => ({ user: null, session: null }))

  return {
    sessionCookieName: 'auth_session',
    readSessionCookie(cookieHeader: string) {
      return cookieHeader.match(/auth_session=([^;]+)/)?.[1] ?? null
    },
    validateSession,
    createSessionCookie: mock(
      (sessionId: string) =>
        new Cookie('auth_session', sessionId, {
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: false,
        }),
    ),
    createBlankSessionCookie: mock(
      () =>
        new Cookie('auth_session', '', {
          httpOnly: true,
          maxAge: 0,
          path: '/',
          sameSite: 'lax',
          secure: false,
        }),
    ),
    createSession: mock(async (userId: string | number) => ({
      id: 'mock-session-id',
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      fresh: true,
    })),
    invalidateSession: mock(async () => {}),
  }
}

export type TestAppOptions = {
  db?: any
  auth?: any
  user?: User | null
  session?: Session | null
  authenticated?: boolean
}

export function createTestApp<T extends Hono<any, any, any>>(
  router: T,
  options: TestAppOptions = {},
) {
  const app = new OpenAPIHono()

  let authMock = options.auth
  if (!authMock) {
    if (options.authenticated) {
      authMock = createMockAuth({
        validateSession: async (sessionId) => ({
          user: options.user ?? ({
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
          } as any),
          session: options.session ?? ({
            id: sessionId,
            userId: 1,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            fresh: true,
          } as any),
        }),
      })
    } else {
      authMock = createMockAuth()
    }
  }

  app.use('*', async (c, next) => {
    c.set('db', options.db ?? {})
    c.set('auth', authMock)
    if (options.user !== undefined) c.set('user', options.user)
    if (options.session !== undefined) c.set('session', options.session)
    await next()
  })

  app.route('/', router)

  return app
}
