import { createMiddleware } from 'hono/factory'
import { sessionHelpers } from '@hono-kiln/shared'
import { eq, and } from 'drizzle-orm'
import { organizationMembers } from '../db/schema'
import type { AppEnv } from '../env'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('user', null)
  c.set('session', null)
  c.set('organizationId', null)
  c.set('organizationRole', null)

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

  if (user) {
    const orgIdHeader = c.req.header('x-organization-id')
    if (orgIdHeader) {
      const orgId = parseInt(orgIdHeader, 10)
      if (!isNaN(orgId)) {
        const db = c.get('db')
        const results = await db.select().from(organizationMembers).where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, parseInt(user.id, 10))
          )
        ).limit(1)
        
        if (results.length > 0) {
          c.set('organizationId', orgId)
          c.set('organizationRole', results[0].role as any)
        }
      }
    }
  }

  await next()
})
