import { z } from '@hono/zod-openapi'
import { integer, text } from '../../utils/db-types'
import { createEntity } from '../../utils/factory'

const userEntity = createEntity('users', {
  id: {
    db: integer('id').primaryKey({ autoIncrement: true }),
    openapi: { description: 'User ID', example: 1 }
  },
  email: {
    db: text('email').notNull().unique(),
    validation: z.string().email('Invalid email address'),
    openapi: { description: 'User email', example: 'john@example.com' }
  },
  name: {
    db: text('name').notNull(),
    validation: z.string().min(1, 'Name is required'),
    openapi: { description: 'User name', example: 'John Doe' }
  },
  passwordHash: {
    db: text('password_hash').notNull()
  },
  permissions: {
    db: text('permissions', { mode: 'json' }).notNull().default([]),
    validation: z.array(z.string()).default([]),
    openapi: { description: 'User permissions', example: ['documents:read'] }
  }
});

const sessionEntity = createEntity('sessions', {
  id: {
    db: text('id').primaryKey(),
    openapi: { description: 'Session ID' }
  },
  userId: {
    db: integer('user_id').notNull().references(() => userEntity.table.id, { onDelete: 'cascade' }),
    openapi: { description: 'User ID associated with session' }
  },
  expiresAt: {
    db: integer('expires_at').notNull(),
    openapi: { description: 'Expiration timestamp' }
  }
});

export const users = userEntity.table;
export const sessions = sessionEntity.table;

export const UserSchema = userEntity.selectSchema.pick({
  id: true,
  email: true,
  name: true,
  permissions: true
}).openapi('User');

export const RegisterRequestSchema = z.object({
  name: userEntity.insertSchema.shape.name,
  email: userEntity.insertSchema.shape.email,
  password: z.string().min(8, 'Password must be at least 8 characters').openapi({ description: 'User password', example: 'password123' })
}).openapi('RegisterRequest');

export const LoginRequestSchema = z.object({
  email: userEntity.insertSchema.shape.email,
  password: z.string().min(1, 'Password is required').openapi({ description: 'User password', example: 'password123' })
}).openapi('LoginRequest');

export const AuthResponseSchema = z.object({
  user: UserSchema.openapi({ description: 'User details' }),
}).openapi('AuthResponse');

export const LogoutResponseSchema = z.object({
  message: z.string().openapi({ description: 'Logout success message', example: 'Logged out successfully' })
}).openapi('LogoutResponse');
