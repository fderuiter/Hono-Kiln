import { sql } from 'drizzle-orm'
import { createDatabase } from './index'
import { getDatabaseUrl, getDatabaseAuthToken } from './config'

export async function checkDatabaseConnectivity(): Promise<{ success: boolean; error?: string }> {
  try {
    const url = getDatabaseUrl()
    const authToken = getDatabaseAuthToken()
    const db = createDatabase(url, authToken)
    await db.run(sql`SELECT 1`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) }
  }
}
