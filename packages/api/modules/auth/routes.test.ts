import { describe, expect, it, mock } from 'bun:test'
import { createTestApp } from '@hono-kiln/testing'
import { hc } from 'hono/client'
import { registry } from '../../registry'

describe('auth routes', () => {
  it('registers a user successfully and strips extra database fields from response', async () => {
    const mockDb = {
      query: {
        users: {
          findFirst: mock(async () => undefined),
        },
      },
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(async () => [{
            id: 1,
            email: 'test@example.com',
            name: 'Test',
            passwordHash: 'hashed-password-string',
            internalAuditFlag: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }])
        }))
      }))
    }

    const app = createTestApp(registry, { db: mockDb as any })
    const client = hc<typeof registry>('http://localhost', {
      fetch: app.request as any
    })

    const response = await client.auth.register.$post({
      json: {
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      }
    })

    expect(response.status).toBe(201)
    
    const body = await response.json()
    expect(body).toEqual({
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        permissions: [],
      }
    })
    expect(body.user).not.toHaveProperty('passwordHash')
    expect(body.user).not.toHaveProperty('internalAuditFlag')
  })
})
