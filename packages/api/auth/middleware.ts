import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { Cookie as LuciaCookie, Lucia, Session, User } from 'lucia'

import { auth } from './index'

type AuthSessionValidator = Pick<
  Lucia,
  | 'sessionCookieName'
  | 'readSessionCookie'
  | 'validateSession'
  | 'createSessionCookie'
  | 'createBlankSessionCookie'
>

declare module 'hono' {
  interface ContextVariableMap {
    user: User | null
    session: Session | null
  }
}

function applyCookie(c: Context, cookie: LuciaCookie) {
  setCookie(c, cookie.name, cookie.value, cookie.attributes)
}

export function createAuthMiddleware(sessionAuth: AuthSessionValidator = auth) {
  return createMiddleware(async (c, next) => {
    c.set('user', null)
    c.set('session', null)

    const sessionId = sessionAuth.readSessionCookie(c.req.header('Cookie') ?? '')

    if (!sessionId) {
      await next()
      return
    }

    const { session, user } = await sessionAuth.validateSession(sessionId)

    if (session?.fresh) {
      applyCookie(c, sessionAuth.createSessionCookie(session.id))
    }

    if (!session) {
      applyCookie(c, sessionAuth.createBlankSessionCookie())
    }

    c.set('user', user)
    c.set('session', session)

    await next()
  })
}

export const authMiddleware = createAuthMiddleware()
