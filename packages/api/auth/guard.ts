import { createMiddleware } from 'hono/factory'

export function publicAccess<T>(handler: T): T {
  (handler as any).isPublic = true
  return handler
}

/**
 * Decorator to require a specific permission for a route handler.
 * @param permission - The required permission string.
 * @returns A higher-order function that wraps the route handler.
 */
export function requirePermission<T>(permission: string): (handler: T) => T {
  return (handler: T) => {
    (handler as any).requiredPermission = permission
    return handler
  }
}

export const globalGuard = createMiddleware(async (c, next) => {
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

  const requiredPermission = target && (target.handler as any).requiredPermission
  if (requiredPermission) {
    const user = c.get('user')
    if (!user || !user.permissions || !user.permissions.includes(requiredPermission)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  await next()
})

