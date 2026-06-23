import { getDatabaseAuthToken, getDatabaseUrl } from './config'
import { createDatabase } from './index'
import * as schema from './schema'

async function seed() {
  console.log('🌱 Seeding database...')
  const db = createDatabase(getDatabaseUrl(), getDatabaseAuthToken())

  const shouldClean = process.env.SEED_CLEAN === 'true'

  try {
    if (shouldClean) {
      console.log('Clearing existing data...')
      await db.delete(schema.sessions)
      await db.delete(schema.users)
    }

    console.log('Inserting dummy users...')
    const passwordHash = await Bun.password.hash('password123')

    const usersToInsert = [
      {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
      },
      {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash,
      },
      {
        email: 'user@example.com',
        name: 'Regular User',
        passwordHash,
      },
    ]

    for (const user of usersToInsert) {
      try {
        await db.insert(schema.users).values(user)
        console.log(`Inserted user: ${user.email}`)
      } catch (error) {
        if (!shouldClean) {
          console.log(`User ${user.email} already exists, skipping.`)
        } else {
          throw error
        }
      }
    }

    console.log('✅ Database seeded successfully!')
    console.log('You can now log in with:')
    console.log('Emails: test@example.com, admin@example.com, user@example.com')
    console.log('Password: password123')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

seed()
