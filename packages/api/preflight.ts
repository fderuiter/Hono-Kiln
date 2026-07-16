import { spawnSync } from 'node:child_process'
import readline from 'node:readline/promises'
import config from '../../kiln.json'
import { checkDatabaseConnectivity, checkDatabaseSchema } from './db/check'
import { getDatabaseUrl } from './db/config'

function isRemoteService(url: string): boolean {
  if (url.startsWith('file:') || url === ':memory:') {
    return false
  }
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function runPreflightChecks(): Promise<void> {
  if (Bun.env.NODE_ENV === 'production') {
    return
  }

  const isTTY = process.stdout.isTTY && process.stdin.isTTY
  const dbUrl = getDatabaseUrl()
  const provider = config.provider || 'libsql'
  const shouldSkipDocker = provider !== 'libsql' || isRemoteService(dbUrl)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const promptUser = async (question: string, timeoutMs: number = 30000): Promise<string> => {
    if (!isTTY) return ''
    return new Promise((resolve) => {
      let timeout: ReturnType<typeof setTimeout>

      const onAnswer = (answer: string) => {
        clearTimeout(timeout)
        resolve(answer.trim())
      }

      timeout = setTimeout(() => {
        console.log('\nPrompt timed out.')
        rl.write('\n')
        resolve('')
      }, timeoutMs)

      rl.question(question).then(onAnswer)
    })
  }

  try {
    if (!shouldSkipDocker) {
      let dockerInfo = spawnSync('docker', ['info'])
      while (dockerInfo.status !== 0) {
        console.error('\n[Pre-flight] Docker daemon is not running.')
        if (!isTTY) process.exit(1)
        const answer = await promptUser('Would you like to retry checking Docker daemon? (Y/n): ')
        if (answer.toLowerCase() === 'n' || !answer) {
          console.error('Cannot proceed without Docker. Core application features will be unavailable.')
          process.exit(1)
        }
        dockerInfo = spawnSync('docker', ['info'])
      }

      let dockerPs = spawnSync('docker', ['compose', 'ps', '--services', '--filter', 'status=running'])
      while (!dockerPs.stdout?.toString().includes('libsql')) {
        console.error('\n[Pre-flight] Required Docker containers (libsql) are not running.')
        if (!isTTY) process.exit(1)
        const answer = await promptUser("Would you like to run 'docker compose up -d' now? (Y/n): ")
        if (answer.toLowerCase() === 'n' || !answer) {
          console.error('Cannot proceed without database container. Core application features will be unavailable.')
          process.exit(1)
        } else {
          console.log('Running docker compose up -d...')
          const upRes = spawnSync('docker', ['compose', 'up', '-d'], { stdio: 'inherit' })
          if (upRes.status !== 0) {
            console.error('Failed to start containers.')
          } else {
            process.stdout.write('Waiting for service...')
            let isReady = false
            for (let i = 0; i < 30; i++) {
              const dbStatus = await checkDatabaseConnectivity()
              if (dbStatus.success) {
                isReady = true
                break
              }
              await new Promise((res) => setTimeout(res, 1000))
            }
            console.log()
            if (!isReady) {
              console.error('Database failed to become healthy within 30 seconds.')
              process.exit(1)
            }
          }
        }
        dockerPs = spawnSync('docker', ['compose', 'ps', '--services', '--filter', 'status=running'])
      }
    }

    let dbStatus = await checkDatabaseConnectivity()
    while (!dbStatus.success) {
      console.error(`\n[Pre-flight] Database connection failed: ${dbStatus.error}`)
      if (!isTTY) process.exit(1)
      const answer = await promptUser('Would you like to (r)etry or (u)pdate configuration? (r/u/N): ')
      if (answer.toLowerCase() === 'u') {
        const newUrl = await promptUser('Enter new DATABASE_URL: ')
        if (newUrl) {
          Bun.env.DATABASE_URL = newUrl
        }
        const newToken = await promptUser('Enter new DATABASE_AUTH_TOKEN (leave empty for none): ')
        if (newToken) {
          Bun.env.DATABASE_AUTH_TOKEN = newToken
        }
      } else if (answer.toLowerCase() === 'r') {
        // Just loop and retry
      } else {
        console.error('Database is unreachable. Core application features will be unavailable.')
        process.exit(1)
      }
      dbStatus = await checkDatabaseConnectivity()
    }

    const schemaStatus = await checkDatabaseSchema()
    if (!schemaStatus.provisioned) {
      console.error('\n[Pre-flight] Database schema verification failed. Required core tables are missing.')
      console.error(`Error details: ${schemaStatus.error}`)
      console.error('\nPlease provision your database by running:')
      console.error('  bun run setup')
      console.error('Or manually apply migrations via:')
      console.error('  bun run sync-schema && bun run db:push')
      console.error('\nServer startup aborted.')
      process.exit(1)
    }
  } finally {
    rl.close()
  }
}
