import { createMiddleware } from 'hono/factory'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { env } from 'hono/adapter'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv, EnvBindings } from '../env'

export const securityHeadersMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  return secureHeaders()(c, next)
})

export const corsMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const bindings = env<EnvBindings>(c)
  const origin = bindings.CORS_ORIGIN || '*'

  return cors({
    origin: (requestOrigin) => {
      if (origin === '*' || origin === requestOrigin) {
        return requestOrigin
      }
      return origin
    },
  })(c, next)
})

// A simple in-memory rate limiter based on fixed windows per IP or global if IP is unavailable
const requests = new Map<string, { count: number; resetTime: number }>()

export const rateLimitMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const bindings = env<EnvBindings>(c)
  const max = parseInt(bindings.RATE_LIMIT_MAX || '100', 10)
  const windowMs = parseInt(bindings.RATE_LIMIT_WINDOW_MS || '60000', 10)

  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'global'
  const now = Date.now()

  let record = requests.get(ip)
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs }
  }

  record.count++
  requests.set(ip, record)

  c.header('X-RateLimit-Limit', max.toString())
  c.header('X-RateLimit-Remaining', Math.max(0, max - record.count).toString())
  c.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString())

  if (record.count > max) {
    throw new HTTPException(429, { message: 'Too Many Requests' })
  }

  await next()
})
