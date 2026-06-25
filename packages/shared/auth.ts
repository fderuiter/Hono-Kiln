import { setCookie } from 'hono/cookie'
import type { Context } from 'hono'

export const passwordHelpers = {
  hash: (password: string) => Bun.password.hash(password),
  verify: (password: string, hash: string) => Bun.password.verify(password, hash),
}

export const sessionHelpers = {
  setSessionCookie: (c: Context, sessionCookie: { name: string; value: string; attributes: any }) => {
    setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes)
  }
}
