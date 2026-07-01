import type { Database } from '../../db'
import type { Auth } from '../../auth'
import { createAuthRepository } from './repository'

export function createAuthService(db: Database, auth: Auth) {
  const repository = createAuthRepository(db)

  return {
    async register(name: string, email: string, password: string) {
      const existingUser = await repository.findUserByEmail(email)

      if (existingUser) {
        return { error: 'User already exists' }
      }

      const newUser = await repository.createUser({
        name,
        email,
        password,
      })

      const session = await auth.createSession(newUser.id, {})

      return { user: newUser, session }
    },

    async login(email: string, password: string) {
      const user = await repository.verifyCredentials(email, password)

      if (!user) {
        return { error: 'Invalid credentials' }
      }

      const session = await auth.createSession(user.id, {})

      return { user, session }
    }
  }
}
