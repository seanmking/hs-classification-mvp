import { db } from '@/lib/db/client'
import * as schema from './schema'

async function seed() {
  console.log('🌱 Starting database seed...')
  
  try {
    // Seed HS codes
    const hsCodeData = [
      // Chapter 84 - Machinery
      { code: '84', description: 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof', level: 'chapter' as const, parentCode: null },
      { code: '8471', description: 'Automatic data-processing machines and units thereof', level: 'heading' as const, parentCode: '84' },
      { code: '847130', description: 'Portable automatic data-processing machines, weighing not more than 10 kg', level: 'subheading' as const, parentCode: '8471' },
      { code: '84713000', description: 'Laptops, notebooks and similar portable computers', level: 'tariff' as const, parentCode: '847130' },
      { code: '847141', description: 'Other automatic data-processing machines comprising in the same housing at least a CPU and input/output unit', level: 'subheading' as const, parentCode: '8471' },
      { code: '84714100', description: 'Desktop computers', level: 'tariff' as const, parentCode: '847141' },
      
      // Chapter 85 - Electrical
      { code: '85', description: 'Electrical machinery and equipment and parts thereof', level: 'chapter' as const, parentCode: null },
      { code: '8517', description: 'Telephone sets, including smartphones', level: 'heading' as const, parentCode: '85' },
      { code: '851712', description: 'Telephones for cellular networks or for other wireless networks', level: 'subheading' as const, parentCode: '8517' },
      { code: '85171200', description: 'Smartphones', level: 'tariff' as const, parentCode: '851712' },
      
      // Chapter 39 - Plastics
      { code: '39', description: 'Plastics and articles thereof', level: 'chapter' as const, parentCode: null },
      { code: '3926', description: 'Other articles of plastics', level: 'heading' as const, parentCode: '39' },
      { code: '392690', description: 'Other articles of plastics', level: 'subheading' as const, parentCode: '3926' },
      { code: '39269090', description: 'Other plastic articles not elsewhere specified', level: 'tariff' as const, parentCode: '392690' },
      
      // Chapter 73 - Iron and steel
      { code: '73', description: 'Articles of iron or steel', level: 'chapter' as const, parentCode: null },
      { code: '7304', description: 'Tubes, pipes and hollow profiles, seamless, of iron or steel', level: 'heading' as const, parentCode: '73' },
      { code: '730431', description: 'Cold-drawn or cold-rolled tubes and pipes', level: 'subheading' as const, parentCode: '7304' },
      { code: '73043100', description: 'Cold-drawn or cold-rolled seamless tubes of iron or steel', level: 'tariff' as const, parentCode: '730431' },
    ]
    
    console.log('Seeding HS codes...')
    for (const hsCode of hsCodeData) {
      await db().insert(schema.hsCodes).values(hsCode).onConflictDoNothing()
    }
    
    // Seed a demo user
    console.log('Seeding demo user...')
    const [demoUser] = await db().insert(schema.users).values({
      id: 'user_demo',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'user'
    }).onConflictDoNothing().returning()
    
    // Seed a sample classification
    if (demoUser) {
      console.log('Seeding sample classification...')
      
      const [classification] = await db().insert(schema.classifications).values({
        id: 'clf_sample_001',
        productDescription: 'Portable laptop computer with 15.6 inch display, Intel processor, 16GB RAM, 512GB SSD, weighing 1.8kg',
        userId: demoUser.id,
        status: 'completed',
        currentStep: 'gri_6',
        finalHsCode: '84713000',
        confidence: 0.92,
        completedAt: new Date()
      }).onConflictDoNothing().returning()
      
      if (classification) {
        // Add some decisions
        await db().insert(schema.decisions).values([
          {
            id: 'dec_sample_001',
            classificationId: classification.id,
            step: 'gri_1',
            question: 'What is the primary function of the product?',
            answer: 'Automatic data processing - portable computer for general computing tasks',
            reasoning: 'The product is clearly a portable computer designed for automatic data processing, fitting under heading 8471',
            confidence: 0.95
          },
          {
            id: 'dec_sample_002',
            classificationId: classification.id,
            step: 'gri_1',
            question: 'Does the product meet the weight criteria for portable machines?',
            answer: 'Yes, it weighs 1.8kg which is less than 10kg',
            reasoning: 'The weight of 1.8kg is well under the 10kg threshold for subheading 847130',
            confidence: 1.0
          }
        ]).onConflictDoNothing()
        
        // Add audit logs
        await db().insert(schema.auditLogs).values([
          {
            id: 'audit_sample_001',
            classificationId: classification.id,
            action: 'classification_created',
            actor: demoUser.id,
            details: JSON.stringify({ productDescription: classification.productDescription }),
            hash: 'sample_hash_001'
          },
          {
            id: 'audit_sample_002',
            classificationId: classification.id,
            action: 'classification_completed',
            actor: 'system',
            details: JSON.stringify({ finalHsCode: '84713000', confidence: 0.92 }),
            hash: 'sample_hash_002'
          }
        ]).onConflictDoNothing()
      }
    }
    
    console.log('✅ Database seed completed!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

// Run the seed function
seed().catch(console.error)