import { describe, expect, it } from 'bun:test'
import { createAuthService } from './service'

describe('auth service', () => {
  it('registers a user and returns a session successfully', async () => {
    const mockDb = {
      query: {
        users: {
          findFirst: async () => null
        }
      },
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
    
    const mockAuth = {
      createSession: async (userId: number, attributes: any) => ({
        id: 'mock-session-id',
        userId,
        ...attributes
      })
    }

    const service = createAuthService(mockDb as any, mockAuth as any)
    const result = await service.register('Test', 'test@example.com', 'password123')

    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('session')
    if ('user' in result) {
      expect(result.user).not.toHaveProperty('passwordHash')
    }
  })
})
