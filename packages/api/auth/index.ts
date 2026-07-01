import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle'
import { Lucia, TimeSpan } from 'lucia'

import type { Database } from '../db'
import { sessions, users } from '../db/schema'

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
    }
  }
}
