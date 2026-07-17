import { sql } from 'drizzle-orm'
import { createDatabase } from './index'
import { getDatabaseUrl, getDatabaseAuthToken } from './config'

export async function checkDatabaseConnectivity(): Promise<{ success: boolean; error?: string }> {
  try {
    const url = getDatabaseUrl()
    const authToken = getDatabaseAuthToken()
    const db = createDatabase(url, authToken)
    await (db as any).execute(sql`SELECT 1`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}

export async function checkDatabaseSchema(): Promise<{ provisioned: boolean; error?: string }> {
  try {
    const url = getDatabaseUrl()
    const authToken = getDatabaseAuthToken()
    const db = createDatabase(url, authToken)
    // Querying 'users' table which is a core table. LIMIT 1 ensures it's fast.
    await (db as any).execute(sql`SELECT 1 FROM users LIMIT 1`)
    return { provisioned: true }
  } catch (error: any) {
    return { provisioned: false, error: error.message || String(error) }
  }
}
