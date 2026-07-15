import type { Database } from '../../db'
import type { Auth } from '../../auth'
import { createAuthRepository } from './repository'
import { organizations, organizationMembers } from '../organizations/schema'

export function createAuthService(db: Database, auth: Auth) {
  const repository = createAuthRepository(db)

  return {
    async register(name: string, email: string, password: string, workspaceName?: string) {
      const existingUser = await repository.findUserByEmail(email)

      if (existingUser) {
        return { error: 'User already exists' }
      }

      let newUser;
      try {
        newUser = await db.transaction(async (tx) => {
          const user = await repository.createUser({
            name,
            email,
            password,
          }, tx)

          const finalWorkspaceName = workspaceName || `${name}'s Workspace`;

          const [newOrg] = await tx.insert(organizations).values({
            name: finalWorkspaceName
          }).returning();

          await tx.insert(organizationMembers).values({
            organizationId: newOrg.id,
            userId: user.id,
            role: 'admin'
          });

          return user;
        });
      } catch (error) {
        throw error;
      }

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
