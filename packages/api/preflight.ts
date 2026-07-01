import { spawnSync } from 'node:child_process'
import readline from 'node:readline/promises'
import { checkDatabaseConnectivity } from './db/check'

export async function runPreflightChecks(): Promise<void> {
  if (Bun.env.NODE_ENV === 'production') {
    return
  }

  const isTTY = process.stdout.isTTY && process.stdin.isTTY

  if (!isTTY) {
    const dbStatus = await checkDatabaseConnectivity()
    if (!dbStatus.success) {
      console.error(`Database connection failed: ${dbStatus.error}. Core application features will be unavailable.`)
    }
    return
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const promptUser = async (question: string, timeoutMs: number = 30000): Promise<string> => {
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
    let dockerInfo = spawnSync('docker', ['info'])
    while (dockerInfo.status !== 0) {
      console.error('\n[Pre-flight] Docker daemon is not running.')
      const answer = await promptUser('Would you like to retry checking Docker daemon? (Y/n): ')
      if (answer.toLowerCase() === 'n') {
        console.error('Cannot proceed without Docker. Core application features will be unavailable.')
        return
      }
      dockerInfo = spawnSync('docker', ['info'])
    }

    let dockerPs = spawnSync('docker', ['compose', 'ps', '--services', '--filter', 'status=running'])
    while (!dockerPs.stdout?.toString().includes('libsql')) {
      console.error('\n[Pre-flight] Required Docker containers (libsql) are not running.')
      const answer = await promptUser("Would you like to run 'docker compose up -d' now? (Y/n): ")
      if (answer.toLowerCase() === 'n') {
        console.error('Cannot proceed without database container. Core application features will be unavailable.')
        return
      } else {
        console.log('Running docker compose up -d...')
        const upRes = spawnSync('docker', ['compose', 'up', '-d'], { stdio: 'inherit' })
        if (upRes.status !== 0) {
          console.error('Failed to start containers.')
        } else {
          await new Promise((res) => setTimeout(res, 2000))
        }
      }
      dockerPs = spawnSync('docker', ['compose', 'ps', '--services', '--filter', 'status=running'])
    }

    let dbStatus = await checkDatabaseConnectivity()
    while (!dbStatus.success) {
      console.error(`\n[Pre-flight] Database connection failed: ${dbStatus.error}`)
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
        return
      }
      dbStatus = await checkDatabaseConnectivity()
    }
  } finally {
    rl.close()
  }
}
