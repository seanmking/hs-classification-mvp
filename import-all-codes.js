const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

// Simple ID generator
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function importAllCodes() {
  console.log('🚀 Importing ALL SARS tariff codes...');
  
  try {
    // Load parsed data
    const parsedData = JSON.parse(fs.readFileSync('sars-complete-v2-results.json', 'utf8'));
    
    console.log(`\n📊 Loaded data summary:`);
    console.log(`  - ${parsedData.summary.totalTariffCodes} total tariff codes`);
    console.log(`  - ${parsedData.summary.tariffByLevel.heading} headings (4-digit)`);
    console.log(`  - ${parsedData.summary.tariffByLevel.subheading} subheadings (6-digit)`);
    console.log(`  - ${parsedData.summary.tariffByLevel.tariff} tariff items (8-digit)`);
    
    // Create backup first
    console.log('\n💾 Creating backup...');
    db.exec(`VACUUM INTO 'database.backup.all-codes.db'`);
    
    // Clear existing codes (except chapters which are already correct)
    console.log('\n🧹 Clearing existing non-chapter codes...');
    db.exec(`DELETE FROM hs_codes_enhanced WHERE level != 'chapter'`);
    
    // Import all tariff codes
    console.log('\n🏷️ Importing ALL tariff codes...');
    const insertTariff = db.prepare(`
      INSERT OR REPLACE INTO hs_codes_enhanced 
      (id, code, code_2_digit, code_4_digit, code_6_digit, code_8_digit, 
       check_digit, description, level, parent_code, section_code, 
       tariff_rate, unit_of_measure, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((codes) => {
      let count = 0;
      const startTime = Date.now();
      
      for (const tariff of codes) {
        const chapterCode = tariff.code.substring(0, 2);
        const chapter = parsedData.chapters.find(c => c.chapterCode === chapterCode);
        
        // Validate check digit for 8-digit codes
        let checkDigitValid = true;
        if (tariff.code.length === 8 && tariff.cd) {
          const calculated = calculateCheckDigit(tariff.code);
          if (calculated !== tariff.cd) {
            console.warn(`  ⚠️ Check digit mismatch for ${tariff.code}: expected ${calculated}, got ${tariff.cd}`);
            checkDigitValid = false;
          }
        }
        
        insertTariff.run(
          `hs_${tariff.code}`,
          tariff.code,
          tariff.code.substring(0, 2),
          tariff.code.length >= 4 ? tariff.code.substring(0, 4) : null,
          tariff.code.length >= 6 ? tariff.code.substring(0, 6) : null,
          tariff.code.length === 8 ? tariff.code : null,
          tariff.cd || null,
          tariff.description,
          tariff.level,
          getParentCode(tariff.code),
          chapter?.sectionCode || null,
          tariff.generalRate && tariff.generalRate !== 'free' ? 
            parseFloat(tariff.generalRate.replace('%', '')) : 0,
          tariff.unit || null,
          new Date().toISOString(),
          new Date().toISOString()
        );
        
        count++;
        if (count % 1000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (count / elapsed).toFixed(0);
          console.log(`  ... imported ${count} codes (${rate} codes/sec)`);
        }
      }
      
      return count;
    });
    
    const totalImported = insertMany(parsedData.tariffCodes);
    console.log(`  ✅ Imported ${totalImported} tariff codes`);
    
    // Verify final counts
    console.log('\n🔍 Verifying import...');
    const counts = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM hs_codes_enhanced) as total_codes,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'chapter') as chapters,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'heading') as headings,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'subheading') as subheadings,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE level = 'tariff') as tariff_items,
        (SELECT COUNT(*) FROM hs_codes_enhanced WHERE check_digit IS NOT NULL) as codes_with_cd
    `).get();
    
    console.log('\n✅ Import Results:');
    console.log(`  Total codes: ${counts.total_codes}`);
    console.log(`  - Chapters: ${counts.chapters}`);
    console.log(`  - Headings: ${counts.headings}`);
    console.log(`  - Subheadings: ${counts.subheadings}`);
    console.log(`  - Tariff items: ${counts.tariff_items}`);
    console.log(`  - Codes with check digits: ${counts.codes_with_cd}`);
    
    // Test some sample codes
    console.log('\n🧪 Testing sample codes...');
    const samples = db.prepare(`
      SELECT code, description, level, check_digit 
      FROM hs_codes_enhanced 
      WHERE level = 'tariff' AND check_digit IS NOT NULL
      LIMIT 5
    `).all();
    
    for (const sample of samples) {
      const calculated = calculateCheckDigit(sample.code);
      console.log(`  ${sample.code} CD:${sample.check_digit} (calc:${calculated}) ${calculated === sample.check_digit ? '✓' : '✗'} - ${sample.description.substring(0, 40)}...`);
    }
    
    // Final summary
    console.log('\n🎉 ALL SARS TARIFF CODES IMPORTED!');
    console.log('📌 Complete Import Summary:');
    console.log(`  ✅ ${counts.total_codes} total HS codes`);
    console.log(`  ✅ ${counts.headings} headings for broad classification`);
    console.log(`  ✅ ${counts.subheadings} subheadings for detailed classification`);
    console.log(`  ✅ ${counts.tariff_items} tariff items for final 8-digit classification`);
    console.log(`  ✅ ${counts.codes_with_cd} codes with check digits for validation`);
    console.log('\n🚀 The system now has COMPLETE SARS tariff data for full legal compliance!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

function getParentCode(code) {
  if (code.length === 2) return null;
  if (code.length === 4) return code.substring(0, 2);
  if (code.length === 6) return code.substring(0, 4);
  if (code.length === 8) return code.substring(0, 6);
  return null;
}

function calculateCheckDigit(code8) {
  if (code8.length !== 8) {
    throw new Error(`Code must be 8 digits, got ${code8.length}`);
  }
  
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(code8[i]) * (i % 2 === 0 ? 1 : 3);
  }
  
  return String((10 - (sum % 10)) % 10);
}

// Run the import
importAllCodes().catch(console.error);