import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { Cookie as LuciaCookie, Session, User } from 'lucia'

declare module 'hono' {
  interface ContextVariableMap {
    user: User | null
    session: Session | null
  }
}

function applyCookie(c: Context, cookie: LuciaCookie) {
  setCookie(c, cookie.name, cookie.value, cookie.attributes)
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
    applyCookie(c, auth.createSessionCookie(session.id))
  }

  if (!session) {
    applyCookie(c, auth.createBlankSessionCookie())
  }

  c.set('user', user)
  c.set('session', session)

  await next()
})
