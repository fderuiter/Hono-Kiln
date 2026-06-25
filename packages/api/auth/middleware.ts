import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { Session, User } from 'lucia'
import { sessionHelpers } from '@hono-kiln/shared'

declare module 'hono' {
  interface ContextVariableMap {
    user: User | null
    session: Session | null
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  c.set('user', null)
  c.set('session', null)

  const auth = c.get('auth')
  const sessionId = auth.readSessionCookie(c.req.header('Cookie') ?? '')

  if (!sessionId) {
    await next()
    return
  }

  const { session, user } = await auth.validateSession(sessionId)

  if (session?.fresh) {
    sessionHelpers.setSessionCookie(c, auth.createSessionCookie(session.id))
  }

  if (!session) {
    sessionHelpers.setSessionCookie(c, auth.createBlankSessionCookie())
  }

  c.set('user', user)
  c.set('session', session)

  await next()
})
