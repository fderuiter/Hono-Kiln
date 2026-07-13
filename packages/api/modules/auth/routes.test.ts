import { describe, expect, it, mock } from 'bun:test'
import { createTestApp, createTestClient } from '@hono-kiln/testing'
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
    const client = createTestClient<typeof registry>(app)

    const [data, error] = await client.auth.register.$post({
      json: {
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      }
    })

    expect(error).toBeNull()
    
    expect(data).toEqual({
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        permissions: [],
      }
    })
    expect(data?.user).not.toHaveProperty('passwordHash')
    expect(data?.user).not.toHaveProperty('internalAuditFlag')
  })
})
