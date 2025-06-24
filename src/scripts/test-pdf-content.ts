import fs from 'fs'
import pdf from 'pdf-parse'

async function testPDFContent() {
  const filePath = '/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf'
  const dataBuffer = fs.readFileSync(filePath)
  const data = await pdf(dataBuffer)
  
  console.log('📄 PDF Analysis:')
  console.log(`Total pages: ${data.numpages}`)
  console.log(`\n📝 Sample content from first 5000 characters:\n`)
  console.log(data.text.substring(0, 5000))
  
  // Look for specific patterns
  const lines = data.text.split('\n').map(line => line.trim()).filter(line => line)
  
  console.log('\n🔍 Pattern Detection:')
  
  // Look for section patterns
  const sectionLines = lines.filter(line => 
    line.includes('SECTION') || 
    line.includes('Section') ||
    /^[IVX]+\s+[-–]/.test(line)
  ).slice(0, 10)
  console.log('\nSection patterns found:')
  sectionLines.forEach(line => console.log(`  "${line}"`))
  
  // Look for note patterns
  const noteLines = lines.filter(line => 
    line.includes('Note') || 
    line.includes('NOTE') ||
    /^\d+\.\s+/.test(line)
  ).slice(0, 10)
  console.log('\nNote patterns found:')
  noteLines.forEach(line => console.log(`  "${line}"`))
  
  // Look for tariff code patterns
  const tariffLines = lines.filter(line => 
    /^\d{4}\.\d{2}\.\d{2}/.test(line) ||
    /^\d{4}\s+\d/.test(line) ||
    /^\d{2}\.\d{2}/.test(line)
  ).slice(0, 10)
  console.log('\nTariff code patterns found:')
  tariffLines.forEach(line => console.log(`  "${line}"`))
}

testPDFContent().catch(console.error)