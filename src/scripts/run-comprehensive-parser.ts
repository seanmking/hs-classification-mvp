import { SARSTariffComprehensiveParser } from './parse-sars-comprehensive'

async function main() {
  console.log('🚀 Starting comprehensive SARS PDF parsing...')
  
  try {
    const parser = new SARSTariffComprehensiveParser()
    const result = await parser.parsePDF('/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf')
    
    console.log('\n📊 Final Results:')
    console.log(`Sections: ${result.sections.length}`)
    console.log(`Chapters: ${result.chapters.length}`)
    console.log(`Notes: ${result.notes.length}`)
    console.log(`Tariff Codes: ${result.tariffCodes.length}`)
    
    // If no notes found, let's check the raw text
    if (result.notes.length === 0) {
      console.log('\n⚠️ No notes found. Check sars-raw-text.txt for manual analysis.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main }