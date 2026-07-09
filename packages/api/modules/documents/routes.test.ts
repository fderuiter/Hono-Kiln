import { describe, expect, it } from 'bun:test'
import { HttpStatusCodes } from '@hono-kiln/shared'
import { createTestApp } from '@hono-kiln/testing'
import { hc } from 'hono/client'

import { registry } from '../../registry'

describe('documents routes', () => {
  it('returns unauthorized when no organization context', async () => {
    const app = createTestApp(registry)
    const client = hc<typeof registry>('http://localhost', {
      fetch: app.request as any
    })
    const response = await client.documents.$get()
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
  })
})
