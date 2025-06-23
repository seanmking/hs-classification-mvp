import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

// TODO: Import LLM client and database
// import { llamaClient } from '@/lib/llm/llama-client'
// import { db } from '@/lib/db/client'
// import { chatMessages, decisions } from '@/db/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      message, 
      classificationId, 
      context,
      currentStep 
    } = body

    // TODO: Save user message to database
    const userMessageId = `msg_${nanoid()}`
    // await db.insert(chatMessages).values({
    //   id: userMessageId,
    //   classificationId,
    //   role: 'user',
    //   content: message,
    //   createdAt: new Date(),
    // })

    // TODO: Generate LLM response based on context and GRI rules
    // const llmResponse = await llamaClient.chat({
    //   messages: context.messages,
    //   systemPrompt: generateSystemPrompt(currentStep),
    //   temperature: 0.3, // Lower temperature for legal accuracy
    // })

    // Mock LLM response
    const llmResponse = {
      content: `I understand you're asking about "${message}". Based on GRI Rule ${currentStep}, I need to gather some specific information to proceed with the classification. Let me help you through this step.`,
      suggestedAction: {
        type: 'form',
        formType: 'product_details',
        fields: ['material_composition', 'primary_function']
      },
      confidence: 0.85,
      griReference: `GRI ${currentStep}`
    }

    // TODO: Save assistant message to database
    const assistantMessageId = `msg_${nanoid()}`
    // await db.insert(chatMessages).values({
    //   id: assistantMessageId,
    //   classificationId,
    //   role: 'assistant',
    //   content: llmResponse.content,
    //   metadata: {
    //     confidence: llmResponse.confidence,
    //     griReference: llmResponse.griReference,
    //     suggestedAction: llmResponse.suggestedAction,
    //   },
    //   createdAt: new Date(),
    // })

    // TODO: If this represents a decision point, record it
    if (llmResponse.suggestedAction?.type === 'decision') {
      // await db.insert(decisions).values({
      //   id: `dec_${nanoid()}`,
      //   classificationId,
      //   step: currentStep,
      //   question: llmResponse.suggestedAction.question,
      //   options: llmResponse.suggestedAction.options,
      //   timestamp: new Date(),
      // })
    }

    return NextResponse.json({
      message: llmResponse.content,
      messageId: assistantMessageId,
      suggestedAction: llmResponse.suggestedAction,
      confidence: llmResponse.confidence,
      griReference: llmResponse.griReference,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// Helper function to generate system prompts based on GRI step
function generateSystemPrompt(step: string): string {
  const prompts: Record<string, string> = {
    'gri_1': `You are a customs classification expert applying GRI Rule 1. 
      Focus on: Classification according to terms of headings and section/chapter notes.
      Guide the user to identify the product's essential character and primary function.
      Always cite specific heading numbers when relevant.`,
    'gri_2a': `You are applying GRI Rule 2(a) regarding incomplete/unfinished articles.
      Determine if the incomplete article has the essential character of the complete article.
      Ask about missing components and their impact on functionality.`,
    'gri_2b': `You are applying GRI Rule 2(b) regarding mixtures and composite goods.
      Focus on material composition percentages and which material gives essential character.
      Request specific material breakdowns by weight or value.`,
    'gri_3a': `You are applying GRI Rule 3(a) - specific over general descriptions.
      Compare multiple possible headings and identify which provides the most specific description.
      Explain why one heading is more specific than others.`,
    'gri_3b': `You are applying GRI Rule 3(b) - essential character determination.
      Analyze which component gives the product its essential character.
      Consider factors: bulk, quantity, weight, value, or role in use.`,
    'gri_3c': `You are applying GRI Rule 3(c) - last heading in numerical order.
      This rule only applies when 3(a) and 3(b) cannot determine classification.
      List all applicable headings in numerical order.`,
    'gri_4': `You are applying GRI Rule 4 - goods not covered by any heading.
      Classify according to the heading for the most similar goods.
      Identify comparable products and explain similarities.`,
    'gri_5': `You are applying GRI Rule 5 regarding cases, containers, and packing.
      Determine if packaging should be classified with the goods or separately.
      Consider if packaging is suitable for repetitive use.`,
    'gri_6': `You are applying GRI Rule 6 - subheading classification.
      Apply GRI 1-5 at the subheading level within the same heading.
      Work through 4-digit to 6-digit to 8-digit classifications systematically.`,
  }
  
  return prompts[step] || prompts['gri_1']
}