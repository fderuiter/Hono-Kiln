import { describe, expect, it } from 'bun:test'
import { HttpStatusCodes } from '@hono-kiln/shared'
import { createTestApp } from '@hono-kiln/testing'
import { hc } from 'hono/client'
import { registry } from '../../registry'

describe('organizations routes', () => {
  it('returns successful response', async () => {
    const mockDb = {
      select: () => ({
        from: () => Promise.resolve([])
      })
    }
    const app = createTestApp(registry, { db: mockDb as any })
    const client = hc<typeof registry>('http://localhost', {
      fetch: app.request as any
    })
    const response = await client.organizations.$get()
    expect(response.status).toBe(HttpStatusCodes.OK)
  })
})
