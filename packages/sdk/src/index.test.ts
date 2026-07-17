import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { createClient, createSafeClient, injectHeader } from './index'

describe('createClient (deprecated)', () => {
  it('should successfully make an in-memory request', async () => {
    const app = new Hono().get('/api/test', (c) => c.json({ message: 'standard success' }))
    const client = createClient('http://localhost', {
      fetch: app.request.bind(app),
    })

    const response = await (client as any).api.test.$get()
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data).toEqual({ message: 'standard success' })
  })

  it('should throw exceptions on failed API requests (network errors)', async () => {
    const brokenFetch = () => Promise.reject(new Error('Hard network failure'))
    const client = createClient('http://localhost', {
      fetch: brokenFetch as any,
    })

    expect((client as any).api.broken.$get()).rejects.toThrow('Hard network failure')
  })
})

describe('createSafeClient', () => {
  it('should transform successful JSON responses into [data, null]', async () => {
    const app = new Hono().get('/api/test', (c) => c.json({ message: 'success' }))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app),
    })

    const [data, error] = await (client as any).api.test.$get()
    expect(error).toBeNull()
    expect(data).toEqual({ message: 'success' })
  })

  it('should transform successful text responses into [data, null]', async () => {
    const app = new Hono().get('/api/test', (c) => c.text('hello world'))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app),
    })

    const [data, error] = await (client as any).api.test.$get()
    expect(error).toBeNull()
    expect(data).toBe('hello world')
  })

  it('should handle 204 No Content gracefully', async () => {
    const app = new Hono().get('/api/empty', () => new Response(null, { status: 204 }))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app),
    })

    const [data, error] = await (client as any).api.empty.$get()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('should transform failed JSON responses into [null, errorData]', async () => {
    const app = new Hono().get('/api/error', (c) => c.json({ error: 'bad request' }, 400))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app),
    })

    const [data, error] = await (client as any).api.error.$get()
    expect(data).toBeNull()
    expect(error).toEqual({ error: 'bad request' })
  })

  it('should transform failed text responses into [null, { error: string }]', async () => {
    const app = new Hono().get('/api/error', (c) => c.text('internal error', 500))
    const client = createSafeClient<any>('http://localhost', {
      fetch: app.request.bind(app),
    })

    const [data, error] = await (client as any).api.error.$get()
    expect(data).toBeNull()
    expect(error).toEqual({ error: 'internal error' })
  })

  it('should catch network errors and return [null, { error: message }]', async () => {
    const brokenFetch = () => Promise.reject(new Error('Network failure'))
    const client = createSafeClient<any>('http://localhost', {
      fetch: brokenFetch as any,
    })

    const [data, error] = await (client as any).api.broken.$get()
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
      fetch: app.request.bind(app),
      interceptors: [interceptor1, interceptor2]
    })

    const [data, error] = await (client as any).api.headers.$get()
    expect(error).toBeNull()
    expect(data).toEqual({ foo: '123', bar: '456' })
  })
})
