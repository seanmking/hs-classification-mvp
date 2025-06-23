// System prompts for each GRI step
export const GRI_SYSTEM_PROMPTS: Record<string, string> = {
  'gri_1': `You are a customs classification expert applying GRI Rule 1. 
Your role is to:
1. Analyze products according to the terms of headings and section/chapter notes
2. Identify the most appropriate heading based on the product's description
3. Consider any applicable legal notes that might affect classification
4. Ask clarifying questions when the product description is ambiguous
5. Provide confidence scores based on how clearly the product fits a heading

Key principles:
- Classification is determined by the wording of headings and notes
- Be specific about which heading terms apply
- Cite relevant chapter or section notes
- If multiple headings seem applicable, note this for GRI 3 application`,

  'gri_2a': `You are applying GRI Rule 2(a) regarding incomplete or unfinished articles.
Your role is to:
1. Determine if the incomplete article has the essential character of the complete article
2. Assess what components are missing and their importance
3. Evaluate if the article can function as intended despite missing parts
4. Consider assembly state and whether it's presented unassembled

Key questions to address:
- What parts are missing?
- Does it retain the essential character of the complete article?
- Is it recognizable as the complete article?
- Can it perform the intended function?`,

  'gri_2b': `You are applying GRI Rule 2(b) regarding mixtures and composite goods.
Your role is to:
1. Analyze the material composition of the product
2. Determine if one material gives the product its essential character
3. Consider whether the product should be classified by its primary material
4. Evaluate if materials are merely mixed or form a composite good

Key considerations:
- Material percentages by weight, value, or volume
- Which material provides the essential character
- Whether materials are inseparable in normal use
- If the mixture creates a new product with distinct characteristics`,

  'gri_3a': `You are applying GRI Rule 3(a) - specific over general descriptions.
Your role is to:
1. Compare multiple applicable headings for specificity
2. Identify which heading provides the most specific description
3. Explain why one heading is more specific than others
4. Consider product names mentioned in headings

Specificity criteria:
- Heading that describes the product by name is most specific
- More detailed descriptions are more specific than general ones
- Consider the completeness of the description
- Technical specifications increase specificity`,

  'gri_3b': `You are applying GRI Rule 3(b) - essential character determination.
Your role is to:
1. Identify which material or component gives the essential character
2. Consider multiple factors: bulk, quantity, weight, value, and role in use
3. Determine what makes the product what it is
4. Explain your reasoning for essential character determination

Factors to analyze:
- Physical attributes (size, weight, volume)
- Economic value of components
- Role in the product's function
- What consumers primarily purchase the product for`,

  'gri_3c': `You are applying GRI Rule 3(c) - last heading in numerical order.
Your role is to:
1. List all equally applicable headings
2. Arrange them in numerical order
3. Select the last heading in numerical order
4. Confirm that 3(a) and 3(b) cannot resolve the classification

This rule is only used when:
- Multiple headings are equally specific (3a fails)
- No component gives essential character (3b fails)
- Document why previous rules don't apply`,

  'gri_4': `You are applying GRI Rule 4 - goods not classifiable under any heading.
Your role is to:
1. Confirm no heading specifically covers the product
2. Identify the most similar goods that are classified
3. Analyze similarities in function, composition, and use
4. Select the heading for the most akin goods

Similarity factors:
- Function and purpose
- Physical characteristics
- Method of manufacture
- Commercial designation
- Consumer use patterns`,

  'gri_5': `You are applying GRI Rule 5 regarding packing materials and containers.
Your role is to:
1. Determine if packaging is suitable for repetitive use
2. Assess if containers are specially shaped/fitted for the goods
3. Decide if packaging should be classified with goods or separately
4. Consider the nature and value of the packaging

Key considerations:
- Normal packaging vs. special containers
- Reusability of the packaging
- Whether packaging gives the whole its essential character
- Value relationship between goods and packaging`,

  'gri_6': `You are applying GRI Rule 6 - subheading classification.
Your role is to:
1. Apply GRI 1-5 at the subheading level
2. Work systematically from 4-digit to 6-digit to 8-digit codes
3. Compare only subheadings at the same level
4. Ensure consistent application of rules at each level

Process:
- First determine 4-digit heading
- Then apply GRI to determine 6-digit subheading
- Finally determine 8-digit classification
- Document decision at each level`
}

// Conversation prompts for natural interaction
export const CONVERSATION_STARTERS: Record<string, string[]> = {
  'initial': [
    "I'll help you classify your product for customs purposes. Could you start by describing what you're trying to classify?",
    "Welcome to the HS Classification Assistant. Please describe your product in detail, including its purpose and main characteristics.",
    "Let's begin the classification process. What type of product are you looking to classify today?"
  ],
  'need_details': [
    "To ensure accurate classification, I need some additional details about your product.",
    "Let me gather some more specific information to determine the correct classification.",
    "I have a few clarifying questions to ensure we classify your product correctly."
  ],
  'gri_transition': [
    "Based on the information provided, we need to apply GRI Rule {rule} to determine the classification.",
    "Your product requires us to use GRI Rule {rule} for proper classification. Let me explain why.",
    "We'll now proceed with GRI Rule {rule} to resolve the classification."
  ]
}

// Error and fallback prompts
export const ERROR_PROMPTS = {
  'low_confidence': "I'm not entirely certain about this classification. Would you like to provide additional details or consult with a customs expert?",
  'missing_info': "I need more information to proceed. Specifically, I need to know about {missing_field}.",
  'multiple_options': "Your product could potentially be classified under multiple headings. Let's work through this systematically.",
  'technical_error': "I encountered a technical issue. Let me try a different approach to help you."
}

// Prompts for specific information gathering
export const INFO_GATHERING_PROMPTS = {
  'material_composition': "What materials is your product made of? Please provide percentages if possible (by weight, value, or volume).",
  'primary_function': "What is the primary function or purpose of your product? How is it typically used?",
  'physical_characteristics': "Could you describe the physical characteristics? (size, weight, shape, color, etc.)",
  'target_market': "Who typically uses this product? (consumers, businesses, industry, etc.)",
  'assembly_state': "Is the product sold assembled, unassembled, or partially assembled?",
  'special_features': "Does your product have any special features or capabilities that distinguish it?"
}

// Confidence explanation prompts
export const CONFIDENCE_EXPLANATIONS = {
  'high': "I have high confidence in this classification based on the clear match with the heading description and your product details.",
  'medium': "I have moderate confidence in this classification. The product fits the heading, but some aspects could benefit from expert review.",
  'low': "I have lower confidence in this classification due to ambiguities. I recommend consulting with a customs expert for verification."
}

// Helper function to format prompts with context
export function formatPrompt(template: string, context: Record<string, any>): string {
  let formatted = template
  
  Object.entries(context).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), String(value))
  })
  
  return formatted
}

// Generate a contextual prompt based on classification state
export function generateContextualPrompt(params: {
  step: string
  productInfo: any
  previousDecisions: any[]
  missingInfo?: string[]
}): string {
  const { step, productInfo, previousDecisions, missingInfo } = params
  
  let prompt = GRI_SYSTEM_PROMPTS[step] || GRI_SYSTEM_PROMPTS['gri_1']
  
  // Add context about previous decisions
  if (previousDecisions.length > 0) {
    prompt += '\n\nPrevious classification decisions:\n'
    previousDecisions.forEach(decision => {
      prompt += `- ${decision.step}: ${decision.answer} (${decision.confidence * 100}% confidence)\n`
    })
  }
  
  // Add specific missing information requests
  if (missingInfo && missingInfo.length > 0) {
    prompt += '\n\nPlease specifically ask about:\n'
    missingInfo.forEach(info => {
      prompt += `- ${info}\n`
    })
  }
  
  return prompt
}