import { z } from '@hono/zod-openapi'
import { integer, text, createTable, primaryKey } from '../../utils/db-types'
import { createEntity } from '../../utils/factory'
import { users } from '../auth/schema'

export const organizationEntity = createEntity('organizations', {
  name: {
    db: text('name').notNull(),
    validation: z.string().min(1, 'Name is required'),
    openapi: { description: 'Organization name', example: 'Acme Corp' }
  }
})

export const organizations = organizationEntity.table

export const organizationMembers = createTable('organization_members', {
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
}, (table: any) => ({
  pk: primaryKey({ columns: [table.organizationId, table.userId] })
}))

export const OrganizationSchema = organizationEntity.selectSchema.openapi('Organization')

export type Organization = z.infer<typeof OrganizationSchema>
