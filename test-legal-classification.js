const Database = require('better-sqlite3');
const path = require('path');
const { WCOCompliantGRIEngine } = require('./src/lib/griEngine');

const db = new Database(path.join(__dirname, 'database.db'));

// Test products covering various categories
const testProducts = [
  {
    name: "iPhone 15 Pro",
    description: "Smartphone with cellular network capability, 6.1 inch display, camera, GPS",
    category: "Electronics",
    expectedChapter: "85"
  },
  {
    name: "Fresh Bananas",
    description: "Fresh bananas, Cavendish variety, for human consumption",
    category: "Food - Fruit",
    expectedChapter: "08"
  },
  {
    name: "Cotton T-Shirt",
    description: "Men's cotton t-shirt, 100% cotton, knitted, not embroidered",
    category: "Textiles",
    expectedChapter: "61"
  },
  {
    name: "Leather Handbag",
    description: "Women's handbag, outer surface of leather, with shoulder strap",
    category: "Leather Goods",
    expectedChapter: "42"
  },
  {
    name: "Plastic Water Bottle",
    description: "Empty plastic bottle, 500ml capacity, made of PET plastic, with screw cap",
    category: "Plastics",
    expectedChapter: "39"
  },
  {
    name: "Gold Necklace",
    description: "Gold necklace, 18 karat, for personal adornment, 20 grams",
    category: "Precious Metals",
    expectedChapter: "71"
  },
  {
    name: "Wooden Dining Table",
    description: "Dining table made of solid oak wood, seats 6 people, for household use",
    category: "Furniture",
    expectedChapter: "94"
  },
  {
    name: "Car Tires",
    description: "New pneumatic tires, of rubber, for passenger vehicles, radial",
    category: "Rubber Products",
    expectedChapter: "40"
  },
  {
    name: "Frozen Beef",
    description: "Frozen boneless beef cuts, from cattle, for human consumption",
    category: "Food - Meat",
    expectedChapter: "02"
  },
  {
    name: "Steel Screws",
    description: "Steel screws, threaded, 5mm diameter, 20mm length, zinc plated",
    category: "Base Metals",
    expectedChapter: "73"
  }
];

async function runClassificationTest(product) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${product.name}`);
  console.log(`📝 Description: ${product.description}`);
  console.log(`📂 Category: ${product.category}`);
  console.log(`🎯 Expected Chapter: ${product.expectedChapter}`);
  console.log('-'.repeat(80));

  const engine = new WCOCompliantGRIEngine(db);
  const context = {
    productName: product.name,
    description: product.description,
    material: extractMaterial(product.description),
    usage: extractUsage(product.description),
    characteristics: extractCharacteristics(product.description)
  };

  try {
    // Start classification
    console.log('\n📋 Starting GRI Classification Process...\n');
    
    // Rule 1: Classification by terms
    console.log('🔹 GRI Rule 1: Classification by specific terms of headings and legal notes');
    const rule1Result = await engine.applyRule1(context);
    
    if (rule1Result.candidates.length > 0) {
      console.log(`   ✓ Found ${rule1Result.candidates.length} potential matches:`);
      rule1Result.candidates.slice(0, 5).forEach(candidate => {
        console.log(`     - ${candidate.code}: ${candidate.description.substring(0, 60)}...`);
      });
      
      // Check for exclusions
      const exclusions = await checkExclusions(rule1Result.candidates[0].code);
      if (exclusions.length > 0) {
        console.log(`   ⚠️ Exclusions found:`);
        exclusions.forEach(exc => {
          console.log(`     - ${exc.note_text.substring(0, 80)}...`);
        });
      }
    } else {
      console.log('   ✗ No specific matches found in Rule 1');
    }

    // Rule 2: Essential character (if needed)
    if (rule1Result.candidates.length === 0 || rule1Result.candidates.length > 1) {
      console.log('\n🔹 GRI Rule 2: Classification by essential character');
      const rule2Result = await engine.applyRule2(context);
      if (rule2Result.candidate) {
        console.log(`   ✓ Essential character determined: ${rule2Result.reasoning}`);
        console.log(`   ✓ Selected: ${rule2Result.candidate.code} - ${rule2Result.candidate.description.substring(0, 50)}...`);
      }
    }

    // Rule 3: Most specific description
    console.log('\n🔹 GRI Rule 3: Classification by most specific description');
    const rule3Result = await engine.applyRule3(context);
    if (rule3Result.selected) {
      console.log(`   ✓ Most specific: ${rule3Result.selected.code} - ${rule3Result.selected.description.substring(0, 50)}...`);
    }

    // Get final classification
    const finalResult = await engine.classify(context);
    
    console.log('\n📊 Classification Result:');
    console.log(`   Code: ${finalResult.code}`);
    console.log(`   Description: ${finalResult.description}`);
    console.log(`   Level: ${finalResult.level}`);
    console.log(`   GRI Rule Applied: ${finalResult.griRule}`);
    console.log(`   Reasoning: ${finalResult.reasoning}`);
    
    // Verify chapter match
    const resultChapter = finalResult.code.substring(0, 2);
    const isCorrect = resultChapter === product.expectedChapter;
    
    console.log(`\n✅ Test Result: ${isCorrect ? 'PASSED' : 'FAILED'}`);
    if (!isCorrect) {
      console.log(`   Expected Chapter ${product.expectedChapter}, got Chapter ${resultChapter}`);
    }

    // Check legal notes for the classification
    const legalNotes = await getLegalNotes(finalResult.code);
    if (legalNotes.length > 0) {
      console.log(`\n📜 Applicable Legal Notes (${legalNotes.length}):`);
      legalNotes.slice(0, 3).forEach(note => {
        console.log(`   - ${note.note_type}: ${note.note_text.substring(0, 70)}...`);
      });
    }

    return {
      product: product.name,
      expected: product.expectedChapter,
      actual: resultChapter,
      passed: isCorrect,
      classification: finalResult
    };

  } catch (error) {
    console.error(`\n❌ Error during classification: ${error.message}`);
    return {
      product: product.name,
      expected: product.expectedChapter,
      actual: 'ERROR',
      passed: false,
      error: error.message
    };
  }
}

// Helper functions
function extractMaterial(description) {
  const materials = ['cotton', 'leather', 'plastic', 'gold', 'wood', 'steel', 'rubber', 'oak'];
  const found = materials.filter(m => description.toLowerCase().includes(m));
  return found.join(', ') || 'unknown';
}

function extractUsage(description) {
  const usages = ['personal', 'household', 'human consumption', 'adornment'];
  const found = usages.filter(u => description.toLowerCase().includes(u));
  return found.join(', ') || 'general';
}

function extractCharacteristics(description) {
  const chars = [];
  if (description.includes('fresh')) chars.push('fresh');
  if (description.includes('frozen')) chars.push('frozen');
  if (description.includes('new')) chars.push('new');
  if (description.includes('knitted')) chars.push('knitted');
  return chars;
}

async function checkExclusions(hsCode) {
  const query = `
    SELECT * FROM exclusion_matrix 
    WHERE excluded_code LIKE ? || '%'
    ORDER BY priority DESC
    LIMIT 5
  `;
  return db.prepare(query).all(hsCode);
}

async function getLegalNotes(hsCode) {
  const query = `
    SELECT * FROM legal_notes 
    WHERE hs_code = ? OR hs_code = ? OR hs_code = ?
    ORDER BY priority DESC
  `;
  const chapter = hsCode.substring(0, 2);
  const heading = hsCode.substring(0, 4);
  return db.prepare(query).all(chapter, heading, hsCode);
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Legal Classification Test Suite');
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log(`🧪 Total Tests: ${testProducts.length}`);
  
  const results = [];
  
  for (const product of testProducts) {
    const result = await runClassificationTest(product);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n✅ Passed: ${passed}/${testProducts.length}`);
  console.log(`❌ Failed: ${failed}/${testProducts.length}`);
  console.log(`📈 Success Rate: ${((passed/testProducts.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.product}: Expected Ch${r.expected}, Got Ch${r.actual}`);
      if (r.error) console.log(`     Error: ${r.error}`);
    });
  }
  
  // Classification details
  console.log('\n📋 Classification Details:');
  results.forEach(r => {
    if (r.classification) {
      console.log(`\n${r.product}:`);
      console.log(`   Code: ${r.classification.code}`);
      console.log(`   GRI Rule: ${r.classification.griRule}`);
      console.log(`   Level: ${r.classification.level}`);
    }
  });
  
  db.close();
}

// Run the tests
runAllTests().catch(console.error);