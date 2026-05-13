import { z } from '@hono/zod-openapi'

export const RegisterRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const AuthResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    email: z.string().email(),
    name: z.string(),
  }),
})

export const ErrorResponseSchema = z.object({
  error: z.string(),
})
