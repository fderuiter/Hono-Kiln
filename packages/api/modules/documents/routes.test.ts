import { describe, expect, it } from 'bun:test'
import { createTestApp, createTestClient } from '@hono-kiln/testing'

import { registry } from '../../registry'

describe('documents routes', () => {
  it('returns unauthorized when no organization context', async () => {
    const app = createTestApp(registry)
    const client = createTestClient<typeof registry>(app)
    
    const [data, error] = await client.documents.$get()
    expect(data).toBeNull()
    expect(error).toEqual({ error: 'Unauthorized' })
  })
})
