import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { migrateHSCodes, createSectionChapterMappings } from './migrations/utils/migrate-to-enhanced'
import { validateStagingData, loadValidatedData } from './seed/validate-staging-data'
import * as fs from 'fs/promises'
import * as path from 'path'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('========================================')
  console.log('SARS-Compliant Schema Migration')
  console.log('========================================')
  
  const databasePath = path.join(process.cwd(), 'database.db')
  const sqlite = new Database(databasePath)
  const db = drizzle(sqlite)
  
  let latestBackup: string | undefined
  
  try {
    // 1. Check if backup exists
    const backupFiles = await fs.readdir(process.cwd())
    latestBackup = backupFiles
      .filter(f => f.startsWith('database.backup.'))
      .sort()
      .pop()
    
    if (!latestBackup) {
      console.error('❌ No backup found. Please create a backup first using: npm run db:backup')
      process.exit(1)
    }
    
    console.log(`✅ Found backup: ${latestBackup}`)
    
    // 2. Run schema migration
    console.log('\n📋 Running schema migration...')
    
    // Execute migrations in order
    const migrations = [
      '0002_sars_tables.sql',
      '0003_sars_indexes.sql',
      '0004_sars_data.sql'
    ]
    
    let totalTablesCreated = 0
    let totalIndexesCreated = 0
    let totalDataInserted = 0
    
    for (const migrationFile of migrations) {
      console.log(`\n   Processing ${migrationFile}...`)
      
      const migrationPath = path.join(process.cwd(), 'src/db/migrations', migrationFile)
      const migrationSQL = await fs.readFile(migrationPath, 'utf-8')
      
      // Execute the entire SQL file at once instead of splitting
      // This handles multi-line statements and semicolons within strings properly
      try {
        console.log(`     Executing ${migrationFile} as a single transaction...`)
        sqlite.exec(migrationSQL)
        
        // Count what was done by examining the SQL
        const tablesCreated = (migrationSQL.match(/CREATE TABLE/gi) || []).length
        const indexesCreated = (migrationSQL.match(/CREATE INDEX/gi) || []).length
        const dataInserted = (migrationSQL.match(/INSERT INTO/gi) || []).length
        
        console.log(`     - Tables: ${tablesCreated}, Indexes: ${indexesCreated}, Data rows: ${dataInserted}`)
        
        totalTablesCreated += tablesCreated
        totalIndexesCreated += indexesCreated
        totalDataInserted += dataInserted
      } catch (error: any) {
        console.error(`\nError executing ${migrationFile}:`)
        console.error(`Error: ${error.message}`)
        throw error
      }
    }
    
    console.log(`\n   Total - Tables created: ${totalTablesCreated}`)
    console.log(`   Total - Indexes created: ${totalIndexesCreated}`)
    console.log(`   Total - Data rows inserted: ${totalDataInserted}`)
    
    console.log('✅ Schema migration completed')
    
    // 3. Migrate existing data
    console.log('\n📦 Migrating existing data...')
    
    // Check if there's data to migrate
    const hasData = sqlite.prepare('SELECT COUNT(*) as count FROM hs_codes').get() as { count: number }
    
    if (hasData.count > 0) {
      await migrateHSCodes()
      await createSectionChapterMappings()
      console.log('✅ Data migration completed')
    } else {
      console.log('ℹ️  No existing data to migrate')
    }
    
    // 4. Create staging tables
    console.log('\n🔧 Creating staging tables...')
    const stagingPath = path.join(process.cwd(), 'src/db/seed/create-staging-tables.sql')
    const stagingSQL = await fs.readFile(stagingPath, 'utf-8')
    
    const stagingStatements = stagingSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of stagingStatements) {
      try {
        sqlite.exec(statement + ';')
      } catch (error: any) {
        if (!statement.toUpperCase().startsWith('DROP TABLE')) {
          console.error(`Error creating staging table: ${error.message}`)
          throw error
        }
      }
    }
    
    console.log('✅ Staging tables created')
    
    // 5. Validate migration
    console.log('\n🔍 Validating migration...')
    const validation = await validateMigration(db)
    
    if (validation.success) {
      console.log('✅ Migration validation passed')
      console.log(`   - Tables created: ${validation.tablesCreated.join(', ')}`)
      console.log(`   - Sections loaded: ${validation.sectionsCount}`)
      console.log(`   - Enhanced codes: ${validation.enhancedCodesCount}`)
      console.log(`   - Legal notes: ${validation.legalNotesCount}`)
    } else {
      console.error('❌ Migration validation failed')
      console.error(validation.errors)
      process.exit(1)
    }
    
    console.log('\n========================================')
    console.log('✅ SARS Migration Completed Successfully!')
    console.log('========================================')
    console.log('\nNext steps:')
    console.log('1. Load SARS data: npm run db:seed:sars')
    console.log('2. Validate staging: npm run db:validate')
    console.log('3. Review the migration at: npm run db:studio')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\nTo restore from backup:')
    console.error(`cp ${latestBackup} database.db`)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

async function validateMigration(db: any) {
  const errors: string[] = []
  
  // Check if new tables exist
  const tableCheckQuery = sql`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name IN (
      'hs_codes_enhanced', 
      'legal_notes', 
      'hs_code_sections',
      'sars_additional_notes',
      'section_chapter_mapping',
      'classification_legal_notes',
      'sars_determinations',
      'legal_note_versions'
    )
  `
  
  const tables = await db.all(tableCheckQuery)
  const tableNames = tables.map((t: any) => t.name)
  
  const requiredTables = [
    'hs_codes_enhanced',
    'legal_notes',
    'hs_code_sections'
  ]
  
  const missingTables = requiredTables.filter(t => !tableNames.includes(t))
  if (missingTables.length > 0) {
    errors.push(`Missing required tables: ${missingTables.join(', ')}`)
  }
  
  // Check sections
  const sectionsResult = await db.get(sql`SELECT COUNT(*) as count FROM hs_code_sections`)
  const sectionsCount = (sectionsResult as any).count
  
  if (sectionsCount !== 21) {
    errors.push(`Expected 21 sections, found ${sectionsCount}`)
  }
  
  // Check enhanced codes count
  const enhancedResult = await db.get(sql`SELECT COUNT(*) as count FROM hs_codes_enhanced`)
  const enhancedCount = (enhancedResult as any).count || 0
  
  // Check legal notes count
  const notesResult = await db.get(sql`SELECT COUNT(*) as count FROM legal_notes`)
  const notesCount = (notesResult as any).count || 0
  
  return {
    success: errors.length === 0,
    errors,
    tablesCreated: tableNames,
    sectionsCount,
    enhancedCodesCount: enhancedCount,
    legalNotesCount: notesCount
  }
}

// Run the migration
main().catch(console.error)