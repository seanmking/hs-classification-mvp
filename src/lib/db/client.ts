import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from '@/db/schema'

// TODO: Implement proper database client initialization
// This will be used throughout the application for database operations

let db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!db) {
    const sqlite = new Database(process.env.DATABASE_URL || './database.db')
    db = drizzle(sqlite, { schema })
  }
  return db
}

// Helper function to ensure database is initialized
export async function initializeDatabase() {
  try {
    const database = getDb()
    
    // Test connection
    const result = await database.select().from(schema.classifications).limit(1)
    console.log('Database connection successful')
    
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const database = getDb()
  return database.transaction(async (tx) => {
    return callback(tx)
  })
}

// Export commonly used query functions
export { eq, and, or, desc, asc, sql, like, between } from 'drizzle-orm'

// Export the database instance getter
export { getDb as db }