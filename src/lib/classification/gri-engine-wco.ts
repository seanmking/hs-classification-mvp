import { z } from 'zod'
import { createHash } from 'crypto'

// Enhanced GRI Types with legal compliance
export interface GRIRule {
  id: string
  name: string
  description: string
  legalText: string // WCO official text
  order: number
  requiredInputs: string[]
  validationRules: ValidationRule[]
  decisionCriteria: DecisionCriterion[]
  nextSteps: NextStep[]
  legalNotes: string[]
  examples: Example[]
}

export interface ValidationRule {
  field: string
  rule: string
  errorMessage: string
  validator: (value: any, context: GRIContext) => boolean
}

export interface DecisionCriterion {
  id: string
  question: string
  type: 'boolean' | 'select' | 'multiselect' | 'text' | 'number'
  options?: string[]
  required: boolean
  helpText: string
  legalReference: string
}

export interface NextStep {
  conditions: Condition[]
  nextRule: string | null
  reasoning: string
}

export interface Condition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  logic?: 'AND' | 'OR'
}

export interface Example {
  product: string
  decision: string
  reasoning: string
}

export interface GRIDecision {
  ruleId: string
  criterionId: string
  question: string
  answer: any
  reasoning: string
  confidence: number
  legalBasis: string[]
  timestamp: Date
  metadata?: Record<string, any>
  hash?: string // For integrity
}

export interface GRIContext {
  classificationId: string
  productDescription: string
  currentRule: string
  decisions: GRIDecision[]
  materials?: Material[]
  physicalCharacteristics?: PhysicalCharacteristics
  commercialInfo?: CommercialInfo
  additionalData?: Record<string, any>
  possibleHeadings?: HSHeading[]
  excludedHeadings?: ExcludedHeading[]
}

export interface Material {
  name: string
  percentage: number
  byWeight?: boolean
  byValue?: boolean
  byVolume?: boolean
  hsCode?: string
  essentialCharacter?: boolean
}

export interface PhysicalCharacteristics {
  dimensions?: { length: number; width: number; height: number; unit: string }
  weight?: { value: number; unit: string }
  color?: string
  shape?: string
  texture?: string
  otherFeatures?: string[]
}

export interface CommercialInfo {
  intendedUse: string
  targetMarket: string
  retailPrice?: number
  brandName?: string
  modelNumber?: string
  packaging?: string
}

export interface HSHeading {
  code: string
  description: string
  confidence: number
  matchReasons: string[]
}

export interface ExcludedHeading {
  code: string
  reason: string
  legalNote: string
}

// WCO-Compliant GRI Rules
export const COMPLETE_GRI_RULES: Record<string, GRIRule> = {
  'pre_classification': {
    id: 'pre_classification',
    name: 'Pre-Classification Product Analysis',
    description: 'Comprehensive product analysis before applying GRI rules',
    legalText: 'Gather complete product information to ensure accurate classification',
    order: 0,
    requiredInputs: ['product_name', 'product_description'],
    validationRules: [
      {
        field: 'product_description',
        rule: 'comprehensive',
        errorMessage: 'Product description must include physical, functional, and commercial characteristics',
        validator: (value) => value && value.length >= 50
      }
    ],
    decisionCriteria: [
      {
        id: 'physical_characteristics',
        question: 'What are the physical characteristics of the product?',
        type: 'multiselect',
        options: ['Material composition', 'Physical state', 'Dimensions/weight', 'Color/texture', 'Assembly status', 'Processing level'],
        required: true,
        helpText: 'Select all applicable physical characteristics',
        legalReference: 'Pre-classification requirement'
      },
      {
        id: 'functional_characteristics',
        question: 'What is the primary function and use of the product?',
        type: 'text',
        required: true,
        helpText: 'Describe what the product does and how it is used',
        legalReference: 'Essential for GRI application'
      },
      {
        id: 'commercial_characteristics',
        question: 'What are the commercial characteristics?',
        type: 'multiselect',
        options: ['Trade name', 'Industry classification', 'Target market', 'Packaging type', 'Retail/bulk presentation'],
        required: true,
        helpText: 'Commercial context affects classification',
        legalReference: 'Commercial designation consideration'
      },
      {
        id: 'material_composition_detail',
        question: 'If multiple materials, provide composition percentages',
        type: 'text',
        required: false,
        helpText: 'E.g., 60% cotton, 40% polyester - specify by weight/value/volume',
        legalReference: 'Required for GRI 2(b) and 3(b) application'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'physical_characteristics', operator: 'not_in', value: [] }
        ],
        nextRule: 'gri_1',
        reasoning: 'Product analysis complete - proceed to GRI 1'
      }
    ],
    legalNotes: [
      'Complete product analysis is essential for defensible classification',
      'Document all characteristics even if they seem minor',
      'Physical evidence (photos, samples) should supplement descriptions'
    ],
    examples: []
  },

  'gri_1': {
    id: 'gri_1',
    name: 'Classification by terms of headings and notes',
    description: 'For legal purposes, classification shall be determined according to the terms of the headings and any relative section or chapter notes',
    legalText: 'The titles of sections, chapters and sub-chapters are provided for ease of reference only; for legal purposes, classification shall be determined according to the terms of the headings and any relative section or chapter notes and, provided such headings or notes do not otherwise require, according to the following provisions.',
    order: 1,
    requiredInputs: ['product_description', 'primary_function', 'physical_characteristics'],
    validationRules: [
      {
        field: 'product_description',
        rule: 'min_length',
        errorMessage: 'Product description must be at least 20 characters for accurate classification',
        validator: (value) => value && value.length >= 20
      }
    ],
    decisionCriteria: [
      {
        id: 'section_identification',
        question: 'Which HS Sections (I-XXI) could potentially cover this product?',
        type: 'multiselect',
        options: ['I-Live animals/products', 'II-Vegetable products', 'III-Fats and oils', 'IV-Prepared foodstuffs', 
                  'V-Mineral products', 'VI-Chemical products', 'VII-Plastics/rubber', 'VIII-Leather/fur', 
                  'IX-Wood/cork', 'X-Paper/pulp', 'XI-Textiles', 'XII-Footwear/headgear', 
                  'XIII-Stone/ceramic', 'XIV-Precious metals', 'XV-Base metals', 'XVI-Machinery/electrical', 
                  'XVII-Transport', 'XVIII-Instruments', 'XIX-Arms/ammunition', 'XX-Miscellaneous', 'XXI-Works of art'],
        required: true,
        helpText: 'Section titles are for reference only, but help navigate to relevant chapters. Select all that might apply.',
        legalReference: 'Systematic approach to classification'
      },
      {
        id: 'chapter_analysis',
        question: 'Which chapters within the selected sections are most relevant?',
        type: 'text',
        required: true,
        helpText: 'List chapter numbers and review their notes carefully - chapter notes ARE legally binding',
        legalReference: 'GRI 1 - Chapter notes are legally binding'
      },
      {
        id: 'section_chapter_notes',
        question: 'Are there any Section or Chapter Notes that apply?',
        type: 'multiselect',
        options: ['Exclusion notes', 'Inclusion notes', 'Definition notes', 'Scope notes', 'None apply'],
        required: true,
        helpText: 'These notes have legal priority - check exclusions FIRST before considering headings',
        legalReference: 'GRI 1 - Section and Chapter Notes'
      },
      {
        id: 'heading_match',
        question: 'After considering notes, does the product match specific heading(s)?',
        type: 'select',
        options: ['Yes - Single heading', 'Yes - Multiple headings', 'No - No clear match', 'Excluded by notes'],
        required: true,
        helpText: 'Consider the exact wording of headings within non-excluded chapters only',
        legalReference: 'GRI 1 - Terms of headings'
      },
      {
        id: 'heading_specificity',
        question: 'If heading(s) found, how specific is the description?',
        type: 'select',
        options: ['Names the product specifically', 'Describes the product type', 'General category only', 'Not applicable'],
        required: false,
        helpText: 'Document specificity level for potential GRI 3(a) application',
        legalReference: 'GRI 1 leading to GRI 3(a)'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'heading_match', operator: 'equals', value: 'Yes - Single heading' },
          { field: 'section_chapter_notes', operator: 'not_in', value: ['Exclusion notes'], logic: 'AND' }
        ],
        nextRule: 'validate_heading',
        reasoning: 'Single heading found with no exclusions - validate and proceed to subheading classification'
      },
      {
        conditions: [
          { field: 'heading_match', operator: 'equals', value: 'Yes - Multiple headings' }
        ],
        nextRule: 'gri_3a',
        reasoning: 'Multiple headings possible - must apply GRI 3 to determine most specific'
      },
      {
        conditions: [
          { field: 'heading_match', operator: 'in', value: ['No - No clear match', 'Uncertain - Need more info'] }
        ],
        nextRule: 'analyze_product',
        reasoning: 'No clear heading match - need detailed product analysis'
      }
    ],
    legalNotes: [
      'Section and Chapter Notes are legally binding and override heading descriptions',
      'Heading terms must be interpreted in their legal/technical sense, not colloquial',
      'Consider Explanatory Notes for interpretation guidance (not legally binding but authoritative)'
    ],
    examples: [
      {
        product: 'Smartphone',
        decision: 'Heading 8517 - Telephone sets',
        reasoning: 'Product specifically named in heading as "smartphones"'
      },
      {
        product: 'Wooden chair',
        decision: 'Heading 9401 - Seats',
        reasoning: 'Clear match to heading terms, no exclusion notes apply'
      }
    ]
  },

  'analyze_product': {
    id: 'analyze_product',
    name: 'Detailed Product Analysis',
    description: 'When no clear heading match exists, analyze product characteristics to determine classification approach',
    legalText: 'Systematic analysis required when heading terms are not immediately applicable',
    order: 1.5,
    requiredInputs: ['detailed_description', 'material_composition', 'assembly_state'],
    validationRules: [],
    decisionCriteria: [
      {
        id: 'product_state',
        question: 'What is the state of the product?',
        type: 'select',
        options: ['Complete and finished', 'Incomplete but functional', 'Unfinished', 'Unassembled', 'Parts only'],
        required: true,
        helpText: 'Determines whether GRI 2(a) applies',
        legalReference: 'GRI 2(a) - Incomplete articles'
      },
      {
        id: 'material_complexity',
        question: 'Is the product made of multiple materials?',
        type: 'select',
        options: ['Single material', 'Multiple materials - one dominant', 'Multiple materials - equal importance', 'Composite material'],
        required: true,
        helpText: 'Determines whether GRI 2(b) or 3(b) applies',
        legalReference: 'GRI 2(b) - Mixtures'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'product_state', operator: 'in', value: ['Incomplete but functional', 'Unfinished', 'Unassembled'] }
        ],
        nextRule: 'gri_2a',
        reasoning: 'Product is incomplete/unfinished - apply GRI 2(a)'
      },
      {
        conditions: [
          { field: 'material_complexity', operator: 'not_in', value: ['Single material'] }
        ],
        nextRule: 'gri_2b',
        reasoning: 'Product has multiple materials - apply GRI 2(b)'
      }
    ],
    legalNotes: [],
    examples: []
  },

  'gri_2a': {
    id: 'gri_2a',
    name: 'Incomplete or unfinished articles',
    description: 'Any reference in a heading to an article shall be taken to include a reference to that article incomplete or unfinished, provided that, as presented, the incomplete or unfinished article has the essential character of the complete or finished article',
    legalText: 'It shall also be taken to include a reference to that article complete or finished (or failing to be classified as complete or finished by virtue of this rule), presented unassembled or disassembled.',
    order: 2,
    requiredInputs: ['missing_components', 'functionality_assessment', 'assembly_state'],
    validationRules: [
      {
        field: 'missing_components',
        rule: 'required_list',
        errorMessage: 'Must specify what components are missing',
        validator: (value) => Array.isArray(value) && value.length > 0
      }
    ],
    decisionCriteria: [
      {
        id: 'essential_character_present',
        question: 'Does the incomplete article have the essential character of the complete article?',
        type: 'boolean',
        required: true,
        helpText: 'Essential character means it is recognizable as the complete article and/or can perform the main function',
        legalReference: 'GRI 2(a) - Essential character test'
      },
      {
        id: 'missing_components_critical',
        question: 'Are the missing components critical to the product\'s identity?',
        type: 'select',
        options: ['No - Minor/accessory parts', 'Yes - Major components', 'Mixed - Some critical, some minor'],
        required: true,
        helpText: 'Minor accessories missing typically don\'t affect essential character',
        legalReference: 'GRI 2(a) - Essential character'
      },
      {
        id: 'assembly_presentation',
        question: 'How is the product presented?',
        type: 'select',
        options: ['Assembled', 'Unassembled - all parts present', 'Unassembled - parts missing', 'Partially assembled'],
        required: true,
        helpText: 'Unassembled articles with all parts are classified as complete',
        legalReference: 'GRI 2(a) - Unassembled articles'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'essential_character_present', operator: 'equals', value: true }
        ],
        nextRule: 'gri_1',
        reasoning: 'Has essential character - classify as complete article under GRI 1'
      },
      {
        conditions: [
          { field: 'essential_character_present', operator: 'equals', value: false }
        ],
        nextRule: 'parts_classification',
        reasoning: 'Lacks essential character - classify as parts or materials'
      }
    ],
    legalNotes: [
      'Essential character is determined by what makes the article recognizable',
      'Functionality is key - can it perform its intended purpose?',
      'Unassembled articles are classified as complete if all parts are present'
    ],
    examples: [
      {
        product: 'Car without wheels',
        decision: 'Still classified as a car',
        reasoning: 'Has essential character despite missing wheels - recognizable and main structure intact'
      },
      {
        product: 'Bicycle frame only',
        decision: 'Classified as bicycle parts',
        reasoning: 'Frame alone lacks essential character of complete bicycle'
      }
    ]
  },

  'gri_2b': {
    id: 'gri_2b',
    name: 'Mixtures and composite goods',
    description: 'Any reference in a heading to goods of a given material or substance shall include mixtures or combinations of that material with other materials',
    legalText: 'Any reference to goods consisting of more than one material or substance shall be regarded as referring to goods consisting wholly or partly of such materials or substances. Classification of goods consisting of more than one material or substance shall be according to the principles of rule 3.',
    order: 2,
    requiredInputs: ['material_composition', 'material_percentages', 'material_function'],
    validationRules: [
      {
        field: 'material_percentages',
        rule: 'total_100',
        errorMessage: 'Material percentages must total 100%',
        validator: (value) => {
          if (!Array.isArray(value)) return false
          const total = value.reduce((sum, m) => sum + (m.percentage || 0), 0)
          return Math.abs(total - 100) < 0.01
        }
      }
    ],
    decisionCriteria: [
      {
        id: 'mixture_type',
        question: 'What type of material combination is this?',
        type: 'select',
        options: ['Simple mixture', 'Composite good', 'Assembled from different materials', 'Chemical combination'],
        required: true,
        helpText: 'Determines classification approach',
        legalReference: 'GRI 2(b) - Types of combinations'
      },
      {
        id: 'dominant_material',
        question: 'Is there a clearly dominant material?',
        type: 'select',
        options: ['Yes - By weight', 'Yes - By value', 'Yes - By function', 'No - Materials roughly equal'],
        required: true,
        helpText: 'If one material clearly dominates, may classify by that material',
        legalReference: 'GRI 2(b) leading to GRI 3(b)'
      },
      {
        id: 'heading_coverage',
        question: 'Do any headings specifically cover this combination?',
        type: 'boolean',
        required: true,
        helpText: 'Some headings explicitly cover mixtures or composite goods',
        legalReference: 'GRI 2(b) - Specific mixture headings'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'heading_coverage', operator: 'equals', value: true }
        ],
        nextRule: 'gri_1',
        reasoning: 'Specific heading exists for this mixture/composite - apply GRI 1'
      },
      {
        conditions: [
          { field: 'dominant_material', operator: 'contains', value: 'Yes' }
        ],
        nextRule: 'gri_3b',
        reasoning: 'One material dominates - proceed to essential character analysis'
      },
      {
        conditions: [
          { field: 'dominant_material', operator: 'equals', value: 'No - Materials roughly equal' }
        ],
        nextRule: 'gri_3a',
        reasoning: 'No dominant material - apply GRI 3 principles'
      }
    ],
    legalNotes: [
      'Mixtures may be classified under heading for dominant material if it gives essential character',
      'Composite goods are classified by GRI 3 principles',
      'Some headings specifically provide for mixtures'
    ],
    examples: [
      {
        product: 'Plastic chair with metal legs',
        decision: 'Apply GRI 3 principles',
        reasoning: 'Composite good with multiple materials requiring GRI 3 analysis'
      }
    ]
  },

  'gri_3a': {
    id: 'gri_3a',
    name: 'Most specific description prevails',
    description: 'When goods are prima facie classifiable under two or more headings, the heading which provides the most specific description shall be preferred',
    legalText: 'When by application of rule 2(b) or for any other reason, goods are prima facie classifiable under two or more headings, classification shall be effected as follows: The heading which provides the most specific description shall be preferred to headings providing a more general description.',
    order: 3,
    requiredInputs: ['possible_headings', 'specificity_analysis'],
    validationRules: [
      {
        field: 'possible_headings',
        rule: 'minimum_two',
        errorMessage: 'GRI 3 only applies when multiple headings are possible',
        validator: (value) => Array.isArray(value) && value.length >= 2
      }
    ],
    decisionCriteria: [
      {
        id: 'specificity_comparison',
        question: 'Which heading provides the most specific description?',
        type: 'text',
        required: true,
        helpText: 'Consider: named products > product types > general categories',
        legalReference: 'GRI 3(a) - Specificity hierarchy'
      },
      {
        id: 'named_product',
        question: 'Does any heading mention the product by its specific name?',
        type: 'select',
        options: ['Yes', 'No', 'Partially'],
        required: true,
        helpText: 'A heading that names the product is most specific',
        legalReference: 'GRI 3(a) - Named products'
      },
      {
        id: 'description_completeness',
        question: 'Which heading most completely describes the product?',
        type: 'text',
        required: true,
        helpText: 'More complete descriptions are more specific',
        legalReference: 'GRI 3(a) - Description completeness'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'named_product', operator: 'equals', value: 'Yes' }
        ],
        nextRule: 'validate_heading',
        reasoning: 'Heading specifically names product - most specific description found'
      },
      {
        conditions: [
          { field: 'specificity_comparison', operator: 'equals', value: 'Equal specificity' }
        ],
        nextRule: 'gri_3b',
        reasoning: 'Headings equally specific - proceed to essential character test'
      }
    ],
    legalNotes: [
      'Specificity is relative - compare headings against each other',
      'A heading that identifies products by name is more specific than by class',
      'If headings are equally specific, GRI 3(a) fails and proceed to 3(b)'
    ],
    examples: [
      {
        product: 'Electric toothbrush',
        decision: 'Heading 8509 (electromechanical domestic appliances) over 9603 (brushes)',
        reasoning: 'Heading 8509 more specifically describes the electric nature'
      }
    ]
  },

  'gri_3b': {
    id: 'gri_3b',
    name: 'Essential character determination',
    description: 'Mixtures, composite goods, and goods put up in sets shall be classified according to the material or component which gives them their essential character',
    legalText: 'However, when two or more headings each refer to part only of the materials or substances contained in mixed or composite goods or to part only of the items in a set put up for retail sale, those headings are to be regarded as equally specific in relation to those goods, even if one of them gives a more complete or precise description of the goods.',
    order: 3,
    requiredInputs: ['components_analysis', 'character_factors'],
    validationRules: [],
    decisionCriteria: [
      {
        id: 'character_factor',
        question: 'What factor determines the essential character?',
        type: 'multiselect',
        options: ['Bulk/quantity', 'Weight', 'Value', 'Role in use', 'Marketability', 'Visual impact'],
        required: true,
        helpText: 'Multiple factors may apply - identify the most important',
        legalReference: 'GRI 3(b) - Essential character factors'
      },
      {
        id: 'component_analysis',
        question: 'Which component/material gives the product its essential character?',
        type: 'text',
        required: true,
        helpText: 'Consider what makes the product what it is in the eyes of consumers',
        legalReference: 'GRI 3(b) - Essential character'
      },
      {
        id: 'character_reasoning',
        question: 'Explain why this component gives essential character',
        type: 'text',
        required: true,
        helpText: 'Provide clear reasoning for legal documentation',
        legalReference: 'GRI 3(b) - Documentation requirement'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'component_analysis', operator: 'not_in', value: ['Cannot determine', 'None'] }
        ],
        nextRule: 'validate_heading',
        reasoning: 'Essential character determined - classify by that component'
      },
      {
        conditions: [
          { field: 'component_analysis', operator: 'equals', value: 'Cannot determine' }
        ],
        nextRule: 'gri_3c',
        reasoning: 'No essential character determinable - proceed to GRI 3(c)'
      }
    ],
    legalNotes: [
      'Essential character is what gives the goods their identity',
      'No single factor always determines essential character',
      'Consider commercial reality and consumer perception'
    ],
    examples: [
      {
        product: 'Leather wallet with metal clasp',
        decision: 'Leather gives essential character',
        reasoning: 'Leather provides main function, value, and marketability'
      }
    ]
  },

  'gri_3c': {
    id: 'gri_3c',
    name: 'Last heading in numerical order',
    description: 'When goods cannot be classified by reference to 3(a) or 3(b), they shall be classified under the heading which occurs last in numerical order',
    legalText: 'When goods cannot be classified by reference to 3(a) or 3(b), they shall be classified under the heading which occurs last in numerical order among those which equally merit consideration.',
    order: 3,
    requiredInputs: ['confirmed_headings'],
    validationRules: [
      {
        field: 'confirmed_headings',
        rule: 'all_equal_merit',
        errorMessage: 'Confirm all headings equally merit consideration',
        validator: (value) => Array.isArray(value) && value.length >= 2
      }
    ],
    decisionCriteria: [
      {
        id: 'confirm_3a_failed',
        question: 'Confirm that no heading is more specific (GRI 3a failed)?',
        type: 'boolean',
        required: true,
        helpText: 'Must document why specificity test failed',
        legalReference: 'GRI 3(c) - Prerequisite'
      },
      {
        id: 'confirm_3b_failed',
        question: 'Confirm that no essential character could be determined (GRI 3b failed)?',
        type: 'boolean',
        required: true,
        helpText: 'Must document why essential character test failed',
        legalReference: 'GRI 3(c) - Prerequisite'
      },
      {
        id: 'numerical_order',
        question: 'List all equally applicable headings in numerical order',
        type: 'text',
        required: true,
        helpText: 'The last heading in numerical order will be selected',
        legalReference: 'GRI 3(c) - Last in order'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'confirm_3a_failed', operator: 'equals', value: true },
          { field: 'confirm_3b_failed', operator: 'equals', value: true }
        ],
        nextRule: 'validate_heading',
        reasoning: 'Last heading in numerical order selected per GRI 3(c)'
      }
    ],
    legalNotes: [
      'This is a rule of last resort when other methods fail',
      'Must document why 3(a) and 3(b) could not resolve classification',
      'Ensures consistent classification when other factors are equal'
    ],
    examples: [
      {
        product: 'Product equally described by headings 3920 and 3921',
        decision: 'Classify under 3921',
        reasoning: '3921 occurs last in numerical order'
      }
    ]
  },

  'gri_4': {
    id: 'gri_4',
    name: 'Classification by similarity',
    description: 'Goods which cannot be classified in accordance with the above rules shall be classified under the heading appropriate to the goods to which they are most akin',
    legalText: 'Goods which cannot be classified in accordance with the above rules shall be classified under the heading appropriate to the goods to which they are most akin.',
    order: 4,
    requiredInputs: ['similar_products', 'similarity_analysis'],
    validationRules: [],
    decisionCriteria: [
      {
        id: 'no_heading_confirmation',
        question: 'Confirm that no heading specifically covers this product?',
        type: 'boolean',
        required: true,
        helpText: 'GRI 4 only applies when no heading exists for the product',
        legalReference: 'GRI 4 - Prerequisite'
      },
      {
        id: 'similarity_factors',
        question: 'What factors make other products similar?',
        type: 'multiselect',
        options: ['Function', 'Physical properties', 'Composition', 'Use', 'Manufacturing process', 'Commercial designation'],
        required: true,
        helpText: 'Consider multiple factors for similarity',
        legalReference: 'GRI 4 - Similarity factors'
      },
      {
        id: 'most_similar_product',
        question: 'Which classified product is most similar and why?',
        type: 'text',
        required: true,
        helpText: 'Identify specific product and heading for classification',
        legalReference: 'GRI 4 - Most akin'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'most_similar_product', operator: 'not_in', value: ['None found'] }
        ],
        nextRule: 'validate_heading',
        reasoning: 'Similar product identified - classify under same heading'
      }
    ],
    legalNotes: [
      'Rarely used - most products fit somewhere in the nomenclature',
      'Requires comprehensive search for similar products',
      'Consider function, composition, and use'
    ],
    examples: [
      {
        product: 'New invention with no specific heading',
        decision: 'Classify with most functionally similar product',
        reasoning: 'No heading exists, find most similar by function and use'
      }
    ]
  },

  'gri_5a': {
    id: 'gri_5a',
    name: 'Specially shaped containers',
    description: 'Camera cases, musical instrument cases, gun cases, drawing instrument cases, necklace cases and similar containers, specially shaped or fitted to contain a specific article',
    legalText: 'Camera cases, musical instrument cases, gun cases, drawing instrument cases, necklace cases and similar containers, specially shaped or fitted to contain a specific article or set of articles, suitable for long-term use and entered with the articles for which they are intended, shall be classified with such articles when of a kind normally sold therewith. This rule does not, however, apply to containers which give the whole its essential character.',
    order: 5,
    requiredInputs: ['container_description', 'product_container_relationship'],
    validationRules: [],
    decisionCriteria: [
      {
        id: 'specially_shaped',
        question: 'Is the container specially shaped or fitted for the specific article?',
        type: 'boolean',
        required: true,
        helpText: 'Generic boxes or bags are not "specially shaped"',
        legalReference: 'GRI 5(a) - Specially shaped requirement'
      },
      {
        id: 'long_term_use',
        question: 'Is the container suitable for long-term use?',
        type: 'boolean',
        required: true,
        helpText: 'Disposable packaging does not qualify',
        legalReference: 'GRI 5(a) - Long-term use requirement'
      },
      {
        id: 'normally_sold_together',
        question: 'Is this type of container normally sold with the article?',
        type: 'boolean',
        required: true,
        helpText: 'Consider commercial practice',
        legalReference: 'GRI 5(a) - Normal commercial practice'
      },
      {
        id: 'essential_character_test',
        question: 'Does the container give the whole its essential character?',
        type: 'boolean',
        required: true,
        helpText: 'If yes, classify by the container, not the contents',
        legalReference: 'GRI 5(a) - Essential character exception'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'specially_shaped', operator: 'equals', value: true },
          { field: 'long_term_use', operator: 'equals', value: true },
          { field: 'normally_sold_together', operator: 'equals', value: true },
          { field: 'essential_character_test', operator: 'equals', value: false }
        ],
        nextRule: 'classify_together',
        reasoning: 'Container meets all criteria - classify with the article'
      },
      {
        conditions: [
          { field: 'essential_character_test', operator: 'equals', value: true }
        ],
        nextRule: 'classify_by_container',
        reasoning: 'Container gives essential character - classify by container'
      }
    ],
    legalNotes: [
      'Applies to cases designed for specific articles',
      'Container must be suitable for repetitive use',
      'Does not apply if container is more important than contents'
    ],
    examples: [
      {
        product: 'Violin in a fitted case',
        decision: 'Classify together as violin',
        reasoning: 'Case is specially shaped, long-term use, normally sold together'
      }
    ]
  },

  'gri_5b': {
    id: 'gri_5b',
    name: 'Packing materials and containers',
    description: 'Packing materials and packing containers entered with the goods therein shall be classified with the goods if they are of a kind normally used for packing such goods',
    legalText: 'Subject to the provisions of rule 5(a) above, packing materials and packing containers entered with the goods therein shall be classified with the goods if they are of a kind normally used for packing such goods. However, this provision is not binding when such packing materials or packing containers are clearly suitable for repetitive use.',
    order: 5,
    requiredInputs: ['packing_description', 'reusability_assessment'],
    validationRules: [],
    decisionCriteria: [
      {
        id: 'normal_packing',
        question: 'Is this packing material/container normally used for such goods?',
        type: 'boolean',
        required: true,
        helpText: 'Consider industry standard packaging',
        legalReference: 'GRI 5(b) - Normal use test'
      },
      {
        id: 'repetitive_use',
        question: 'Is the packing clearly suitable for repetitive use?',
        type: 'boolean',
        required: true,
        helpText: 'Reusable containers may be classified separately',
        legalReference: 'GRI 5(b) - Repetitive use exception'
      },
      {
        id: 'packing_value',
        question: 'Is the packing material significant in value relative to the goods?',
        type: 'select',
        options: ['Negligible', 'Minor', 'Significant', 'Exceeds goods value'],
        required: false,
        helpText: 'High-value packaging may warrant separate classification',
        legalReference: 'GRI 5(b) - Value consideration'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'normal_packing', operator: 'equals', value: true },
          { field: 'repetitive_use', operator: 'equals', value: false }
        ],
        nextRule: 'classify_together',
        reasoning: 'Normal packing not suitable for reuse - classify with goods'
      },
      {
        conditions: [
          { field: 'repetitive_use', operator: 'equals', value: true }
        ],
        nextRule: 'classify_separately',
        reasoning: 'Packing suitable for repetitive use - may classify separately'
      }
    ],
    legalNotes: [
      'Normal packing materials are classified with the goods',
      'Reusable containers may be classified separately',
      'Consider commercial practice and value'
    ],
    examples: [
      {
        product: 'Shoes in a cardboard box',
        decision: 'Classify together as shoes',
        reasoning: 'Cardboard box is normal packing, not reusable'
      },
      {
        product: 'Chemicals in returnable metal drums',
        decision: 'May classify drums separately',
        reasoning: 'Metal drums clearly suitable for repetitive use'
      }
    ]
  },

  'gri_6': {
    id: 'gri_6',
    name: 'Subheading classification',
    description: 'For legal purposes, the classification of goods in the subheadings of a heading shall be determined according to the terms of those subheadings and any related subheading notes',
    legalText: 'For legal purposes, the classification of goods in the subheadings of a heading shall be determined according to the terms of those subheadings and any related subheading notes and, mutatis mutandis, to the above rules, on the understanding that only subheadings at the same level are comparable. For the purposes of this rule, the relative section and chapter notes also apply, unless the context otherwise requires.',
    order: 6,
    requiredInputs: ['heading_determined', 'subheading_analysis'],
    validationRules: [
      {
        field: 'heading_determined',
        rule: 'valid_heading',
        errorMessage: 'Must have determined 4-digit heading before applying GRI 6',
        validator: (value) => value && /^\d{4}$/.test(value)
      }
    ],
    decisionCriteria: [
      {
        id: 'subheading_level',
        question: 'What level of classification are you determining?',
        type: 'select',
        options: ['6-digit subheading', '8-digit tariff item', '10-digit statistical'],
        required: true,
        helpText: 'Work through each level sequentially',
        legalReference: 'GRI 6 - Level by level'
      },
      {
        id: 'subheading_notes',
        question: 'Are there any subheading notes that apply?',
        type: 'boolean',
        required: true,
        helpText: 'Subheading notes have same legal force as heading notes',
        legalReference: 'GRI 6 - Subheading notes'
      },
      {
        id: 'gri_application',
        question: 'Which GRI principle applies at this subheading level?',
        type: 'select',
        options: ['GRI 1 - Clear match', 'GRI 3(a) - Most specific', 'GRI 3(b) - Essential character', 'GRI 3(c) - Last in order'],
        required: true,
        helpText: 'Apply GRI 1-5 within each level',
        legalReference: 'GRI 6 - Mutatis mutandis'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'subheading_level', operator: 'equals', value: '10-digit statistical' }
        ],
        nextRule: 'classification_complete',
        reasoning: 'Full classification code determined'
      },
      {
        conditions: [
          { field: 'subheading_level', operator: 'not_in', value: ['10-digit statistical'] }
        ],
        nextRule: 'gri_6',
        reasoning: 'Continue to next subheading level'
      }
    ],
    legalNotes: [
      'Only compare subheadings at the same level',
      'Apply GRI 1-5 at each level independently',
      'Work from 4-digit to 6-digit to 8-digit sequentially'
    ],
    examples: [
      {
        product: 'Within heading 8471 (computers)',
        decision: 'Apply GRI to choose between 8471.30 (portable) vs 8471.41 (other)',
        reasoning: 'Compare only one-dash subheadings first'
      }
    ]
  },

  'validate_heading': {
    id: 'validate_heading',
    name: 'Validate Classification',
    description: 'Final validation of the determined classification',
    legalText: 'Ensure classification complies with all applicable rules and notes',
    order: 7,
    requiredInputs: ['proposed_classification', 'validation_checklist'],
    validationRules: [],
    decisionCriteria: [
      {
        id: 'section_notes_check',
        question: 'Have all applicable section and chapter notes been considered?',
        type: 'boolean',
        required: true,
        helpText: 'Review all exclusions and inclusions',
        legalReference: 'Validation requirement'
      },
      {
        id: 'gri_sequence_check',
        question: 'Were GRI rules applied in correct sequence?',
        type: 'boolean',
        required: true,
        helpText: 'Confirm rules were not skipped',
        legalReference: 'Sequential application requirement'
      },
      {
        id: 'documentation_complete',
        question: 'Is all reasoning and evidence documented?',
        type: 'boolean',
        required: true,
        helpText: 'Required for legal defensibility',
        legalReference: 'Documentation requirement'
      }
    ],
    nextSteps: [
      {
        conditions: [
          { field: 'section_notes_check', operator: 'equals', value: true },
          { field: 'gri_sequence_check', operator: 'equals', value: true },
          { field: 'documentation_complete', operator: 'equals', value: true }
        ],
        nextRule: 'gri_6',
        reasoning: 'Heading validated - proceed to subheading classification'
      }
    ],
    legalNotes: [
      'Final check ensures defensible classification',
      'All decisions must be traceable',
      'Documentation is crucial for disputes'
    ],
    examples: []
  }
}

// Enhanced GRI Engine Class
export class WCOCompliantGRIEngine {
  private context: GRIContext
  private currentRuleId: string
  
  constructor(initialContext: Partial<GRIContext>) {
    this.context = {
      classificationId: initialContext.classificationId || '',
      productDescription: initialContext.productDescription || '',
      currentRule: 'pre_classification',
      decisions: [],
      ...initialContext
    }
    this.currentRuleId = 'pre_classification'
  }
  
  getCurrentRule(): GRIRule {
    return COMPLETE_GRI_RULES[this.currentRuleId]
  }
  
  validateRule(rule: GRIRule): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    for (const validationRule of rule.validationRules) {
      const value = this.getFieldValue(validationRule.field)
      if (!validationRule.validator(value, this.context)) {
        errors.push(validationRule.errorMessage)
      }
    }
    
    return { valid: errors.length === 0, errors }
  }
  
  private getFieldValue(field: string): any {
    // Get value from context or decisions
    const decision = this.context.decisions.find(d => d.criterionId === field)
    return decision?.answer
  }
  
  recordDecision(decision: Omit<GRIDecision, 'timestamp' | 'hash'>): void {
    const fullDecision: GRIDecision = {
      ...decision,
      timestamp: new Date(),
      hash: this.generateDecisionHash(decision)
    }
    
    this.context.decisions.push(fullDecision)
  }
  
  private generateDecisionHash(decision: Omit<GRIDecision, 'timestamp' | 'hash'>): string {
    const content = JSON.stringify({
      ruleId: decision.ruleId,
      criterionId: decision.criterionId,
      answer: decision.answer,
      reasoning: decision.reasoning,
      classificationId: this.context.classificationId
    })
    
    return createHash('sha256').update(content).digest('hex')
  }
  
  determineNextStep(): string | null {
    const currentRule = this.getCurrentRule()
    
    for (const nextStep of currentRule.nextSteps) {
      if (this.evaluateConditions(nextStep.conditions)) {
        return nextStep.nextRule
      }
    }
    
    return null
  }
  
  private evaluateConditions(conditions: Condition[]): boolean {
    let result = true
    let useOR = false
    
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(condition.field)
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value)
      
      if (condition.logic === 'OR') {
        useOR = true
        result = result || conditionMet
      } else {
        result = useOR ? result || conditionMet : result && conditionMet
      }
    }
    
    return result
  }
  
  private evaluateCondition(fieldValue: any, operator: string, value: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'contains':
        return String(fieldValue).includes(String(value))
      case 'greater_than':
        return Number(fieldValue) > Number(value)
      case 'less_than':
        return Number(fieldValue) < Number(value)
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)
      case 'not_in':
        return !Array.isArray(value) || !value.includes(fieldValue)
      default:
        return false
    }
  }
  
  moveToNextRule(nextRuleId: string): void {
    if (COMPLETE_GRI_RULES[nextRuleId]) {
      this.currentRuleId = nextRuleId
      this.context.currentRule = nextRuleId
    } else {
      throw new Error(`Invalid rule ID: ${nextRuleId}`)
    }
  }
  
  getProgress(): number {
    const currentOrder = this.getCurrentRule().order
    const maxOrder = Math.max(...Object.values(COMPLETE_GRI_RULES).map(r => r.order))
    return (currentOrder / maxOrder) * 100
  }
  
  exportContext(): GRIContext {
    return { ...this.context }
  }
  
  getDecisionAuditTrail(): Array<{
    ruleId: string
    ruleName: string
    decisions: GRIDecision[]
    timestamp: Date
  }> {
    const trail: Array<any> = []
    const ruleIds = [...new Set(this.context.decisions.map(d => d.ruleId))]
    
    for (const ruleId of ruleIds) {
      const rule = COMPLETE_GRI_RULES[ruleId]
      const decisions = this.context.decisions.filter(d => d.ruleId === ruleId)
      
      trail.push({
        ruleId,
        ruleName: rule?.name || 'Unknown',
        decisions,
        timestamp: decisions[0]?.timestamp || new Date()
      })
    }
    
    return trail
  }
  
  generateLegalBasis(): string[] {
    const legalBasis: string[] = []
    
    for (const decision of this.context.decisions) {
      const rule = COMPLETE_GRI_RULES[decision.ruleId]
      if (rule) {
        legalBasis.push(`${rule.name}: ${rule.legalText}`)
        if (decision.legalBasis.length > 0) {
          legalBasis.push(...decision.legalBasis)
        }
      }
    }
    
    return [...new Set(legalBasis)]
  }
}