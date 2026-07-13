import { OpenAPIHono } from '@hono/zod-openapi'
import { mock } from 'bun:test'
import type { Hono } from 'hono'
import { Cookie, type Session, type User } from 'lucia'
import type { AppEnv } from '@hono-kiln/api'
import { createSafeClient, injectHeader, type RequestInterceptor } from '@hono-kiln/sdk'

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
export function createMockAuth(options: MockAuthOptions = {}): AppEnv['Variables']['auth'] {
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
  } as unknown as AppEnv['Variables']['auth']
}

/**
 * Options for configuring the test application wrapper.
 */
export type TestAppOptions = {
  /** Mocked database instance */
  db?: AppEnv['Variables']['db']
  /** Mocked authentication instance */
  auth?: AppEnv['Variables']['auth']
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
  const app = new OpenAPIHono<AppEnv>()

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
    c.set('db', options.db ?? ({} as AppEnv['Variables']['db']))
    c.set('auth', authMock!)
    if (options.user !== undefined) c.set('user', options.user)
    if (options.session !== undefined) c.set('session', options.session)
    await next()
  })

  app.route('/', router)

  ;(app as any).__testOptions = options

  return app
}

export type TestClientOptions = {
  organizationId?: string
  interceptors?: import('@hono-kiln/sdk').RequestInterceptor[]
}

export function createTestClient<T extends Record<string, any>>(
  app: Hono<any, any, any>,
  options: TestClientOptions = {}
) {
  const testOptions: TestAppOptions = (app as any).__testOptions || {}

  const interceptors: RequestInterceptor[] = [...(options.interceptors || [])]

  if (testOptions.authenticated || testOptions.session) {
    const sessionId = testOptions.session?.id || 'mock-session-id'
    interceptors.push((init) => injectHeader(init, 'Cookie', `auth_session=${sessionId}`))
  }

  const orgId = options.organizationId || (testOptions as any).organizationId
  if (orgId) {
    interceptors.push((init) => injectHeader(init, 'x-organization-id', orgId))
  }

  return createSafeClient<T>('http://localhost', {
    fetch: app.request.bind(app) as any,
    interceptors,
  })
}

