import { eq } from 'drizzle-orm'
import type { Database } from '../../db'
import { users } from '../../db/schema'
import { UserSchema, UserInternalSchema } from './schema'
import { z } from 'zod'
import { passwordHelpers } from '@hono-kiln/shared'
import { createValidatedRepository } from '../../utils/repository'

type UserType = z.infer<typeof UserSchema>

export function createAuthRepository(db: Database) {
  const publicRepo = createValidatedRepository({
    db,
    queryKey: 'users',
    table: users,
    schema: UserSchema
  })

  const internalRepo = createValidatedRepository({
    db,
    queryKey: 'users',
    table: users,
    schema: UserInternalSchema
  })

  return {
    async findUserByEmail(email: string): Promise<UserType | null> {
      const user = await publicRepo.findFirst({
        where: eq(users.email, email),
      })
      return user || null
    },

    async verifyCredentials(email: string, password: string): Promise<UserType | null> {
      const user = await internalRepo.findFirst({
        where: eq(users.email, email),
      })
      if (!user) return null
      
      const isPasswordValid = await passwordHelpers.verify(password, user.passwordHash)
      if (!isPasswordValid) return null
      
      return UserSchema.parse(user)
    },

    async createUser(data: { name: string; email: string; password: string }, tx?: any): Promise<UserType> {
      const passwordHash = await passwordHelpers.hash(data.password)
      
      // We can use the public repo to insert and return stripped user,
      // but insert takes table'$inferInsert and tx might be a transaction.
      // createValidatedRepository doesn't natively support injecting a transaction, 
      // but wait, if `tx` is provided, we should probably fall back to the original method 
      // or instantiate a repo with tx instead of db.
      
      const client = tx || db;
      const repo = tx ? createValidatedRepository({
        db: client,
        queryKey: 'users',
        table: users,
        schema: UserSchema
      }) : publicRepo;

      const newUser = await repo.insert({
        name: data.name,
        email: data.email,
        passwordHash,
      })
      return newUser
    },
  }
}

