import { describe, expect, it } from 'bun:test'
import { createAuthRepository } from './repository'

describe('auth repository', () => {
  it('strips internal fields like passwordHash from responses', async () => {
    const mockDb = {
      query: { users: {} },
      insert: () => ({
        values: () => ({
          returning: async () => [{
            id: 1,
            email: 'test@example.com',
            name: 'Test',
            passwordHash: 'hashed-password-string',
            createdAt: new Date(),
            updatedAt: new Date(),
          }]
        })
      })
    }

    const repo = createAuthRepository(mockDb as any)
    const result = await repo.createUser({
      name: 'Test',
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('email')
    expect(result).not.toHaveProperty('passwordHash')
    expect(result).not.toHaveProperty('createdAt')
  })
})
