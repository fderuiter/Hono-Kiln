import { describe, expect, it } from 'bun:test'
import { HttpStatusCodes } from '@hono-kiln/shared'
import { createTestApp } from '@hono-kiln/testing'
import { organizationsRoutes } from './routes'

describe('organizations routes', () => {
  it('returns successful response', async () => {
    const mockDb = {
      select: () => ({
        from: () => Promise.resolve([])
      })
    }
    const app = createTestApp(organizationsRoutes, { db: mockDb as any })
    const response = await app.request('/')
    expect(response.status).toBe(HttpStatusCodes.OK)
  })
})
