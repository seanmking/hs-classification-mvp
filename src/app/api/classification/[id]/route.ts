import { NextRequest, NextResponse } from 'next/server'

// TODO: Import database and services
// import { db } from '@/lib/db/client'
// import { classifications, classificationSteps, decisions } from '@/db/schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classificationId = params.id

    // TODO: Fetch classification with all related data
    // const classification = await db.query.classifications.findFirst({
    //   where: eq(classifications.id, classificationId),
    //   with: {
    //     steps: true,
    //     decisions: true,
    //   }
    // })

    // Mock response
    const classification = {
      id: classificationId,
      productDescription: 'Sample product',
      status: 'in_progress',
      currentStep: 'gri_1',
      steps: [],
      decisions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (!classification) {
      return NextResponse.json(
        { error: 'Classification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ classification })
  } catch (error) {
    console.error('Failed to fetch classification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classification' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classificationId = params.id
    const updates = await request.json()

    // TODO: Update classification in database
    // await db.update(classifications)
    //   .set({ ...updates, updatedAt: new Date() })
    //   .where(eq(classifications.id, classificationId))

    // TODO: If updating current step, create step record
    if (updates.currentStep) {
      // await db.insert(classificationSteps).values({
      //   classificationId,
      //   step: updates.currentStep,
      //   startedAt: new Date(),
      // })
    }

    return NextResponse.json({ 
      success: true,
      classificationId,
      updates 
    })
  } catch (error) {
    console.error('Failed to update classification:', error)
    return NextResponse.json(
      { error: 'Failed to update classification' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classificationId = params.id

    // TODO: Soft delete or archive classification
    // await db.update(classifications)
    //   .set({ status: 'archived', archivedAt: new Date() })
    //   .where(eq(classifications.id, classificationId))

    return NextResponse.json({ 
      success: true,
      message: 'Classification archived successfully' 
    })
  } catch (error) {
    console.error('Failed to delete classification:', error)
    return NextResponse.json(
      { error: 'Failed to delete classification' },
      { status: 500 }
    )
  }
}