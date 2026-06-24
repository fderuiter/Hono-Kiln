import { describe, expect, it, mock } from 'bun:test'
import { createTestApp } from '@hono-kiln/testing'

const mockRepo = {
  findUserByEmail: mock(async () => undefined),
  createUser: mock(async (data: any) => ({
    id: 'test-id',
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
}

mock.module('./repository', () => ({
  createAuthRepository: () => mockRepo,
}))

import { authRoutes } from './routes'

describe('auth routes', () => {
  it('registers a user successfully using mocked repository', async () => {
    const app = createTestApp(authRoutes)

    const response = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    expect(response.status).toBe(201)
    expect(mockRepo.createUser).toHaveBeenCalled()
  })
})
