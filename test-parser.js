const { SARSTariffComprehensiveParser } = require('./src/scripts/parse-sars-comprehensive.ts');

async function testParser() {
  const parser = new SARSTariffComprehensiveParser();
  const result = await parser.parsePDF('/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf');
  console.log('Parse complete:', result);
}

testParser().catch(console.error);