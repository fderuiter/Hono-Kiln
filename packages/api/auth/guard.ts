import { createMiddleware } from 'hono/factory'

export function publicAccess<T>(handler: T): T {
  (handler as any).isPublic = true
  return handler
}

export const globalGuard = createMiddleware(async (c, next) => {
  const path = c.req.path
  if (path === '/openapi.json' || path === '/docs') {
    return next()
  }

  const routes = c.req.matchedRoutes
  const target = routes[routes.length - 1]
  const isPublic = target && (target.handler as any).isPublic

  if (isPublic) {
    return next()
  }

  const session = c.get('session')

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
})
