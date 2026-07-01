import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import { runPreflightChecks } from './preflight'
import * as dbCheck from './db/check'

describe('preflight checks', () => {
  let isTTYOriginalIn: boolean | undefined
  let isTTYOriginalOut: boolean | undefined

  beforeEach(() => {
    isTTYOriginalIn = process.stdin.isTTY
    isTTYOriginalOut = process.stdout.isTTY
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    if (isTTYOriginalIn !== undefined) process.stdin.isTTY = isTTYOriginalIn
    if (isTTYOriginalOut !== undefined) process.stdout.isTTY = isTTYOriginalOut
  })

  it('bypasses interactive prompts in non-TTY environments (CI)', async () => {
    process.stdin.isTTY = false
    process.stdout.isTTY = false

    const dbCheckSpy = spyOn(dbCheck, 'checkDatabaseConnectivity').mockResolvedValue({ success: true })
    
    // If it were to prompt, it would hang or throw because we are not answering
    await runPreflightChecks()

    expect(dbCheckSpy).toHaveBeenCalled()
    dbCheckSpy.mockRestore()
  })

  it('does not exit in non-TTY environments if database connection fails', async () => {
    process.stdin.isTTY = false
    process.stdout.isTTY = false

    const dbCheckSpy = spyOn(dbCheck, 'checkDatabaseConnectivity').mockResolvedValue({ success: false, error: 'connection refused' })
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

    await runPreflightChecks()

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database connection failed'))

    dbCheckSpy.mockRestore()
    consoleSpy.mockRestore()
  })
})
