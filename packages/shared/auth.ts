import { setCookie } from 'hono/cookie'
import type { Context } from 'hono'

/** Utilities for securely hashing and verifying passwords */
export const passwordHelpers = {
  hash: (password: string) => Bun.password.hash(password),
  verify: (password: string, hash: string) => Bun.password.verify(password, hash),
}

/** Utilities for managing session cookies in HTTP responses */
export const sessionHelpers = {
  setSessionCookie: (c: Context, sessionCookie: { name: string; value: string; attributes: any }) => {
    setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
  }
}
