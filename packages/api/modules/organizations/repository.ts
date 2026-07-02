import type { Database } from '../../db'
import { organizations, type Organization } from './schema'

export function createOrganizationsRepository(db: Database) {
  return {
    async list(): Promise<Organization[]> {
      return (await db.select().from(organizations)) as Organization[]
    },
  }
}
