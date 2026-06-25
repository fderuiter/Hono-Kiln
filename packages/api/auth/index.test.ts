import { describe, expect, it } from 'bun:test'
import { createAuth } from './index'
import { createDatabase } from '../db'

describe('createAuth', () => {
  it('sets secure cookie attribute to true when isProd is true', () => {
    const db = createDatabase('file::memory:')
    const auth = createAuth(db, true)
    // @ts-ignore: Accessing private or internal property for testing
    const secure = auth.sessionCookieController.baseCookieAttributes.secure
    expect(secure).toBe(true)
  })

  it('sets secure cookie attribute to false when isProd is false', () => {
    const db = createDatabase('file::memory:')
    const auth = createAuth(db, false)
    // @ts-ignore
    const secure = auth.sessionCookieController.baseCookieAttributes.secure
    expect(secure).toBe(false)
  })
})
