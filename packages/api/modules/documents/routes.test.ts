import { describe, expect, it } from 'bun:test'
import { HttpStatusCodes } from '@hono-kiln/shared'
import { createTestApp } from '@hono-kiln/testing'

import { documentsRoutes } from './routes'

describe('documents routes', () => {
  it('returns unauthorized when no organization context', async () => {
    const app = createTestApp(documentsRoutes)
    const response = await app.request('/')
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
  })
})
