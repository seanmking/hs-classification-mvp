const fs = require('fs');
const pdf = require('pdf-parse');

class CompleteSARSParser {
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
    console.log(`📄 Complete SARS Tariff Book Parsing`);
    console.log(`📍 Source: ${filePath}`);
    
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    console.log(`📖 Total pages: ${data.numpages}`);
    console.log(`📝 Total characters: ${data.text.length}`);
    
    // Save for debugging
    this.rawText = data.text;
    fs.writeFileSync('sars-complete-raw.txt', data.text);
    
    // Split into lines
    this.lines = data.text.split('\n');
    
    // Multi-pass parsing
    console.log('\n🔄 Pass 1: Extracting sections and chapters...');
    this.extractStructure();
    
    console.log('\n🔄 Pass 2: Extracting ALL legal notes...');
    this.extractAllLegalNotes();
    
    console.log('\n🔄 Pass 3: Extracting tariff codes...');
    this.extractTariffCodes();
    
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
    
    // Track what we're looking for
    let noteMarkers = {
      'NOTES:': 0,
      'NOTE:': 0,
      'ADDITIONAL NOTE:': 0,
      'ADDITIONAL NOTES:': 0,
      'SUBHEADING NOTE:': 0,
      'SUBHEADING NOTES:': 0,
      'This Chapter': 0,
      'This Section': 0,
      'does not cover': 0
    };
    
    // Scan entire document for notes
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Check for note markers (including when number is on same line)
      if (/^(NOTES?:|ADDITIONAL NOTES?:|SUBHEADING NOTES?:)/i.test(line)) {
        const marker = line.match(/^(NOTES?:|ADDITIONAL NOTES?:|SUBHEADING NOTES?:)/i)[1];
        noteMarkers[marker] = (noteMarkers[marker] || 0) + 1;
        
        console.log(`  Found ${marker} at line ${i}: ${line}`);
        this.extractNotesFromMarker(i);
      }
      
      // Check for inline notes (e.g., "This Chapter covers...")
      if (line.startsWith('This Chapter') || line.startsWith('This Section')) {
        const key = line.startsWith('This Chapter') ? 'This Chapter' : 'This Section';
        noteMarkers[key]++;
        
        this.extractInlineNote(i);
      }
      
      // Check for exclusion language
      if (line.includes('does not cover') || line.includes('does not include')) {
        noteMarkers['does not cover']++;
      }
    }
    
    console.log('  Note marker summary:', noteMarkers);
  }

  extractNotesFromMarker(markerLine) {
    // Determine context
    const context = this.getContext(markerLine);
    if (!context) {
      console.log(`    Warning: No context found for note at line ${markerLine}`);
      return;
    }
    
    console.log(`    Context: ${context.type} ${context.code}`);
    
    const markerLineText = this.lines[markerLine].trim();
    let i = markerLine;
    let noteNumber = 0;
    
    // Check if note number is on the same line as marker (e.g., "NOTES:1.")
    const inlineNumberMatch = markerLineText.match(/^(?:NOTES?:|ADDITIONAL NOTES?:|SUBHEADING NOTES?:)(\d+)[.)]/i);
    if (inlineNumberMatch) {
      noteNumber = parseInt(inlineNumberMatch[1]);
      
      // Extract the rest of the line as note text
      let noteText = markerLineText.substring(markerLineText.indexOf(noteNumber.toString()) + noteNumber.toString().length + 1).trim();
      
      // Continue collecting text from next lines
      let j = i + 1;
      while (j < this.lines.length) {
        const textLine = this.lines[j].trim();
        
        // Stop if we hit a new note number or section
        if (/^(\d+)[.)]\s*/.test(textLine)) break;
        if (this.isSectionHeader(textLine) || this.isChapterHeader(textLine)) break;
        if (this.isTableStart(textLine)) break;
        if (textLine.startsWith('Date:')) break;
        
        // Add non-empty lines to note text
        if (textLine.length > 0) {
          noteText += ' ' + textLine;
        }
        
        j++;
      }
      
      if (noteText) {
        const note = {
          hsCode: context.code,
          noteType: this.determineNoteType(noteText),
          noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
          noteText: this.cleanText(noteText),
          ...(context.type === 'chapter' && { chapterCode: context.code }),
          ...(context.type === 'section' && { sectionCode: context.code })
        };
        
        this.notes.push(note);
        console.log(`    Added note ${noteNumber}: ${noteText.substring(0, 50)}...`);
      }
      
      i = j;
    } else {
      // Original logic for when note number is on next line
      i = markerLine + 1;
    }
    
    // Continue looking for more numbered notes
    while (i < this.lines.length) {
      const line = this.lines[i].trim();
      
      // Stop conditions
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) break;
      if (this.isTableStart(line)) break;
      if (line.startsWith('Date:')) break;
      
      // Check for note number (e.g., "1." or "2.")
      const numberMatch = line.match(/^(\d+)[.)]\s*/);
      if (numberMatch) {
        noteNumber = parseInt(numberMatch[1]);
        
        // Get the note text
        let noteText = line.substring(numberMatch[0].length).trim();
        let j = i + 1;
        
        while (j < this.lines.length) {
          const textLine = this.lines[j].trim();
          
          // Stop if we hit another number or section
          if (/^(\d+)[.)]\s*/.test(textLine)) break;
          if (this.isSectionHeader(textLine) || this.isChapterHeader(textLine)) break;
          if (this.isTableStart(textLine)) break;
          if (textLine.startsWith('Date:')) break;
          
          // Add non-empty lines to note text
          if (textLine.length > 0) {
            noteText += ' ' + textLine;
          }
          
          j++;
        }
        
        if (noteText) {
          const note = {
            hsCode: context.code,
            noteType: this.determineNoteType(noteText),
            noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
            noteText: this.cleanText(noteText),
            ...(context.type === 'chapter' && { chapterCode: context.code }),
            ...(context.type === 'section' && { sectionCode: context.code })
          };
          
          this.notes.push(note);
          console.log(`    Added note ${noteNumber}: ${noteText.substring(0, 50)}...`);
        }
        
        i = j - 1;
      }
      
      i++;
    }
  }

  extractInlineNote(startLine) {
    const context = this.getContext(startLine);
    if (!context) return;
    
    // Collect the complete note text
    let noteText = this.lines[startLine].trim();
    let i = startLine + 1;
    
    // Continue collecting lines until we hit a break
    while (i < this.lines.length) {
      const line = this.lines[i].trim();
      
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) break;
      if (this.isTableStart(line)) break;
      if (line.startsWith('Date:')) break;
      if (line.length === 0) break;
      
      noteText += ' ' + line;
      i++;
    }
    
    // Generate note number based on existing notes for this context
    const existingNotes = this.notes.filter(n => n.hsCode === context.code);
    const noteNumber = existingNotes.length + 1;
    
    const note = {
      hsCode: context.code,
      noteType: this.determineNoteType(noteText),
      noteNumber: `${context.type === 'chapter' ? 'Chapter' : 'Section'} ${context.code} Note ${noteNumber}`,
      noteText: this.cleanText(noteText),
      ...(context.type === 'chapter' && { chapterCode: context.code }),
      ...(context.type === 'section' && { sectionCode: context.code })
    };
    
    this.notes.push(note);
  }

  extractTariffCodes() {
    let inTable = false;
    let tariffCount = 0;
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      if (this.isTableStart(line)) {
        inTable = true;
        continue;
      }
      
      if (this.isSectionHeader(line) || this.isChapterHeader(line)) {
        inTable = false;
        continue;
      }
      
      // Look for tariff code patterns
      if (/^\d{2}\.\d{2}$/.test(line)) {
        // Heading (e.g., 01.01)
        const tariff = this.parseHeading(i);
        if (tariff) {
          this.tariffCodes.push(tariff);
          tariffCount++;
        }
      } else if (/^\d{4}\.\d{1,2}$/.test(line)) {
        // Subheading (e.g., 0101.21)
        const tariff = this.parseSubheading(i);
        if (tariff) {
          this.tariffCodes.push(tariff);
          tariffCount++;
        }
      } else if (/^\d{4}\.\d{2}\.\d{2}$/.test(line)) {
        // Full tariff code (e.g., 0101.21.00)
        const tariff = this.parseFullTariff(i);
        if (tariff) {
          this.tariffCodes.push(tariff);
          tariffCount++;
        }
      }
      
      if (tariffCount % 100 === 0 && tariffCount > 0) {
        console.log(`  Processed ${tariffCount} tariff codes...`);
      }
    }
    
    console.log(`  Total tariff codes extracted: ${tariffCount}`);
  }

  parseHeading(lineIndex) {
    const code = this.lines[lineIndex].trim();
    let description = '';
    
    // Look for description on next lines
    let i = lineIndex + 1;
    while (i < this.lines.length && i < lineIndex + 5) {
      const line = this.lines[i].trim();
      if (line && !this.isTableHeader(line) && !/^\d/.test(line)) {
        description = line;
        break;
      }
      i++;
    }
    
    if (description) {
      return {
        code: code.replace('.', ''),
        cd: '',
        description: this.cleanText(description),
        unit: '',
        generalRate: ''
      };
    }
    
    return null;
  }
  
  parseSubheading(lineIndex) {
    const code = this.lines[lineIndex].trim();
    let cd = '';
    let description = '';
    
    // Check if CD is on next line
    let i = lineIndex + 1;
    if (i < this.lines.length && /^\d$/.test(this.lines[i].trim())) {
      cd = this.lines[i].trim();
      i++;
    }
    
    // Look for "- -" pattern and description
    while (i < this.lines.length && i < lineIndex + 10) {
      const line = this.lines[i].trim();
      if (line === '-' || line === '- -') {
        // Description should be on next line
        if (i + 1 < this.lines.length) {
          description = this.lines[i + 1].trim();
          break;
        }
      }
      i++;
    }
    
    if (description) {
      return {
        code: code.replace(/\./g, ''),
        cd: cd,
        description: this.cleanText(description),
        unit: '',
        generalRate: ''
      };
    }
    
    return null;
  }
  
  parseFullTariff(lineIndex) {
    const code = this.lines[lineIndex].trim();
    let cd = '';
    let description = '';
    let unit = '';
    let generalRate = '';
    
    // CD should be on next line
    let i = lineIndex + 1;
    if (i < this.lines.length && /^\d$/.test(this.lines[i].trim())) {
      cd = this.lines[i].trim();
      i++;
    }
    
    // Look for "- - -" pattern and description
    while (i < this.lines.length && i < lineIndex + 10) {
      const line = this.lines[i].trim();
      if (line === '- - -' || line === '- -' || line === '-') {
        // Description should be on next line
        if (i + 1 < this.lines.length) {
          description = this.lines[i + 1].trim();
          i = i + 2;
          break;
        }
      }
      i++;
    }
    
    // Unit should be next
    if (i < this.lines.length) {
      const possibleUnit = this.lines[i].trim();
      if (/^(u|kg|l|m²|m³|2u|ct|GVM|ml|g|cm³|pa|dz|GIL)$/.test(possibleUnit)) {
        unit = possibleUnit;
        i++;
      }
    }
    
    // General rate should be next
    if (i < this.lines.length) {
      const possibleRate = this.lines[i].trim();
      if (/^(free|Free|\d+%?|\d+c\/\w+)$/.test(possibleRate)) {
        generalRate = possibleRate.toLowerCase();
      }
    }
    
    if (description) {
      return {
        code: code.replace(/\./g, ''),
        cd: cd,
        description: this.cleanText(description),
        unit: unit,
        generalRate: generalRate
      };
    }
    
    return null;
  }

  parseTariffLine(line) {
    // Pattern 1: Full 8-digit tariff with CD
    // Example: "0101.21.00 1 Pure-bred breeding animals u free free free free free free"
    const fullMatch = line.match(
      /^(\d{4}\.\d{2}\.\d{2})\s+(\d)\s+(.+?)\s+(u|kg|l|m²|m³|2u|ct|GVM|ml|g|cm³|pa|dz|GIL)\s+(free|Free|\d+%?|\d+c\/\w+)\s*(.*)$/
    );
    
    if (fullMatch) {
      const rates = (fullMatch[6] || '').trim().split(/\s+/);
      return {
        code: fullMatch[1].replace(/\./g, ''),
        cd: fullMatch[2],
        description: this.cleanText(fullMatch[3]),
        unit: fullMatch[4],
        generalRate: fullMatch[5].toLowerCase(),
        euRate: rates[0] || fullMatch[5].toLowerCase(),
        eftaRate: rates[1] || fullMatch[5].toLowerCase(),
        sadcRate: rates[2] || fullMatch[5].toLowerCase(),
        mercosurRate: rates[3] || fullMatch[5].toLowerCase(),
        afcftaRate: rates[4] || fullMatch[5].toLowerCase()
      };
    }
    
    // Pattern 2: Heading (01.01)
    const headingMatch = line.match(/^(\d{2}\.\d{2})\s+([A-Z].+?)(:|$)/);
    if (headingMatch && !this.isTableHeader(line)) {
      return {
        code: headingMatch[1].replace('.', ''),
        cd: '',
        description: this.cleanText(headingMatch[2]),
        unit: '',
        generalRate: ''
      };
    }
    
    // Pattern 3: Subheading (0101.21)
    const subheadingMatch = line.match(/^(\d{4}\.\d{2})\s+(\d)\s*-\s*-\s*(.+)$/);
    if (subheadingMatch) {
      return {
        code: subheadingMatch[1].replace(/\./g, ''),
        cd: subheadingMatch[2],
        description: this.cleanText(subheadingMatch[3]),
        unit: '',
        generalRate: ''
      };
    }
    
    return null;
  }

  getContext(lineNumber) {
    // Look backwards for the most recent section or chapter
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
      
      // Get description from next lines
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
      
      // Skip reserved chapter 77
      if (chapterCode === '77') return;
      
      let description = '';
      
      // Get description from next lines
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
      
      // Update section range
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
    const headers = ['heading', 'subheading', 'statistical', 'rate', 'duty', 'general', 'eu', 'CD'];
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
      tariffCodes: this.tariffCodes, // Save ALL tariff codes
      summary: {
        totalSections: this.sections.length,
        totalChapters: this.chapters.length,
        totalNotes: this.notes.length,
        totalTariffCodes: this.tariffCodes.length,
        notesByType: this.notes.reduce((acc, note) => {
          acc[note.noteType] = (acc[note.noteType] || 0) + 1;
          return acc;
        }, {})
      }
    };
    
    fs.writeFileSync('sars-complete-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Saved complete results to sars-complete-results.json');
    console.log(`   File size: ${(fs.statSync('sars-complete-results.json').size / 1024 / 1024).toFixed(2)} MB`);
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
const parser = new CompleteSARSParser();
parser.parsePDF('/Users/seanking/Projects/bluelantern core data/SARS Tariff book.pdf')
  .then(result => {
    console.log('\n✅ Parsing complete!');
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });