import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { createTestApp, createTestClient } from './index'

describe('createTestClient', () => {
  it('should initialize a test client and send requests successfully', async () => {
    const router = new Hono().get('/api/test', (c) => c.json({ ok: true }))
    const app = createTestApp(router)
    const client = createTestClient<typeof router>(app)

    const [data, error] = await (client as any).api.test.$get()
    expect(error).toBeNull()
    expect(data).toEqual({ ok: true })
  })

  it('should inject cookie if session is mock-authenticated', async () => {
    const router = new Hono().get('/api/me', (c) => {
      const cookie = c.req.header('cookie') || ''
      return c.json({ cookie })
    })
    
    // Setup app with authenticated = true
    const app = createTestApp(router, { authenticated: true })
    const client = createTestClient<typeof router>(app)

    const [data, error] = await (client as any).api.me.$get()
    expect(error).toBeNull()
    expect(data.cookie).toContain('auth_session=')
  })

  it('should inject custom session cookie if session provided in TestAppOptions', async () => {
    const router = new Hono().get('/api/me', (c) => {
      const cookie = c.req.header('cookie') || ''
      return c.json({ cookie })
    })
    
    const app = createTestApp(router, { 
      session: { id: 'custom-session-123', userId: 1, expiresAt: new Date(), fresh: true } as any 
    })
    const client = createTestClient<typeof router>(app)

    const [data, error] = await (client as any).api.me.$get()
    expect(error).toBeNull()
    expect(data.cookie).toContain('auth_session=custom-session-123')
  })

  it('should inject x-organization-id header if organizationId is in createTestClient options', async () => {
    const router = new Hono().get('/api/org', (c) => {
      return c.json({ orgId: c.req.header('x-organization-id') })
    })
    
    const app = createTestApp(router)
    const client = createTestClient<typeof router>(app, { organizationId: 'org-456' })

    const [data, error] = await (client as any).api.org.$get()
    expect(error).toBeNull()
    expect(data.orgId).toBe('org-456')
  })

  it('should inject x-organization-id header if organizationId is in test app options', async () => {
    const router = new Hono().get('/api/org', (c) => {
      return c.json({ orgId: c.req.header('x-organization-id') })
    })
    
    const app = createTestApp(router, { organizationId: 'org-app-789' } as any)
    const client = createTestClient<typeof router>(app)

    const [data, error] = await (client as any).api.org.$get()
    expect(error).toBeNull()
    expect(data.orgId).toBe('org-app-789')
  })
})
