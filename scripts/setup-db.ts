#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import * as schema from '../src/db/schema'
import path from 'path'
import fs from 'fs'

async function setupDatabase() {
  console.log('🔧 Setting up database...')
  
  try {
    // Ensure database directory exists
    const dbPath = './database.db'
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir) && dbDir !== '.') {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    
    // Create database connection
    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite, { schema })
    
    console.log('📁 Database file created at:', dbPath)
    
    // Run migrations
    console.log('🔄 Running migrations...')
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    
    console.log('✅ Migrations completed successfully!')
    
    // Verify tables were created
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all()
    
    console.log('\n📊 Created tables:')
    tables.forEach((table: any) => {
      console.log(`  - ${table.name}`)
    })
    
    // Close connection
    sqlite.close()
    
    console.log('\n✅ Database setup completed successfully!')
    console.log('💡 Run "npm run db:seed" to add sample data')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

// Run setup
setupDatabase().catch(console.error)