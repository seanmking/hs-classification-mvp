const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

// Test products
const testProducts = [
  {
    name: "iPhone 15 Pro",
    description: "Smartphone with cellular network capability",
    keywords: ["telephone", "cellular", "wireless", "apparatus"],
    expectedChapter: "85"
  },
  {
    name: "Fresh Bananas",
    description: "Fresh bananas for human consumption",
    keywords: ["bananas", "fresh", "fruit"],
    expectedChapter: "08"
  },
  {
    name: "Cotton T-Shirt",
    description: "Men's cotton t-shirt, knitted",
    keywords: ["cotton", "knitted", "garment", "shirt"],
    expectedChapter: "61"
  },
  {
    name: "Leather Handbag",
    description: "Women's handbag of leather",
    keywords: ["leather", "handbag", "bag"],
    expectedChapter: "42"
  },
  {
    name: "Plastic Water Bottle",
    description: "Empty plastic bottle for beverages",
    keywords: ["plastic", "bottle", "container"],
    expectedChapter: "39"
  },
  {
    name: "Gold Necklace",
    description: "Gold jewelry for personal adornment",
    keywords: ["gold", "jewelry", "necklace", "precious metal"],
    expectedChapter: "71"
  },
  {
    name: "Wooden Dining Table",
    description: "Wooden furniture for dining",
    keywords: ["wood", "furniture", "table"],
    expectedChapter: "94"
  },
  {
    name: "Car Tires",
    description: "Pneumatic tires of rubber",
    keywords: ["tire", "rubber", "pneumatic"],
    expectedChapter: "40"
  },
  {
    name: "Frozen Beef",
    description: "Frozen boneless beef meat",
    keywords: ["beef", "meat", "frozen", "bovine"],
    expectedChapter: "02"
  },
  {
    name: "Steel Screws",
    description: "Screws of iron or steel",
    keywords: ["screw", "steel", "iron", "fastener"],
    expectedChapter: "73"
  }
];

// Search for matching HS codes
function findMatchingCodes(keywords) {
  const query = `
    SELECT DISTINCT 
      code,
      description,
      level,
      code_2_digit as chapter
    FROM hs_codes_enhanced
    WHERE (
      ${keywords.map(() => 'LOWER(description) LIKE ?').join(' OR ')}
    )
    AND level IN ('heading', 'subheading', 'tariff')
    ORDER BY 
      CASE level 
        WHEN 'heading' THEN 1 
        WHEN 'subheading' THEN 2 
        WHEN 'tariff' THEN 3 
      END,
      code
    LIMIT 10
  `;
  
  const params = keywords.map(k => `%${k.toLowerCase()}%`);
  return db.prepare(query).all(...params);
}

// Check exclusions for a code
function checkExclusions(code) {
  const query = `
    SELECT 
      em.excluded_code,
      em.excluding_code,
      ln.note_text
    FROM exclusion_matrix em
    LEFT JOIN legal_notes ln ON ln.id = em.legal_note_id
    WHERE em.excluded_code = ? OR em.excluded_code LIKE ? || '%'
    LIMIT 5
  `;
  
  return db.prepare(query).all(code, code.substring(0, 4));
}

// Get legal notes for a code
function getLegalNotes(code) {
  const chapter = code.substring(0, 2);
  const heading = code.length >= 4 ? code.substring(0, 4) : null;
  
  const query = `
    SELECT 
      note_type,
      note_number,
      note_text
    FROM legal_notes
    WHERE hs_code IN (?, ?, ?)
    ORDER BY priority DESC
    LIMIT 5
  `;
  
  return db.prepare(query).all(chapter, heading, code).filter(n => n.note_text);
}

// Simulate GRI logic
function applyGRIRules(product, matches) {
  console.log('\n📋 Applying GRI Rules:');
  
  // Rule 1: Classification by specific terms
  console.log('\n🔹 Rule 1 - Classification by specific terms:');
  const rule1Matches = matches.filter(m => {
    const desc = m.description.toLowerCase();
    return product.keywords.some(k => desc.includes(k.toLowerCase()));
  });
  
  if (rule1Matches.length > 0) {
    console.log(`   Found ${rule1Matches.length} matches by specific terms`);
    rule1Matches.slice(0, 3).forEach(m => {
      console.log(`   - ${m.code}: ${m.description.substring(0, 60)}...`);
    });
  }
  
  // Rule 3: Most specific description
  console.log('\n🔹 Rule 3 - Most specific description:');
  let bestMatch = null;
  let bestScore = 0;
  
  matches.forEach(match => {
    const desc = match.description.toLowerCase();
    let score = 0;
    product.keywords.forEach(keyword => {
      if (desc.includes(keyword.toLowerCase())) {
        score += keyword.length; // Longer keywords = more specific
      }
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = match;
    }
  });
  
  if (bestMatch) {
    console.log(`   Most specific match (score: ${bestScore}):`);
    console.log(`   - ${bestMatch.code}: ${bestMatch.description.substring(0, 60)}...`);
  }
  
  return bestMatch || rule1Matches[0] || matches[0];
}

// Test a single product
function testProduct(product) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${product.name}`);
  console.log(`📝 Description: ${product.description}`);
  console.log(`🔍 Keywords: ${product.keywords.join(', ')}`);
  console.log(`🎯 Expected Chapter: ${product.expectedChapter}`);
  console.log('-'.repeat(80));
  
  try {
    // Find matching codes
    const matches = findMatchingCodes(product.keywords);
    
    if (matches.length === 0) {
      console.log('❌ No matching codes found');
      return { passed: false, reason: 'No matches' };
    }
    
    console.log(`\n📊 Found ${matches.length} potential matches:`);
    matches.slice(0, 5).forEach(match => {
      console.log(`   ${match.code} (${match.level}): ${match.description.substring(0, 50)}...`);
    });
    
    // Apply GRI rules
    const selected = applyGRIRules(product, matches);
    
    if (!selected) {
      console.log('❌ Could not determine classification');
      return { passed: false, reason: 'No classification' };
    }
    
    console.log(`\n✅ Selected Classification:`);
    console.log(`   Code: ${selected.code}`);
    console.log(`   Level: ${selected.level}`);
    console.log(`   Description: ${selected.description}`);
    
    // Check exclusions
    const exclusions = checkExclusions(selected.code);
    if (exclusions.length > 0) {
      console.log(`\n⚠️ Exclusions found:`);
      exclusions.forEach(exc => {
        console.log(`   - Excludes ${exc.excluded_code}: ${exc.note_text?.substring(0, 60)}...`);
      });
    }
    
    // Get legal notes
    const notes = getLegalNotes(selected.code);
    if (notes.length > 0) {
      console.log(`\n📜 Legal Notes:`);
      notes.forEach(note => {
        console.log(`   - ${note.note_type}: ${note.note_text.substring(0, 60)}...`);
      });
    }
    
    // Check result
    const resultChapter = selected.chapter;
    const passed = resultChapter === product.expectedChapter;
    
    console.log(`\n🎯 Result: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!passed) {
      console.log(`   Expected Chapter ${product.expectedChapter}, got Chapter ${resultChapter}`);
    }
    
    return {
      passed,
      expected: product.expectedChapter,
      actual: resultChapter,
      code: selected.code,
      description: selected.description
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { passed: false, reason: error.message };
  }
}

// Run all tests
console.log('🚀 Legal Classification Test Suite');
console.log(`📅 Date: ${new Date().toISOString()}`);
console.log(`🧪 Products to test: ${testProducts.length}`);

const results = [];
let passed = 0;
let failed = 0;

testProducts.forEach(product => {
  const result = testProduct(product);
  results.push({ product: product.name, ...result });
  if (result.passed) passed++;
  else failed++;
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`\n✅ Passed: ${passed}/${testProducts.length}`);
console.log(`❌ Failed: ${failed}/${testProducts.length}`);
console.log(`📈 Success Rate: ${((passed/testProducts.length) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`   - ${r.product}: ${r.reason || `Expected Ch${r.expected}, got Ch${r.actual}`}`);
  });
}

console.log('\n📋 Detailed Results:');
console.log('-'.repeat(80));
console.log('Product                  | Expected | Actual | Code       | Status');
console.log('-'.repeat(80));
results.forEach(r => {
  const status = r.passed ? '✅' : '❌';
  console.log(
    `${r.product.padEnd(23)} | ` +
    `Ch${(r.expected || '--').padEnd(6)} | ` +
    `Ch${(r.actual || '--').padEnd(5)} | ` +
    `${(r.code || 'N/A').padEnd(10)} | ` +
    status
  );
});

db.close();