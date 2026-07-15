import { eq } from 'drizzle-orm'
import type { Database } from '../../db'
import { users } from '../../db/schema'
import { UserSchema } from './schema'
import { z } from 'zod'
import { passwordHelpers } from '@hono-kiln/shared'

type UserType = z.infer<typeof UserSchema>

export function createAuthRepository(db: Database) {
  return {
    async findUserByEmail(email: string): Promise<UserType | null> {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      })
      return user ? UserSchema.parse(user) : null
    },

    async verifyCredentials(email: string, password: string): Promise<UserType | null> {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      })
      if (!user) return null
      
      const isPasswordValid = await passwordHelpers.verify(password, user.passwordHash)
      if (!isPasswordValid) return null
      
      return UserSchema.parse(user)
    },

    async createUser(data: { name: string; email: string; password: string }, tx?: any): Promise<UserType> {
      const passwordHash = await passwordHelpers.hash(data.password)
      const client = tx || db;
      const [newUser] = await client
        .insert(users)
        .values({
          name: data.name,
          email: data.email,
          passwordHash,
        })
        .returning()
      return UserSchema.parse(newUser)
    },
  }
}

