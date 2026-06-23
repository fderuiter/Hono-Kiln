import { z } from '@hono/zod-openapi'

export const RegisterRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').openapi({ description: 'User name', example: 'John Doe' }),
  email: z.string().email('Invalid email address').openapi({ description: 'User email', example: 'john@example.com' }),
  password: z.string().min(8, 'Password must be at least 8 characters').openapi({ description: 'User password', example: 'password123' }),
}).openapi('RegisterRequest')

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address').openapi({ description: 'User email', example: 'john@example.com' }),
  password: z.string().min(1, 'Password is required').openapi({ description: 'User password', example: 'password123' }),
}).openapi('LoginRequest')

export const UserSchema = z.object({
  id: z.number().openapi({ description: 'User ID', example: 1 }),
  email: z.string().email().openapi({ description: 'User email', example: 'john@example.com' }),
  name: z.string().openapi({ description: 'User name', example: 'John Doe' }),
}).openapi('User')

export const AuthResponseSchema = z.object({
  user: UserSchema.openapi({ description: 'User details' }),
}).openapi('AuthResponse')

export const LogoutResponseSchema = z.object({
  message: z.string().openapi({ description: 'Logout success message', example: 'Logged out successfully' })
}).openapi('LogoutResponse')
