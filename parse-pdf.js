const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = '/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf';

console.log('📄 Parsing SARS PDF...');

async function parsePDF() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log(`📖 Total pages: ${data.numpages}`);
    console.log(`📝 Total characters: ${data.text.length}`);
    
    // Save raw text
    fs.writeFileSync('sars-raw-text.txt', data.text);
    console.log('💾 Saved raw text to sars-raw-text.txt');
    
    // Analyze for notes
    const lines = data.text.split('\n');
    let notePatterns = {
      'NOTES:': 0,
      'Note \\d+': 0,
      'Chapter \\d+ covers': 0,
      'does not cover': 0,
      'This Chapter': 0,
      'This Section': 0
    };
    
    for (const line of lines) {
      for (const [pattern, count] of Object.entries(notePatterns)) {
        if (new RegExp(pattern, 'i').test(line)) {
          notePatterns[pattern]++;
        }
      }
    }
    
    console.log('\n🔍 Pattern analysis:');
    for (const [pattern, count] of Object.entries(notePatterns)) {
      console.log(`  ${pattern}: ${count} occurrences`);
    }
    
    // Find first few examples
    console.log('\n📋 First few note examples:');
    let examples = 0;
    for (let i = 0; i < lines.length && examples < 5; i++) {
      if (/NOTES?:|Note \d+|This (Chapter|Section)/i.test(lines[i])) {
        console.log(`\nLine ${i}: ${lines[i]}`);
        if (i + 1 < lines.length) console.log(`Line ${i+1}: ${lines[i+1]}`);
        if (i + 2 < lines.length) console.log(`Line ${i+2}: ${lines[i+2]}`);
        examples++;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

parsePDF();