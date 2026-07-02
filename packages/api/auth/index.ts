import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle'
import { Lucia, TimeSpan } from 'lucia'

import type { Database } from '../db'
import { sessions, users } from '../db/schema'

export type AuthProvider = {
  id: string
  name: string
  handleCallback?: (request: Request) => Promise<any>
}

export const authProviders = new Map<string, AuthProvider>()

export function registerAuthProvider(provider: AuthProvider) {
  authProviders.set(provider.id, provider)
}

export function createAuth(db: Database, isProd: boolean) {
  const adapter = new DrizzleSQLiteAdapter(db, sessions as any, users as any)

  return new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(30, 'd'),
    sessionCookie: {
      expires: false,
      attributes: {
        path: '/',
        sameSite: 'lax',
        secure: isProd,
      },
    },
    getUserAttributes: (attributes) => ({
      email: attributes.email,
      name: attributes.name,
      permissions: attributes.permissions,
    }),
  })
}

export type Auth = ReturnType<typeof createAuth>

declare module 'lucia' {
  interface Register {
    Lucia: Auth
    UserId: number
    DatabaseUserAttributes: {
      email: string
      name: string
      permissions: string[]
    }
  }
}
