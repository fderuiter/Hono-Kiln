import { describe, it, expect, mock } from 'bun:test'
import { Hono } from 'hono'
import { createSafeClient, injectHeader } from './index'

describe('createSafeClient', () => {
  it('should transform successful JSON responses into [data, null]', async () => {
    const app = new Hono().get('/api/test', (c) => c.json({ message: 'success' }))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app) as any,
    })

    const [data, error] = await client.api.test.$get()
    expect(error).toBeNull()
    expect(data).toEqual({ message: 'success' })
  })

  it('should transform successful text responses into [data, null]', async () => {
    const app = new Hono().get('/api/test', (c) => c.text('hello world'))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app) as any,
    })

    const [data, error] = await client.api.test.$get()
    expect(error).toBeNull()
    expect(data).toBe('hello world')
  })

  it('should handle 204 No Content gracefully', async () => {
    const app = new Hono().get('/api/empty', (c) => new Response(null, { status: 204 }))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app) as any,
    })

    const [data, error] = await client.api.empty.$get()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('should transform failed JSON responses into [null, errorData]', async () => {
    const app = new Hono().get('/api/error', (c) => c.json({ error: 'bad request' }, 400))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app) as any,
    })

    const [data, error] = await client.api.error.$get()
    expect(data).toBeNull()
    expect(error).toEqual({ error: 'bad request' })
  })

  it('should transform failed text responses into [null, { error: string }]', async () => {
    const app = new Hono().get('/api/error', (c) => c.text('internal error', 500))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app) as any,
    })

    const [data, error] = await client.api.error.$get()
    expect(data).toBeNull()
    expect(error).toEqual({ error: 'internal error' })
  })

  it('should catch network errors and return [null, { error: message }]', async () => {
    const brokenFetch = () => Promise.reject(new Error('Network failure'))
    const client = createSafeClient<any>('http://localhost', {
      fetch: brokenFetch as any,
    })

    const [data, error] = await client.api.broken.$get()
    expect(data).toBeNull()
    expect(error).toEqual({ error: 'Network failure' })
  })

  it('should run interceptors in order and modify RequestInit', async () => {
    const app = new Hono().get('/api/headers', (c) => {
      return c.json({
        foo: c.req.header('x-foo'),
        bar: c.req.header('x-bar'),
      })
    })

    const interceptor1 = (init: RequestInit) => injectHeader(init, 'x-foo', '123')
    const interceptor2 = async (init: RequestInit) => injectHeader(init, 'x-bar', '456')

    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app) as any,
      interceptors: [interceptor1, interceptor2]
    })

    const [data, error] = await client.api.headers.$get()
    expect(error).toBeNull()
    expect(data).toEqual({ foo: '123', bar: '456' })
  })
})
