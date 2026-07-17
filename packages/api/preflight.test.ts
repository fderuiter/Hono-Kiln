import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import { runPreflightChecks } from './preflight'
import * as dbCheck from './db/check'
import * as cp from 'node:child_process'

describe('preflight checks', () => {
  let isTTYOriginalIn: boolean | undefined
  let isTTYOriginalOut: boolean | undefined
  let spawnSyncMock: any

  beforeEach(() => {
    isTTYOriginalIn = process.stdin.isTTY
    isTTYOriginalOut = process.stdout.isTTY
    process.env.NODE_ENV = 'development'
    spawnSyncMock = spyOn(cp, 'spawnSync').mockImplementation((cmd: any, args?: any, options?: any) => {
      if (cmd === 'docker' && args?.[0] === 'info') return { status: 0 } as any
      if (cmd === 'docker' && args?.[0] === 'compose') return { stdout: Buffer.from('libsql'), status: 0 } as any
      return { status: 0 } as any
    })
  })

  afterEach(() => {
    if (isTTYOriginalIn !== undefined) process.stdin.isTTY = isTTYOriginalIn
    if (isTTYOriginalOut !== undefined) process.stdout.isTTY = isTTYOriginalOut
    spawnSyncMock.mockRestore()
  })

  it('bypasses interactive prompts in non-TTY environments (CI)', async () => {
    process.stdin.isTTY = false
    process.stdout.isTTY = false

    const dbCheckSpy = spyOn(dbCheck, 'checkDatabaseConnectivity').mockResolvedValue({ success: true })
    const dbSchemaSpy = spyOn(dbCheck, 'checkDatabaseSchema').mockResolvedValue({ provisioned: true })
    
    await runPreflightChecks()

    expect(dbCheckSpy).toHaveBeenCalled()
    expect(dbSchemaSpy).toHaveBeenCalled()
    dbCheckSpy.mockRestore()
    dbSchemaSpy.mockRestore()
  })

  it('exits with a non-zero code in non-TTY environments if database connection fails', async () => {
    process.stdin.isTTY = false
    process.stdout.isTTY = false

    const dbCheckSpy = spyOn(dbCheck, 'checkDatabaseConnectivity').mockResolvedValue({ success: false, error: 'connection refused' })
    const dbSchemaSpy = spyOn(dbCheck, 'checkDatabaseSchema').mockResolvedValue({ provisioned: true })
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined): never => {
      throw new Error(`process.exit called with ${code}`)
    })

    try {
      await runPreflightChecks()
    } catch (e: any) {
      expect(e.message).toBe('process.exit called with 1')
    }

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'))
    expect(exitSpy).toHaveBeenCalledWith(1)

    dbCheckSpy.mockRestore()
    dbSchemaSpy.mockRestore()
    consoleSpy.mockRestore()
    exitSpy.mockRestore()
  })

  it('exits with a non-zero code if database schema is missing', async () => {
    process.stdin.isTTY = false
    process.stdout.isTTY = false

    const dbCheckSpy = spyOn(dbCheck, 'checkDatabaseConnectivity').mockResolvedValue({ success: true })
    const dbSchemaSpy = spyOn(dbCheck, 'checkDatabaseSchema').mockResolvedValue({ provisioned: false, error: 'no such table' })
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined): never => {
      throw new Error(`process.exit called with ${code}`)
    })

    try {
      await runPreflightChecks()
    } catch (e: any) {
      expect(e.message).toBe('process.exit called with 1')
    }

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database schema verification failed'))
    expect(exitSpy).toHaveBeenCalledWith(1)

    dbCheckSpy.mockRestore()
    dbSchemaSpy.mockRestore()
    consoleSpy.mockRestore()
    exitSpy.mockRestore()
  })
})
