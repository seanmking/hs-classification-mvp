const fs = require('fs');
const pdf = require('pdf-parse');

class CompleteSARSParserV2 {
  constructor() {
    this.sections = [];
    this.chapters = [];
    this.notes = [];
    this.tariffCodes = [];
    this.currentSection = null;
    this.currentChapter = null;
    this.lines = [];
    this.rawText = '';
  }

  async parsePDF(filePath) {
    console.log(`📄 Complete SARS Tariff Book Parsing V2`);
    console.log(`📍 Source: ${filePath}`);
    
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    console.log(`📖 Total pages: ${data.numpages}`);
    console.log(`📝 Total characters: ${data.text.length}`);
    
    // Save for debugging
    this.rawText = data.text;
    
    // Split into lines
    this.lines = data.text.split('\n');
    
    // Multi-pass parsing
    console.log('\n🔄 Pass 1: Extracting sections and chapters...');
    this.extractStructure();
    
    console.log('\n🔄 Pass 2: Extracting ALL legal notes...');
    this.extractAllLegalNotes();
    
    console.log('\n🔄 Pass 3: Extracting ALL tariff codes...');
    this.extractAllTariffCodes();
    
    console.log(`\n📊 Complete Parsing Results:`);
    console.log(`  ✅ ${this.sections.length} sections`);
    console.log(`  ✅ ${this.chapters.length} chapters`);
    console.log(`  ${this.notes.length > 0 ? '✅' : '❌'} ${this.notes.length} legal notes`);
    console.log(`  ${this.tariffCodes.length > 0 ? '✅' : '❌'} ${this.tariffCodes.length} tariff codes`);
    
    // Save detailed results
    this.saveResults();
    
    return {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes
    };
  }

  extractStructure() {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      if (this.isSectionHeader(line)) {
        this.parseSection(i);
      }
      
      if (this.isChapterHeader(line)) {
        this.parseChapter(i);
      }
    }
    
    console.log(`  Found ${this.sections.length} sections and ${this.chapters.length} chapters`);
  }

  extractAllLegalNotes() {
    console.log('  Scanning for all note patterns...');
    
    let noteCount = 0;
    
    // Same note extraction logic as before
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Check for note markers
      if (/^(NOTES?:|ADDITIONAL NOTES?:|SUBHEADING NOTES?:)/i.test(line)) {
        this.extractNotesFromMarker(i);
        noteCount++;
      }
    }
    
    console.log(`  Found ${noteCount} note sections, extracted ${this.notes.length} individual notes`);
  }

  extractAllTariffCodes() {
    console.log('  Extracting ALL tariff codes...');
    
    let currentHeading = null;
    let currentSubheading = null;
    let inTariffSection = false;
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Skip headers and notes
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) {
        inTariffSection = false;
        continue;
      }
      
      if (line.includes('Heading /') || line.includes('Statistical')) {
        inTariffSection = true;
        continue;
      }
      
      // Pattern 1: Heading (XX.XX)
      if (/^\d{2}\.\d{2}$/.test(line)) {
        const code = line.replace('.', '');
        const description = this.getNextNonEmptyLine(i + 1);
        
        if (description && !this.isTableHeader(description)) {
          currentHeading = code;
          this.tariffCodes.push({
            code: code,
            cd: '',
            description: this.cleanText(description),
            unit: '',
            generalRate: '',
            level: 'heading'
          });
        }
      }
      
      // Pattern 2: Subheading (XXXX.X or XXXX.XX)
      else if (/^\d{4}\.\d{1,2}$/.test(line)) {
        const code = line.replace(/\./g, '').padEnd(6, '0');
        currentSubheading = code;
        
        // Look for description after dash pattern
        let j = i + 1;
        let foundDash = false;
        let description = '';
        
        while (j < this.lines.length && j < i + 10) {
          const nextLine = this.lines[j].trim();
          
          if (nextLine === '-' || nextLine === '- -') {
            foundDash = true;
            j++;
            continue;
          }
          
          if (foundDash && nextLine && !this.isTableHeader(nextLine)) {
            description = nextLine;
            break;
          }
          
          j++;
        }
        
        if (description) {
          this.tariffCodes.push({
            code: code,
            cd: '',
            description: this.cleanText(description),
            unit: '',
            generalRate: '',
            level: 'subheading'
          });
        }
      }
      
      // Pattern 3: Full 8-digit tariff (XXXX.XX.XX)
      else if (/^\d{4}\.\d{2}\.\d{2}$/.test(line)) {
        const code = line.replace(/\./g, '');
        
        // Get CD, description, unit, and rate from next lines
        let cd = '';
        let description = '';
        let unit = '';
        let generalRate = '';
        
        // CD is usually on next line
        if (i + 1 < this.lines.length && /^\d$/.test(this.lines[i + 1].trim())) {
          cd = this.lines[i + 1].trim();
        }
        
        // Look for description after dash pattern
        let j = i + 2;
        while (j < this.lines.length && j < i + 15) {
          const nextLine = this.lines[j].trim();
          
          if (nextLine.includes('- - -') || nextLine === '- -' || nextLine === '-') {
            // Description should be after dashes
            if (j + 1 < this.lines.length) {
              description = this.lines[j + 1].trim();
              
              // Unit might be next
              if (j + 2 < this.lines.length) {
                const possibleUnit = this.lines[j + 2].trim();
                if (this.isUnit(possibleUnit)) {
                  unit = possibleUnit;
                  
                  // Rate might be next
                  if (j + 3 < this.lines.length) {
                    const possibleRate = this.lines[j + 3].trim();
                    if (this.isRate(possibleRate)) {
                      generalRate = possibleRate;
                    }
                  }
                }
              }
            }
            break;
          }
          j++;
        }
        
        if (description || code) {
          this.tariffCodes.push({
            code: code,
            cd: cd,
            description: this.cleanText(description),
            unit: unit,
            generalRate: generalRate.toLowerCase(),
            level: 'tariff'
          });
        }
      }
    }
    
    console.log(`  Extracted ${this.tariffCodes.length} tariff codes`);
    
    // Count by level
    const levels = this.tariffCodes.reduce((acc, code) => {
      acc[code.level] = (acc[code.level] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`  By level:`, levels);
  }

  getNextNonEmptyLine(startIndex) {
    for (let i = startIndex; i < this.lines.length && i < startIndex + 5; i++) {
      const line = this.lines[i].trim();
      if (line && !this.isTableHeader(line) && !line.match(/^[\d.-]+$/)) {
        return line;
      }
    }
    return '';
  }

  isUnit(text) {
    return /^(u|kg|l|m²|m³|2u|ct|GVM|ml|g|cm³|pa|dz|GIL|L\/al|%|1000)$/.test(text);
  }

  isRate(text) {
    return /^(free|Free|\d+%?|\d+c\/\w+|various)$/i.test(text);
  }

  extractNotesFromMarker(markerLine) {
    // Same implementation as before
    const context = this.getContext(markerLine);
    if (!context) return;
    
    const markerLineText = this.lines[markerLine].trim();
    let i = markerLine;
    let noteNumber = 0;
    
    // Check if note number is on the same line
    const inlineNumberMatch = markerLineText.match(/^(?:NOTES?:|ADDITIONAL NOTES?:|SUBHEADING NOTES?:)(\d+)[.)]/i);
    if (inlineNumberMatch) {
      noteNumber = parseInt(inlineNumberMatch[1]);
      let noteText = markerLineText.substring(markerLineText.indexOf(noteNumber.toString()) + noteNumber.toString().length + 1).trim();
      
      // Continue collecting text
      let j = i + 1;
      while (j < this.lines.length) {
        const textLine = this.lines[j].trim();
        if (/^(\d+)[.)]\s*/.test(textLine)) break;
        if (this.isSectionHeader(textLine) || this.isChapterHeader(textLine)) break;
        if (this.isTableStart(textLine)) break;
        
        if (textLine.length > 0) {
          noteText += ' ' + textLine;
        }
        j++;
      }
      
      if (noteText) {
        this.notes.push({
          hsCode: context.code,
          noteType: this.determineNoteType(noteText),
          noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
          noteText: this.cleanText(noteText),
          ...(context.type === 'chapter' && { chapterCode: context.code }),
          ...(context.type === 'section' && { sectionCode: context.code })
        });
      }
      
      i = j;
    } else {
      i = markerLine + 1;
    }
    
    // Continue looking for more numbered notes
    while (i < this.lines.length) {
      const line = this.lines[i].trim();
      
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) break;
      if (this.isTableStart(line)) break;
      
      const numberMatch = line.match(/^(\d+)[.)]\s*/);
      if (numberMatch) {
        noteNumber = parseInt(numberMatch[1]);
        let noteText = line.substring(numberMatch[0].length).trim();
        let j = i + 1;
        
        while (j < this.lines.length) {
          const textLine = this.lines[j].trim();
          if (/^(\d+)[.)]\s*/.test(textLine)) break;
          if (this.isSectionHeader(textLine) || this.isChapterHeader(textLine)) break;
          if (this.isTableStart(textLine)) break;
          
          if (textLine.length > 0) {
            noteText += ' ' + textLine;
          }
          j++;
        }
        
        if (noteText) {
          this.notes.push({
            hsCode: context.code,
            noteType: this.determineNoteType(noteText),
            noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
            noteText: this.cleanText(noteText),
            ...(context.type === 'chapter' && { chapterCode: context.code }),
            ...(context.type === 'section' && { sectionCode: context.code })
          });
        }
        
        i = j - 1;
      }
      
      i++;
    }
  }

  getContext(lineNumber) {
    for (let i = lineNumber; i >= 0; i--) {
      const line = this.lines[i].trim();
      
      if (this.isChapterHeader(line)) {
        const match = line.match(/CHAPTER\s+(\d+)/);
        if (match) {
          return { type: 'chapter', code: match[1].padStart(2, '0') };
        }
      }
      
      if (this.isSectionHeader(line)) {
        const match = line.match(/SECTION\s+([IVX]+)/);
        if (match) {
          return { type: 'section', code: `S${this.romanToNumber(match[1])}` };
        }
      }
    }
    
    return null;
  }

  parseSection(lineNumber) {
    const line = this.lines[lineNumber].trim();
    const match = line.match(/SECTION\s+([IVX]+)/);
    
    if (match) {
      const romanNumeral = match[1];
      let description = '';
      
      let i = lineNumber + 1;
      while (i < this.lines.length) {
        const descLine = this.lines[i].trim();
        if (this.isChapterHeader(descLine) || descLine.includes('NOTE')) break;
        if (descLine.length > 2 && !descLine.includes('Date:')) {
          description += (description ? ' ' : '') + descLine;
        }
        i++;
      }
      
      const section = {
        sectionCode: `S${this.romanToNumber(romanNumeral)}`,
        romanNumeral,
        description: this.cleanText(description),
        chapterRange: { from: 0, to: 0 }
      };
      
      this.currentSection = section;
      this.sections.push(section);
    }
  }

  parseChapter(lineNumber) {
    const line = this.lines[lineNumber].trim();
    const match = line.match(/CHAPTER\s+(\d+)/);
    
    if (match) {
      const chapterCode = match[1].padStart(2, '0');
      
      if (chapterCode === '77') return;
      
      let description = '';
      let i = lineNumber + 1;
      while (i < this.lines.length) {
        const descLine = this.lines[i].trim();
        if (descLine.includes('NOTE') || this.isTableStart(descLine)) break;
        if (descLine.length > 2 && !descLine.includes('Date:')) {
          description += (description ? ' ' : '') + descLine;
        }
        i++;
      }
      
      const chapter = {
        chapterCode,
        description: this.cleanText(description),
        sectionCode: this.currentSection?.sectionCode || 'S0'
      };
      
      this.currentChapter = chapter;
      this.chapters.push(chapter);
      
      if (this.currentSection) {
        const num = parseInt(chapterCode);
        if (this.currentSection.chapterRange.from === 0) {
          this.currentSection.chapterRange.from = num;
        }
        this.currentSection.chapterRange.to = num;
      }
    }
  }

  isSectionHeader(line) {
    return /^SECTION\s+[IVX]+\s*$/i.test(line);
  }

  isChapterHeader(line) {
    return /^CHAPTER\s+\d+\s*$/i.test(line);
  }

  isTableStart(line) {
    return line.includes('Heading /') || 
           line.includes('Statistical') ||
           line.includes('Rate of Duty') ||
           line.includes('Subheading');
  }

  isTableHeader(line) {
    const headers = ['heading', 'subheading', 'statistical', 'rate', 'duty', 'general', 'eu', 'CD', 'Article Description'];
    return headers.some(h => line.toLowerCase().includes(h.toLowerCase()));
  }

  romanToNumber(roman) {
    const values = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100
    };
    
    let result = 0;
    for (let i = 0; i < roman.length; i++) {
      const current = values[roman[i]];
      const next = values[roman[i + 1]];
      
      if (next && current < next) {
        result -= current;
      } else {
        result += current;
      }
    }
    
    return result;
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/["""]/g, '"')
      .replace(/[''']/g, "'")
      .replace(/\s*-\s*$/g, '')
      .replace(/^-+\s*/g, '')
      .replace(/Date:\s*\d{4}-\d{2}-\d{2}/g, '')
      .replace(/SCHEDULE\s+\d+.*/g, '')
      .trim();
  }

  determineNoteType(text) {
    const lower = text.toLowerCase();
    
    if (lower.includes('does not cover') || lower.includes('does not include') || 
        lower.includes('excluding') || lower.includes('except')) {
      return 'exclusion';
    }
    
    if (lower.includes('includes') || lower.includes('covers') || 
        lower.includes('comprising')) {
      return 'inclusion';
    }
    
    if (lower.includes('means') || lower.includes('expression') || 
        lower.includes('defined as')) {
      return 'definition';
    }
    
    if (lower.includes('subheading')) {
      return 'subheading';
    }
    
    if (lower.includes('additional')) {
      return 'additional';
    }
    
    return 'scope';
  }

  saveResults() {
    const results = {
      sections: this.sections,
      chapters: this.chapters,
      notes: this.notes,
      tariffCodes: this.tariffCodes,
      summary: {
        totalSections: this.sections.length,
        totalChapters: this.chapters.length,
        totalNotes: this.notes.length,
        totalTariffCodes: this.tariffCodes.length,
        notesByType: this.notes.reduce((acc, note) => {
          acc[note.noteType] = (acc[note.noteType] || 0) + 1;
          return acc;
        }, {}),
        tariffByLevel: this.tariffCodes.reduce((acc, code) => {
          acc[code.level] = (acc[code.level] || 0) + 1;
          return acc;
        }, {})
      }
    };
    
    fs.writeFileSync('sars-complete-v2-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Saved complete results to sars-complete-v2-results.json');
    console.log(`   File size: ${(fs.statSync('sars-complete-v2-results.json').size / 1024 / 1024).toFixed(2)} MB`);
  }

  calculateCheckDigit(code8) {
    if (code8.length !== 8) {
      throw new Error(`Code must be 8 digits, got ${code8.length}`);
    }
    
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(code8[i]) * (i % 2 === 0 ? 1 : 3);
    }
    
    return String((10 - (sum % 10)) % 10);
  }
}

// Run the parser
const parser = new CompleteSARSParserV2();
parser.parsePDF('/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf')
  .then(result => {
    console.log('\n✅ Parsing complete!');
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });