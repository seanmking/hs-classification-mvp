import fs from 'fs'
import path from 'path'

const pdfPath = '/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf'

// Check if file exists
if (fs.existsSync(pdfPath)) {
  console.log('✅ PDF file exists')
  const stats = fs.statSync(pdfPath)
  console.log(`📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
} else {
  console.log('❌ PDF file not found')
}

// Try dynamic import of pdf-parse
try {
  const pdfParse = await import('pdf-parse')
  console.log('✅ pdf-parse loaded')
  
  const dataBuffer = fs.readFileSync(pdfPath)
  console.log('✅ PDF read into buffer')
  
  const data = await pdfParse.default(dataBuffer)
  console.log(`✅ PDF parsed: ${data.numpages} pages`)
  
  // Save first 10000 chars
  fs.writeFileSync('sars-sample.txt', data.text.substring(0, 10000))
  console.log('💾 Saved sample text')
  
} catch (error) {
  console.error('❌ Error:', error)
}