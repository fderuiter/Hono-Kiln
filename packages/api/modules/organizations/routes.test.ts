import { describe, expect, it } from 'bun:test'
import { createTestApp, createTestClient } from '@hono-kiln/testing'
import { registry } from '../../registry'

describe('organizations routes', () => {
  it('returns successful response', async () => {
    const mockDb = {
      select: () => ({
        from: () => Promise.resolve([])
      })
    }
    const app = createTestApp(registry, { db: mockDb as any })
    const client = createTestClient<typeof registry>(app)
    
    const [data, error] = await client.organizations.$get()
    expect(error).toBeNull()
    expect(data).toEqual({ data: [] } as any)
  })
})
