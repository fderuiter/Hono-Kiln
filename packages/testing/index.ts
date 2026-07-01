import { OpenAPIHono } from '@hono/zod-openapi'
import { mock } from 'bun:test'
import type { Hono } from 'hono'
import { Cookie, type Session, type User } from 'lucia'

/**
 * Options for creating a mock authentication environment.
 */
export type MockAuthOptions = {
  /**
   * Override the default session validation behavior.
   */
  validateSession?: (sessionId: string) => Promise<{ user: User | null; session: Session | null }>
}

/**
 * Creates a mocked authentication utility for testing purposes.
 * 
 * @example
 * ```ts
 * const auth = createMockAuth({
 *   validateSession: async (id) => ({ user: myMockUser, session: myMockSession })
 * });
 * ```
 * 
 * @param options - Configuration options for the mock auth instance.
 * @returns An object containing mocked auth methods matching the expected auth interface.
 */
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

/**
 * Options for configuring the test application wrapper.
 */
export type TestAppOptions = {
  /** Mocked database instance */
  db?: any
  /** Mocked authentication instance */
  auth?: any
  /** Optional user to inject into the test context */
  user?: User | null
  /** Optional session to inject into the test context */
  session?: Session | null
  /** Whether the mock app should simulate an authenticated state by default */
  authenticated?: boolean
}

/**
 * Wraps a router with a test application context, injecting mock dependencies.
 * 
 * @param router - The Hono router to mount.
 * @param options - Configuration options for mocks and context data.
 * @returns A new OpenAPIHono instance ready for testing.
 */
export function createTestApp<T extends Hono<any, any, any>>(
  router: T,
  options: TestAppOptions = {},
) {
  type Env = {
    Variables: {
      db: any
      auth: any
      user: User | null
      session: Session | null
    }
  }
  const app = new OpenAPIHono<Env>()

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
