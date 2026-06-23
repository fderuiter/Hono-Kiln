import { eq } from 'drizzle-orm'
import type { Database } from '../../db'
import { users } from '../../db/schema'

export function createAuthRepository(db: Database) {
  return {
    async findUserByEmail(email: string) {
      return db.query.users.findFirst({
        where: eq(users.email, email),
      })
    },

    async createUser(data: { name: string; email: string; passwordHash: string }) {
      const [newUser] = await db
        .insert(users)
        .values(data)
        .returning()
      return newUser
    },
  }
}

export type AuthRepository = ReturnType<typeof createAuthRepository>
