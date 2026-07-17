import { describe, expect, it } from 'bun:test'
import { createTestApp, createTestClient } from '@hono-kiln/testing'

import { v1App } from '../../registry'

describe('documents routes', () => {
  it('returns unauthorized when no organization context', async () => {
    const app = createTestApp(v1App)
    const client = createTestClient<typeof v1App>(app) as any
    
    const [data, error] = await client.documents.$get()
    expect(data).toBeNull()
    expect(error).toEqual({ error: 'Unauthorized' })
  })
})
