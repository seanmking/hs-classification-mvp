# Enhanced HS Classification System Implementation Plan

## Overview
This document outlines the complete implementation plan for the enhanced HS classification system with legal compliance features, audit trails, and comprehensive documentation capabilities.

## Implementation Steps

### 1. Create src/db/seed-hs-codes.ts

**Purpose**: Import HS codes from GitHub CSV datasets into the database with proper validation and progress tracking.

**Requirements**:
- Fetch CSV files from GitHub:
  - `https://raw.githubusercontent.com/datasets/harmonized-system/main/data/harmonized-system.csv`
  - `https://raw.githubusercontent.com/datasets/harmonized-system/main/data/sections.csv`
- Add progress logging every 100 records
- Validate CSV format before insertion
- Use database transactions for atomicity
- Add common legal notes for major chapters

**Implementation Details**:
```typescript
interface HSCodeRecord {
  code: string
  description: string
  level: 'section' | 'chapter' | 'heading' | 'subheading' | 'tariff'
  parentCode?: string
  notes?: string[]
  exclusions?: string[]
}

// Key functions:
- validateCSVFormat(data: any[]): boolean
- transformCSVToHSCode(row: any): HSCodeRecord
- seedHSCodes(): Promise<void> with transaction support
- addLegalNotes(chapter: string): string[]
```

### 2. Create src/lib/classification/gri-engine-enhanced.ts

**Purpose**: Enhanced GRI engine with mandatory pre-classification and product analysis steps.

**Requirements**:
- Mandatory workflow: `pre_classification` → `analyze_product` → `GRI 1` → ...
- Pre-classification must complete before any GRI rules
- Add `analyze_product` step between GRI 1 and GRI 2
- Validate all required decisions before rule transitions
- Complete decision tracking with metadata
- Legal compliance features

**Implementation Details**:
```typescript
interface EnhancedGRIContext extends GRIContext {
  preClassificationComplete: boolean
  productAnalysisComplete: boolean
  legalNotes: string[]
  exclusions: string[]
  confidenceThreshold: number
}

class EnhancedGRIEngine {
  // Mandatory starting point
  startClassification(): void {
    this.currentStep = 'pre_classification'
  }
  
  // Validate transitions
  canTransition(from: string, to: string): boolean
  
  // New steps
  performPreClassification(): Promise<PreClassificationResult>
  performProductAnalysis(): Promise<ProductAnalysisResult>
}
```

### 3. Create src/lib/classification/hs-database.ts

**Purpose**: Efficient HS code database with caching and exclusion management.

**Requirements**:
- Check exclusion notes BEFORE suggesting any headings
- Implement in-memory cache for frequently accessed codes
- Add `getApplicableNotes()` method
- Intelligent search with exclusion filtering

**Implementation Details**:
```typescript
class HSCodeDatabase {
  private cache: Map<string, HSCode>
  private exclusionIndex: Map<string, string[]>
  
  constructor() {
    this.initializeCache()
    this.buildExclusionIndex()
  }
  
  // Check exclusions first
  searchByKeyword(keyword: string): HSCode[] {
    const results = this.rawSearch(keyword)
    return this.filterByExclusions(results)
  }
  
  // Collect all notes in hierarchy
  getApplicableNotes(hsCode: string): Note[] {
    const hierarchy = this.getHierarchy(hsCode)
    return hierarchy.flatMap(code => code.notes)
  }
  
  // Cache management
  private getCached(code: string): HSCode | null
  private setCached(code: string, data: HSCode): void
}
```

### 4. Create src/lib/classification/legal-documentation.ts

**Purpose**: Generate legally compliant documentation with validation and integrity verification.

**Requirements**:
- Auto-validate defense checklist and flag missing items
- Generate SHA-256 hash of final report
- Add `generateExecutiveSummary()` method
- Support markdown and PDF export

**Implementation Details**:
```typescript
interface DefenseChecklistItem {
  requirement: string
  satisfied: boolean
  evidence?: string
  severity: 'critical' | 'important' | 'recommended'
}

class LegalDocumentationGenerator {
  // Auto-validation
  validateDefenseChecklist(classification: Classification): DefenseChecklistItem[] {
    return DEFENSE_CHECKLIST.map(item => this.validateItem(item, classification))
  }
  
  // SHA-256 hash generation
  generateReportHash(report: string): string {
    return crypto.createHash('sha256').update(report).digest('hex')
  }
  
  // Executive summary for non-technical users
  generateExecutiveSummary(classification: Classification): string {
    return this.summarizeInPlainLanguage(classification)
  }
  
  // Export functions
  exportToMarkdown(classification: Classification): string
  exportToPDF(classification: Classification): Buffer
}
```

### 5. Update src/app/api/classification/route.ts

**Purpose**: Enhanced API endpoint with sessions, webhooks, and rate limiting.

**Requirements**:
- Store classification sessions in database
- Add webhook notification when confidence < 70%
- Include rate limiting middleware
- Start with mandatory pre_classification step

**Implementation Details**:
```typescript
// Rate limiting
const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}

// Webhook notification
async function notifyLowConfidence(classification: Classification) {
  if (classification.confidence < 0.7) {
    await sendWebhook({
      event: 'low_confidence_classification',
      classificationId: classification.id,
      confidence: classification.confidence
    })
  }
}

// Session management
async function createClassificationSession(request: NextRequest) {
  const session = {
    id: nanoid(),
    startedAt: new Date(),
    ipAddress: request.ip,
    userAgent: request.headers.get('user-agent')
  }
  await db.insert(classificationSessions).values(session)
  return session
}
```

### 6. Update package.json

**Dependencies to add**:
```json
{
  "dependencies": {
    "papaparse": "^5.4.1"
  }
}
```

**Scripts to add**:
```json
{
  "scripts": {
    "db:seed-hs": "tsx src/db/seed-hs-codes.ts",
    "db:seed-all": "npm run db:seed && npm run db:seed-hs"
  }
}
```

## Type Definitions

### Core Types
```typescript
// Enhanced classification types
interface EnhancedClassification extends Classification {
  sessionId: string
  preClassificationData?: PreClassificationResult
  productAnalysisData?: ProductAnalysisResult
  legalDocumentationId?: string
  webhookNotifications: WebhookNotification[]
}

// Pre-classification result
interface PreClassificationResult {
  productCategory: string
  materialComposition: Material[]
  intendedUse: string
  technicalSpecifications: Record<string, any>
  suggestedSections: string[]
  timestamp: Date
}

// Product analysis result
interface ProductAnalysisResult {
  primaryFunction: string
  secondaryFunctions: string[]
  essentialCharacter: string
  compositeAnalysis?: CompositeAnalysis
  packagingConsiderations?: PackagingAnalysis
  timestamp: Date
}

// Legal documentation
interface LegalReport {
  id: string
  classificationId: string
  content: string
  hash: string
  defenseChecklist: DefenseChecklistItem[]
  executiveSummary: string
  generatedAt: Date
  expiresAt: Date
}
```

## Implementation Order

1. **Install Dependencies** (Priority: High)
   - Add papaparse to package.json
   - Run npm install

2. **Create Database Seeding** (Priority: High)
   - Implement seed-hs-codes.ts with all validation
   - Test with sample data first
   - Run full import with progress tracking

3. **Implement HS Database** (Priority: High)
   - Create HSCodeDatabase class
   - Build exclusion index
   - Implement caching layer
   - Add search methods

4. **Create Enhanced GRI Engine** (Priority: High)
   - Extend existing GRI engine
   - Add mandatory pre-classification
   - Implement analyze_product step
   - Add validation logic

5. **Build Legal Documentation** (Priority: High)
   - Create documentation generator
   - Implement defense checklist
   - Add hash generation
   - Build export functionality

6. **Update API Route** (Priority: High)
   - Integrate all components
   - Add session management
   - Implement webhooks
   - Add rate limiting

7. **Testing & Validation** (Priority: Medium)
   - Test each component individually
   - Run end-to-end classification tests
   - Validate legal documentation output
   - Check TypeScript compilation

## Validation Checklist

- [ ] All TypeScript types properly defined
- [ ] No compilation errors
- [ ] Database transactions working correctly
- [ ] Progress logging implemented
- [ ] Exclusion checks working before suggestions
- [ ] Cache implementation verified
- [ ] Defense checklist auto-validation working
- [ ] SHA-256 hashing implemented
- [ ] Executive summary generation tested
- [ ] Webhook notifications functional
- [ ] Rate limiting active
- [ ] All required npm scripts added

## Error Handling

Each component should implement proper error handling:
- Database operations: Use transactions and rollback on error
- API calls: Implement retry logic with exponential backoff
- File operations: Validate data before processing
- User input: Sanitize and validate all inputs
- Webhooks: Queue failed notifications for retry

## Security Considerations

- Rate limiting on all API endpoints
- Input validation and sanitization
- Secure session management
- Audit trail for all operations
- Hash verification for document integrity
- Proper error messages (no sensitive data exposure)