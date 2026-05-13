import { describe, expect, it } from 'bun:test'
import { getTableName } from 'drizzle-orm'
import { getTableColumns } from 'drizzle-orm/utils'

import { DEFAULT_DATABASE_URL, getDatabaseUrl } from './config'
import { sessions, users } from './schema'

describe('database configuration', () => {
  it('defaults to the local libsql server', () => {
    expect(getDatabaseUrl({})).toBe(DEFAULT_DATABASE_URL)
  })

  it('allows DATABASE_URL overrides', () => {
    expect(getDatabaseUrl({ DATABASE_URL: 'file:local.db' })).toBe(
      'file:local.db',
    )
  })

  it('defines the users table', () => {
    const columns = getTableColumns(users)

    expect(getTableName(users)).toBe('users')
    expect(Object.keys(columns)).toEqual(['id', 'email', 'name'])
    expect(columns.id).toBeDefined()
    expect(columns.email).toBeDefined()
    expect(columns.name).toBeDefined()
  })

  it('defines the sessions table for lucia auth', () => {
    const columns = getTableColumns(sessions)

    expect(getTableName(sessions)).toBe('sessions')
    expect(Object.keys(columns)).toEqual(['id', 'userId', 'expiresAt'])
    expect(columns.id).toBeDefined()
    expect(columns.userId).toBeDefined()
    expect(columns.expiresAt).toBeDefined()
  })
})
