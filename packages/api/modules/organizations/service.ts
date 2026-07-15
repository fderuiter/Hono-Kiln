import type { Database } from '../../db'
import { createOrganizationsRepository } from './repository'
import { type Organization, organizations, organizationMembers } from './schema'

export function createOrganizationsService(db: Database) {
  const repository = createOrganizationsRepository(db)

  return {
    async list(): Promise<Organization[]> {
      return repository.list()
    },
    async create(name: string, userId: number): Promise<Organization> {
      return await db.transaction(async (tx) => {
        const [newOrg] = await tx.insert(organizations).values({ name }).returning();
        await tx.insert(organizationMembers).values({
          organizationId: newOrg.id,
          userId,
          role: 'admin'
        });
        return newOrg;
      });
    }
  }
}
