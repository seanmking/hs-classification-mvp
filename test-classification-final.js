const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

// Test products with specific search terms
const testProducts = [
  {
    name: "iPhone 15 Pro",
    description: "Smartphone with cellular network capability",
    searchTerms: ["telephone", "cellular", "smartphone"],
    expectedChapter: "85"
  },
  {
    name: "Fresh Bananas",
    description: "Fresh bananas for human consumption",
    searchTerms: ["banana", "fresh"],
    expectedChapter: "08"
  },
  {
    name: "Cotton T-Shirt",
    description: "Men's cotton t-shirt, knitted",
    searchTerms: ["shirt", "cotton", "knitted", "garment"],
    expectedChapter: "61"
  },
  {
    name: "Leather Handbag",
    description: "Women's handbag of leather",
    searchTerms: ["handbag", "leather", "bag"],
    expectedChapter: "42"
  },
  {
    name: "Plastic Water Bottle",
    description: "Empty plastic bottle for beverages",
    searchTerms: ["bottle", "plastic", "container"],
    expectedChapter: "39"
  },
  {
    name: "Gold Necklace",
    description: "Gold jewelry for personal adornment",
    searchTerms: ["gold", "jewellery", "precious"],
    expectedChapter: "71"
  },
  {
    name: "Wooden Dining Table",
    description: "Wooden furniture for dining",
    searchTerms: ["table", "furniture", "wood"],
    expectedChapter: "94"
  },
  {
    name: "Car Tires",
    description: "Pneumatic tires of rubber",
    searchTerms: ["tyre", "tire", "rubber", "pneumatic"],
    expectedChapter: "40"
  },
  {
    name: "Frozen Beef",
    description: "Frozen boneless beef meat",
    searchTerms: ["beef", "meat", "frozen", "bovine"],
    expectedChapter: "02"
  },
  {
    name: "Steel Screws",
    description: "Screws of iron or steel",
    searchTerms: ["screw", "steel", "iron"],
    expectedChapter: "73"
  }
];

// Find matching codes for a product
function findBestMatch(product) {
  // Try different search strategies
  let matches = [];
  
  // Strategy 1: Search each term individually and combine results
  for (const term of product.searchTerms) {
    const query = `
      SELECT DISTINCT 
        code,
        description,
        level,
        SUBSTR(code, 1, 2) as chapter
      FROM hs_codes_enhanced
      WHERE LOWER(description) LIKE ?
      AND level IN ('heading', 'subheading', 'tariff')
      ORDER BY 
        CASE 
          WHEN level = 'heading' THEN LENGTH(code)
          WHEN level = 'subheading' THEN LENGTH(code) + 10
          WHEN level = 'tariff' THEN LENGTH(code) + 20
        END,
        code
      LIMIT 20
    `;
    
    const results = db.prepare(query).all(`%${term.toLowerCase()}%`);
    matches = matches.concat(results);
  }
  
  // Remove duplicates and score matches
  const uniqueMatches = {};
  matches.forEach(match => {
    if (!uniqueMatches[match.code]) {
      uniqueMatches[match.code] = {
        ...match,
        score: 0,
        matchedTerms: []
      };
    }
    
    // Score based on how many search terms match
    product.searchTerms.forEach(term => {
      if (match.description.toLowerCase().includes(term.toLowerCase())) {
        uniqueMatches[match.code].score += 1;
        uniqueMatches[match.code].matchedTerms.push(term);
      }
    });
  });
  
  // Convert to array and sort by score
  const scored = Object.values(uniqueMatches)
    .filter(m => m.score > 0)
    .sort((a, b) => {
      // First by score (descending)
      if (b.score !== a.score) return b.score - a.score;
      // Then by level (heading < subheading < tariff)
      const levelOrder = { heading: 1, subheading: 2, tariff: 3 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  
  return scored;
}

// Get legal notes for a code
function getLegalNotes(code) {
  const chapter = code.substring(0, 2);
  const query = `
    SELECT 
      note_type,
      note_text,
      note_number
    FROM legal_notes
    WHERE (hs_code = ? OR hs_code = ? OR hs_code LIKE ?)
    ORDER BY priority DESC
    LIMIT 5
  `;
  
  return db.prepare(query).all(chapter, code, code + '%');
}

// Check if there are exclusion rules
function checkExclusions(code) {
  const query = `
    SELECT COUNT(*) as count
    FROM legal_notes
    WHERE note_type = 'exclusion'
    AND (hs_code = ? OR hs_code = ?)
  `;
  
  const chapter = code.substring(0, 2);
  const result = db.prepare(query).get(chapter, code);
  return result.count > 0;
}

// Test a single product
function testProduct(product) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${product.name}`);
  console.log(`📝 Description: ${product.description}`);
  console.log(`🔍 Search Terms: ${product.searchTerms.join(', ')}`);
  console.log(`🎯 Expected Chapter: ${product.expectedChapter}`);
  console.log('-'.repeat(80));
  
  try {
    // Find matches
    const matches = findBestMatch(product);
    
    if (matches.length === 0) {
      console.log('❌ No matching codes found');
      return {
        product: product.name,
        passed: false,
        expected: product.expectedChapter,
        actual: '--',
        reason: 'No matches found'
      };
    }
    
    console.log(`\n📊 Top matches found:`);
    matches.slice(0, 5).forEach((match, idx) => {
      console.log(`   ${idx + 1}. ${match.code} (${match.level}) - Score: ${match.score}`);
      console.log(`      ${match.description.substring(0, 60)}...`);
      console.log(`      Matched terms: ${match.matchedTerms.join(', ')}`);
    });
    
    // Apply GRI logic - select best match
    const selected = matches[0];
    
    console.log(`\n✅ Selected Classification:`);
    console.log(`   Code: ${selected.code}`);
    console.log(`   Chapter: ${selected.chapter}`);
    console.log(`   Level: ${selected.level}`);
    console.log(`   Description: ${selected.description}`);
    
    // Check for legal notes
    const notes = getLegalNotes(selected.code);
    if (notes.length > 0) {
      console.log(`\n📜 Applicable Legal Notes:`);
      notes.slice(0, 3).forEach(note => {
        console.log(`   - ${note.note_type}: ${note.note_text.substring(0, 60)}...`);
      });
    }
    
    // Check for exclusions
    const hasExclusions = checkExclusions(selected.code);
    if (hasExclusions) {
      console.log(`\n⚠️ This code has exclusion rules that should be checked`);
    }
    
    // Verify result
    const passed = selected.chapter === product.expectedChapter;
    console.log(`\n🎯 Test Result: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!passed) {
      console.log(`   Expected Chapter ${product.expectedChapter}, got Chapter ${selected.chapter}`);
    }
    
    return {
      product: product.name,
      passed,
      expected: product.expectedChapter,
      actual: selected.chapter,
      code: selected.code,
      description: selected.description.substring(0, 50) + '...'
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      product: product.name,
      passed: false,
      expected: product.expectedChapter,
      actual: '--',
      reason: error.message
    };
  }
}

// Run all tests
console.log('🚀 Legal Classification Test Suite');
console.log(`📅 Date: ${new Date().toISOString()}`);
console.log(`🧪 Products to test: ${testProducts.length}`);
console.log('\nNote: This test verifies that the classification logic can find appropriate');
console.log('HS codes based on product descriptions and apply legal compliance checks.');

const results = [];

for (const product of testProducts) {
  const result = testProduct(product);
  results.push(result);
}

// Summary
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`\n✅ Passed: ${passed}/${testProducts.length}`);
console.log(`❌ Failed: ${failed}/${testProducts.length}`);
console.log(`📈 Success Rate: ${((passed/testProducts.length) * 100).toFixed(1)}%`);

// Detailed results table
console.log('\n📋 Detailed Results:');
console.log('-'.repeat(100));
console.log('Product               | Expected | Actual | Code     | Result | Notes');
console.log('-'.repeat(100));

results.forEach(r => {
  const status = r.passed ? '✅ PASS' : '❌ FAIL';
  const notes = r.reason || (r.passed ? 'Correct classification' : 'Wrong chapter');
  console.log(
    `${r.product.padEnd(20)} | ` +
    `Ch ${r.expected.padEnd(6)} | ` +
    `Ch ${r.actual.padEnd(5)} | ` +
    `${(r.code || 'N/A').padEnd(8)} | ` +
    `${status} | ` +
    notes
  );
});

// Classification accuracy analysis
console.log('\n📈 Classification Analysis:');
const correctChapters = results.filter(r => r.passed);
const wrongChapters = results.filter(r => !r.passed && r.actual !== '--');
const noMatches = results.filter(r => r.actual === '--');

console.log(`   Correct classifications: ${correctChapters.length}`);
console.log(`   Wrong chapter selected: ${wrongChapters.length}`);
console.log(`   No matches found: ${noMatches.length}`);

if (wrongChapters.length > 0) {
  console.log('\n   Products classified to wrong chapters:');
  wrongChapters.forEach(r => {
    console.log(`   - ${r.product}: Expected Ch${r.expected}, got Ch${r.actual}`);
  });
}

db.close();

console.log('\n💡 Note: The test results show how well the classification system can match');
console.log('   products to HS codes based on their descriptions. Some failures may be due');
console.log('   to missing specific product terms in the SARS tariff descriptions or the');
console.log('   need for more sophisticated matching logic.');