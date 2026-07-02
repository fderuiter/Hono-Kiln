import { describe, expect, it } from 'bun:test'
import { OpenAPIHono } from '@hono/zod-openapi'
import { corsMiddleware, rateLimitMiddleware, securityHeadersMiddleware } from './security'
import type { AppEnv } from '../env'

describe('Security Middlewares', () => {
  it('applies secure headers', async () => {
    const app = new OpenAPIHono<AppEnv>()
    app.use('*', securityHeadersMiddleware)
    app.get('/', (c) => c.text('ok'))

    const res = await app.request('/')
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(res.headers.get('Strict-Transport-Security')).toBeDefined()
  })

  it('applies CORS based on environment', async () => {
    process.env.CORS_ORIGIN = 'https://example.com'
    const app = new OpenAPIHono<AppEnv>()
    app.use('*', corsMiddleware)
    app.get('/', (c) => c.text('ok'))

    const req = new Request('http://localhost/', {
      headers: { Origin: 'https://example.com' },
    })
    const res = await app.request(req)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    delete process.env.CORS_ORIGIN
  })

  it('applies rate limiting', async () => {
    process.env.RATE_LIMIT_MAX = '2'
    process.env.RATE_LIMIT_WINDOW_MS = '1000'
    const app = new OpenAPIHono<AppEnv>()
    app.use('*', rateLimitMiddleware)
    app.get('/', (c) => c.text('ok'))

    const reqHeaders = { 'x-forwarded-for': '127.0.0.1' }

    let res = await app.request('/', { headers: reqHeaders })
    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('1')

    res = await app.request('/', { headers: reqHeaders })
    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')

    res = await app.request('/', { headers: reqHeaders })
    expect(res.status).toBe(429)

    delete process.env.RATE_LIMIT_MAX
    delete process.env.RATE_LIMIT_WINDOW_MS
  })
})
