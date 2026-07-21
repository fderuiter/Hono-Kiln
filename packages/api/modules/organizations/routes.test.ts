import { describe, expect, it } from 'bun:test'
import { createTestApp, createTestClient } from '@hono-kiln/testing'
import { v1App } from '../../registry'

describe('organizations routes', () => {
  it('returns successful response', async () => {
    const mockDb = {
      query: { organizations: { findMany: async () => [] } },
      select: () => ({
        from: () => Promise.resolve([])
      })
    }
    const app = createTestApp(v1App, { db: mockDb as any })
    const client = createTestClient<typeof v1App>(app) as any
    
    const [data, error] = await client.organizations.$get()
    expect(error).toBeNull()
    expect(data).toEqual({ data: [] })
  })
})
