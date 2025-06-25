import fs from 'fs'
import pdf from 'pdf-parse'

const filePath = '/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf'
console.log(`📄 Parsing PDF: ${filePath}`)

const dataBuffer = fs.readFileSync(filePath)
const data = await pdf(dataBuffer)

console.log(`📖 Total pages: ${data.numpages}`)
console.log(`📝 Total characters: ${data.text.length}`)

// Save raw text
fs.writeFileSync('sars-raw-text.txt', data.text)
console.log('💾 Saved raw text to sars-raw-text.txt')

// Look for notes
const lines = data.text.split('\n')
let noteCount = 0
let noteExamples = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim()
  
  // Look for various note patterns
  if (/^NOTES?:/i.test(line)) {
    noteCount++
    noteExamples.push({ line: i, text: line, context: lines.slice(i, i+5).join('\n') })
  }
  
  if (/^Note[s]?\s+\d+/i.test(line)) {
    noteCount++
    noteExamples.push({ line: i, text: line, context: lines.slice(i, i+3).join('\n') })
  }
  
  if (/^\d+\.\s+[A-Z]/.test(line) && i > 0) {
    const prevLine = lines[i-1].trim()
    if (prevLine.includes('NOTE') || prevLine.includes('Note')) {
      noteCount++
      noteExamples.push({ line: i, text: line, context: lines.slice(i-1, i+3).join('\n') })
    }
  }
}

console.log(`\n🔍 Found ${noteCount} potential notes`)
console.log('\n📋 First 5 examples:')
noteExamples.slice(0, 5).forEach((ex, idx) => {
  console.log(`\nExample ${idx + 1} (line ${ex.line}):`)
  console.log(ex.context)
  console.log('---')
})