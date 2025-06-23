import { z } from 'zod'

// Validation schemas for classification data

export const ProductDescriptionSchema = z.object({
  description: z.string().min(20, 'Description must be at least 20 characters'),
  primaryFunction: z.string().min(10, 'Primary function must be detailed'),
  intendedUse: z.string().min(10, 'Intended use must be specified'),
  physicalCharacteristics: z.object({
    dimensions: z.object({
      length: z.number().positive().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      weight: z.number().positive().optional(),
      unit: z.enum(['cm', 'inch', 'kg', 'lb'])
    }).optional(),
    color: z.string().optional(),
    shape: z.string().optional()
  }).optional()
})

export const MaterialCompositionSchema = z.object({
  materials: z.array(z.object({
    name: z.string().min(1, 'Material name required'),
    percentage: z.number().min(0).max(100),
    hsCode: z.string().optional(),
    description: z.string().optional()
  })).min(1, 'At least one material required'),
  determinationMethod: z.enum(['weight', 'value', 'volume', 'surface_area']),
  totalWeight: z.number().positive().optional(),
  weightUnit: z.enum(['kg', 'g', 'lb', 'oz']).optional()
}).refine((data) => {
  const total = data.materials.reduce((sum, mat) => sum + mat.percentage, 0)
  return Math.abs(total - 100) < 0.01
}, {
  message: "Material percentages must add up to 100%",
  path: ["materials"]
})

export const HSCodeSchema = z.string().regex(
  /^\d{4}(\.\d{2})?(\.\d{2})?$/,
  'Invalid HS code format. Must be 4, 6, or 8 digits with proper formatting'
)

export const ClassificationDecisionSchema = z.object({
  step: z.string(),
  question: z.string(),
  answer: z.string(),
  reasoning: z.string().min(20, 'Reasoning must be detailed'),
  confidence: z.number().min(0).max(1),
  supportingEvidence: z.array(z.string()).optional(),
  legalReferences: z.array(z.string()).optional()
})

const MaterialsArraySchema = z.array(z.object({
  name: z.string().min(1, 'Material name required'),
  percentage: z.number().min(0).max(100),
  hsCode: z.string().optional(),
  description: z.string().optional()
})).min(1, 'At least one material required')

export const GRIStepValidation = {
  'gri_1': z.object({
    productDescription: z.string().min(20),
    primaryFunction: z.string().min(10),
    applicableHeadings: z.array(z.string()).optional()
  }),
  
  'gri_2a': z.object({
    missingComponents: z.array(z.string()),
    hasEssentialCharacter: z.boolean(),
    functionalityAssessment: z.string()
  }),
  
  'gri_2b': z.object({
    materials: MaterialsArraySchema,
    primaryMaterial: z.string(),
    determinationMethod: z.enum(['weight', 'value', 'volume', 'surface_area'])
  }),
  
  'gri_3a': z.object({
    possibleHeadings: z.array(z.object({
      code: z.string(),
      description: z.string(),
      specificityScore: z.number().min(0).max(1)
    })).min(2),
    mostSpecificHeading: z.string(),
    specificityReasoning: z.string()
  }),
  
  'gri_3b': z.object({
    components: z.array(z.object({
      name: z.string(),
      role: z.string(),
      importance: z.enum(['essential', 'important', 'auxiliary'])
    })),
    essentialComponent: z.string(),
    characterAnalysis: z.string()
  }),
  
  'gri_3c': z.object({
    applicableHeadings: z.array(z.string()).min(2),
    lastHeading: z.string()
  }),
  
  'gri_4': z.object({
    similarProducts: z.array(z.object({
      name: z.string(),
      hsCode: z.string(),
      similarityScore: z.number().min(0).max(1),
      similarities: z.array(z.string())
    })),
    mostSimilarProduct: z.string(),
    similarityAnalysis: z.string()
  }),
  
  'gri_5': z.object({
    packagingDescription: z.string(),
    isReusable: z.boolean(),
    isSpeciallyFitted: z.boolean(),
    packagingClassification: z.enum(['with_goods', 'separately'])
  }),
  
  'gri_6': z.object({
    heading: z.string(),
    subheadingOptions: z.array(z.string()),
    selectedSubheading: z.string(),
    subheadingReasoning: z.string()
  })
}

// Validation helper functions

export function validateHSCode(code: string): { valid: boolean; error?: string } {
  try {
    HSCodeSchema.parse(code)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Invalid HS code' }
  }
}

export function validateGRIStep(step: string, data: any): { valid: boolean; errors?: string[] } {
  const schema = GRIStepValidation[step as keyof typeof GRIStepValidation]
  
  if (!schema) {
    return { valid: false, errors: ['Unknown GRI step'] }
  }
  
  try {
    schema.parse(data)
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        valid: false, 
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return { valid: false, errors: ['Validation failed'] }
  }
}

export function validateClassificationCompletion(classification: any): {
  complete: boolean
  missing: string[]
} {
  const required = [
    'productDescription',
    'finalHsCode',
    'decisions',
    'confidence'
  ]
  
  const missing = required.filter(field => !classification[field])
  
  // Also check that all GRI steps have been addressed
  if (classification.decisions && classification.decisions.length < 1) {
    missing.push('No classification decisions recorded')
  }
  
  return {
    complete: missing.length === 0,
    missing
  }
}

export function validateConfidenceThreshold(confidence: number, threshold: number = 0.7): {
  acceptable: boolean
  requiresReview: boolean
  message: string
} {
  if (confidence >= 0.9) {
    return {
      acceptable: true,
      requiresReview: false,
      message: 'High confidence classification'
    }
  } else if (confidence >= threshold) {
    return {
      acceptable: true,
      requiresReview: true,
      message: 'Classification acceptable but expert review recommended'
    }
  } else {
    return {
      acceptable: false,
      requiresReview: true,
      message: 'Low confidence - expert review required'
    }
  }
}