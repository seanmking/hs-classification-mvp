import { withTransaction } from '@/lib/db/client'
import { users } from '@/db/schema'

async function seed() {
  console.log('Starting database seeding...')
  
  try {
    await withTransaction(async (tx) => {
      // Create anonymous user
      await tx.insert(users).values({
        id: 'anonymous',
        email: null,
        name: 'Anonymous User',
        role: 'user'
      }).onConflictDoNothing()
      
      console.log('✅ Created anonymous user')
    })
    
    console.log('✅ Database seeding completed successfully')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

seed()
  .then(() => {
    console.log('Seeding complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })