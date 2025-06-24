import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { getDb, withTransaction } from '@/lib/db/client'
import { 
  classifications, 
  classificationSteps,
  decisions,
  formSubmissions,
  type NewClassification,
  type NewClassificationStep,
  type NewDecision
} from '@/db/schema'
import { EnhancedGRIEngine } from '@/lib/classification/gri-engine-enhanced'
import { hsDatabase } from '@/lib/classification/hs-database'
import { LegalDocumentationGenerator } from '@/lib/classification/legal-documentation'
import { eq, desc, and } from 'drizzle-orm'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 100 // max requests per window

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Webhook configuration
const WEBHOOK_URL = process.env.CLASSIFICATION_WEBHOOK_URL
const LOW_CONFIDENCE_THRESHOLD = 0.7

// Session storage (in production, use database or Redis)
const sessionStore = new Map<string, ClassificationSession>()

interface ClassificationSession {
  id: string
  classificationId: string
  startedAt: Date
  ipAddress?: string
  userAgent?: string
  lastActivity: Date
}

// Rate limiting middleware
function checkRateLimit(request: NextRequest): { allowed: boolean; remaining: number } {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const now = Date.now()
  
  const userLimit = rateLimitStore.get(ip)
  
  if (!userLimit || userLimit.resetTime < now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 }
  }
  
  userLimit.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count }
}

// Webhook notification for low confidence
async function notifyLowConfidence(
  classificationId: string, 
  confidence: number,
  details: any
): Promise<void> {
  if (!WEBHOOK_URL) return
  
  try {
    const payload = {
      event: 'low_confidence_classification',
      classificationId,
      confidence,
      timestamp: new Date().toISOString(),
      details
    }
    
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': 'classification.low_confidence'
      },
      body: JSON.stringify(payload)
    })
  } catch (error) {
    console.error('Failed to send webhook notification:', error)
  }
}

// Create classification session
function createClassificationSession(
  classificationId: string,
  request: NextRequest
): ClassificationSession {
  const session: ClassificationSession = {
    id: `session_${nanoid()}`,
    classificationId,
    startedAt: new Date(),
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    lastActivity: new Date()
  }
  
  sessionStore.set(session.id, session)
  return session
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const { allowed, remaining } = checkRateLimit(request)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString()
          }
        }
      )
    }
    
    const body = await request.json()
    const { productDescription, userId, materials, intendedUse, technicalSpecs } = body
    
    if (!productDescription || productDescription.trim().length < 10) {
      return NextResponse.json(
        { error: 'Product description must be at least 10 characters long' },
        { status: 400 }
      )
    }
    
    const db = getDb()
    const classificationId = `clf_${nanoid()}`
    
    // Create classification session
    const session = createClassificationSession(classificationId, request)
    
    // Initialize classification in database
    const newClassification: NewClassification = {
      id: classificationId,
      productDescription: productDescription.trim(),
      userId: userId || 'anonymous',
      status: 'in_progress',
      currentStep: 'pre_classification',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: JSON.stringify({
        sessionId: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      })
    }
    
    await withTransaction(async (tx) => {
      // Insert classification
      await tx.insert(classifications).values(newClassification)
      
      // Initialize GRI engine with pre_classification
      const griEngine = new EnhancedGRIEngine({
        productDescription: productDescription.trim(),
        materials: materials || []
      })
      
      // Start with mandatory pre_classification
      griEngine.startClassification()
      
      // Create initial step
      const initialStep: NewClassificationStep = {
        id: `step_${nanoid()}`,
        classificationId,
        step: 'pre_classification',
        status: 'started',
        startedAt: new Date(),
        data: JSON.stringify({
          materials,
          intendedUse,
          technicalSpecs
        })
      }
      
      await tx.insert(classificationSteps).values(initialStep)
      
      // Perform pre-classification
      const preClassificationResult = await griEngine.performPreClassification({
        productDescription: productDescription.trim(),
        materials,
        intendedUse,
        technicalSpecs
      })
      
      // Store pre-classification decision
      const preClassDecision: NewDecision = {
        id: `dec_${nanoid()}`,
        classificationId,
        step: 'pre_classification',
        question: 'Initial product analysis',
        answer: JSON.stringify(preClassificationResult),
        reasoning: 'Automated pre-classification analysis completed',
        confidence: preClassificationResult.confidence,
        timestamp: new Date(),
        metadata: JSON.stringify(preClassificationResult)
      }
      
      await tx.insert(decisions).values(preClassDecision)
      
      // Update step status
      await tx.update(classificationSteps)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          data: JSON.stringify(preClassificationResult)
        })
        .where(eq(classificationSteps.id, initialStep.id))
      
      // Check if we need to notify webhook for low confidence
      if (preClassificationResult.confidence < LOW_CONFIDENCE_THRESHOLD) {
        await notifyLowConfidence(
          classificationId,
          preClassificationResult.confidence,
          { step: 'pre_classification', result: preClassificationResult }
        )
      }
      
      // Use HS database to get suggested headings
      const suggestedHeadings = await hsDatabase.searchByKeyword(
        productDescription,
        { limit: 10, excludeExclusions: true }
      )
      
      // Store form submission if any additional data was provided
      if (materials || intendedUse || technicalSpecs) {
        await tx.insert(formSubmissions).values({
          id: `form_${nanoid()}`,
          classificationId,
          formType: 'initial_data',
          data: JSON.stringify({ materials, intendedUse, technicalSpecs }),
          submittedAt: new Date()
        })
      }
    })
    
    // Return response with rate limit headers
    return NextResponse.json(
      { 
        classification: newClassification,
        sessionId: session.id,
        nextStep: 'analyze_product'
      },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString()
        }
      }
    )
    
  } catch (error) {
    console.error('Failed to create classification:', error)
    return NextResponse.json(
      { error: 'Failed to create classification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const { allowed, remaining } = checkRateLimit(request)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': '0'
          }
        }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const db = getDb()
    
    // Build query conditions
    const conditions = []
    if (userId) {
      conditions.push(eq(classifications.userId, userId))
    }
    
    // If sessionId provided, get classification from session
    if (sessionId) {
      const session = sessionStore.get(sessionId)
      if (session) {
        conditions.push(eq(classifications.id, session.classificationId))
      }
    }
    
    // Fetch classifications
    const results = await db.select()
      .from(classifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(classifications.createdAt))
      .limit(limit)
      .execute()
    
    return NextResponse.json(
      { classifications: results },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    )
    
  } catch (error) {
    console.error('Failed to fetch classifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classifications' },
      { status: 500 }
    )
  }
}

// Process next classification step
export async function PUT(request: NextRequest) {
  try {
    // Check rate limit
    const { allowed, remaining } = checkRateLimit(request)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    const body = await request.json()
    const { classificationId, sessionId, stepData } = body
    
    if (!classificationId || !sessionId) {
      return NextResponse.json(
        { error: 'Classification ID and session ID are required' },
        { status: 400 }
      )
    }
    
    // Verify session
    const session = sessionStore.get(sessionId)
    if (!session || session.classificationId !== classificationId) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }
    
    // Update session activity
    session.lastActivity = new Date()
    
    const db = getDb()
    
    // Get current classification state
    const [classification] = await db.select()
      .from(classifications)
      .where(eq(classifications.id, classificationId))
      .limit(1)
      .execute()
    
    if (!classification) {
      return NextResponse.json(
        { error: 'Classification not found' },
        { status: 404 }
      )
    }
    
    // Get all decisions and steps
    const [allDecisions, allSteps] = await Promise.all([
      db.select()
        .from(decisions)
        .where(eq(decisions.classificationId, classificationId))
        .execute(),
      db.select()
        .from(classificationSteps)
        .where(eq(classificationSteps.classificationId, classificationId))
        .execute()
    ])
    
    // Rebuild GRI context
    const griEngine = new EnhancedGRIEngine({
      productDescription: classification.productDescription,
      currentRule: classification.currentStep,
      decisions: allDecisions.map(d => ({
        ruleId: d.step,
        criterionId: d.metadata ? JSON.parse(d.metadata).criterionId || 'unknown' : 'unknown',
        question: d.question,
        answer: d.answer,
        reasoning: d.reasoning,
        confidence: d.confidence,
        legalBasis: d.metadata ? JSON.parse(d.metadata).legalBasis || [] : [],
        timestamp: new Date(d.timestamp),
        metadata: d.metadata ? JSON.parse(d.metadata) : undefined
      }))
    })
    
    // Process next step based on current state
    let nextStepResult
    
    if (classification.currentStep === 'pre_classification') {
      // Move to analyze_product
      nextStepResult = await griEngine.performProductAnalysis()
      
      // Check confidence and send webhook if needed
      if (nextStepResult.confidence < LOW_CONFIDENCE_THRESHOLD) {
        await notifyLowConfidence(
          classificationId,
          nextStepResult.confidence,
          { step: 'analyze_product', result: nextStepResult }
        )
      }
    }
    
    // Generate legal documentation if classification is complete
    if (classification.status === 'completed' || 
        (classification.finalHsCode && allDecisions.length >= 3)) {
      
      const docGenerator = new LegalDocumentationGenerator()
      const legalReport = await docGenerator.generateReport({
        classification,
        decisions: allDecisions,
        steps: allSteps,
        griContext: griEngine.exportContext()
      })
      
      // Store legal report (you might want to save this to a separate table)
      await db.update(classifications)
        .set({
          metadata: JSON.stringify({
            ...JSON.parse(classification.metadata || '{}'),
            legalReportId: legalReport.id,
            legalReportHash: legalReport.hash
          })
        })
        .where(eq(classifications.id, classificationId))
    }
    
    return NextResponse.json(
      { 
        success: true,
        nextStep: griEngine.getCurrentRule().id,
        confidence: griEngine.getOverallConfidence()
      },
      {
        headers: {
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    )
    
  } catch (error) {
    console.error('Failed to process classification step:', error)
    return NextResponse.json(
      { error: 'Failed to process step' },
      { status: 500 }
    )
  }
}

// Clean up old sessions periodically (in production, use a scheduled job)
setInterval(() => {
  const now = Date.now()
  const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (now - session.lastActivity.getTime() > SESSION_TIMEOUT) {
      sessionStore.delete(sessionId)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes