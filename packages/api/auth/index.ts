import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle'
import { Lucia, TimeSpan } from 'lucia'

import { db } from '../db'
import { sessions, users } from '../db/schema'

const runtimeEnv = typeof Bun !== 'undefined' ? Bun.env : process.env

const adapter = new DrizzleSQLiteAdapter(db, sessions, users)

export const auth = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(30, 'd'),
  sessionCookie: {
    expires: false,
    attributes: {
      path: '/',
      sameSite: 'lax',
      secure: runtimeEnv.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
  }),
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof auth
    UserId: number
    DatabaseUserAttributes: {
      email: string
      name: string
    }
  }
}
