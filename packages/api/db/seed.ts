import { getDatabaseAuthToken, getDatabaseUrl } from './config'
import { createDatabase } from './index'
import * as schema from './schema'
import { passwordHelpers } from '@hono-kiln/shared'

async function seed() {
  console.log('🌱 Seeding database...')
  const db = createDatabase(getDatabaseUrl(), getDatabaseAuthToken())

  try {
    // Clear tables (idempotent)
    console.log('Clearing existing data...')
    await db.delete(schema.users)

    // Insert dummy user
    console.log('Inserting dummy user...')
    const passwordHash = await passwordHelpers.hash('password123')

    await db.insert(schema.users).values({
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
    })

    console.log('✅ Database seeded successfully!')
    console.log('You can now log in with:')
    console.log('Email: test@example.com')
    console.log('Password: password123')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

seed()
