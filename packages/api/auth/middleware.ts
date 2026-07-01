import { createMiddleware } from 'hono/factory'
import { sessionHelpers } from '@hono-kiln/shared'
import type { AppEnv } from '../env'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
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
