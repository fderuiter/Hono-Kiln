import { z } from '@hono/zod-openapi'
import { integer, text, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core'
import { createEntity } from '../../utils/factory'
import { users } from '../auth/schema'

export const organizationEntity = createEntity('organizations', {
  id: {
    db: integer('id').primaryKey({ autoIncrement: true }),
    openapi: { description: 'Organization ID', example: 1 }
  },
  name: {
    db: text('name').notNull(),
    validation: z.string().min(1, 'Name is required'),
    openapi: { description: 'Organization name', example: 'Acme Corp' }
  }
})

export const organizations = organizationEntity.table

export const organizationMembers = sqliteTable('organization_members', {
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
}, (table) => ({
  pk: primaryKey({ columns: [table.organizationId, table.userId] })
}))

export const OrganizationSchema = organizationEntity.selectSchema.openapi('Organization')

export type Organization = z.infer<typeof OrganizationSchema>
export const entityName = 'organizations' as const
