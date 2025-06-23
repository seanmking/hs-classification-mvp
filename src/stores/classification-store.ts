import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Classification, Decision, Material } from '@/types/classification'

// TODO: Zustand store for classification state
// Track:
// 1. Current GRI step
// 2. Product information
// 3. Decisions made
// 4. Classification path
// 5. Confidence scores
// 6. Required documents

interface ClassificationState {
  // Current classification data
  classificationId: string | null
  productDescription: string
  currentStep: string
  status: 'idle' | 'in_progress' | 'completed' | 'error'
  
  // Decisions and progress
  decisions: Decision[]
  completedSteps: string[]
  
  // Product details
  materials: Material[]
  productDetails: Record<string, any>
  
  // Results
  finalHsCode: string | null
  confidence: number | null
  
  // Actions
  initializeClassification: (id: string, description: string) => void
  updateCurrentStep: (step: string) => void
  addDecision: (decision: Decision) => void
  setMaterials: (materials: Material[]) => void
  updateProductDetails: (details: Record<string, any>) => void
  completeClassification: (hsCode: string, confidence: number) => void
  reset: () => void
  
  // Computed values
  getProgress: () => number
  canProceedToStep: (step: string) => boolean
  getDecisionByStep: (step: string) => Decision | undefined
}

const initialState = {
  classificationId: null,
  productDescription: '',
  currentStep: 'gri_1',
  status: 'idle' as const,
  decisions: [],
  completedSteps: [],
  materials: [],
  productDetails: {},
  finalHsCode: null,
  confidence: null,
}

export const useClassificationStore = create<ClassificationState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      initializeClassification: (id, description) => {
        set({
          classificationId: id,
          productDescription: description,
          status: 'in_progress',
          currentStep: 'gri_1',
        })
      },
      
      updateCurrentStep: (step) => {
        set((state) => ({
          currentStep: step,
          completedSteps: [...state.completedSteps, state.currentStep].filter(
            (s, i, arr) => arr.indexOf(s) === i // Remove duplicates
          ),
        }))
      },
      
      addDecision: (decision) => {
        set((state) => ({
          decisions: [...state.decisions, decision],
        }))
        
        // Persist to database
        // TODO: Call API to save decision
      },
      
      setMaterials: (materials) => {
        set({ materials })
      },
      
      updateProductDetails: (details) => {
        set((state) => ({
          productDetails: { ...state.productDetails, ...details },
        }))
      },
      
      completeClassification: (hsCode, confidence) => {
        set({
          finalHsCode: hsCode,
          confidence,
          status: 'completed',
        })
      },
      
      reset: () => {
        set(initialState)
      },
      
      getProgress: () => {
        const state = get()
        const totalSteps = 9 // GRI 1-6 plus subheadings
        const completed = state.completedSteps.length
        return (completed / totalSteps) * 100
      },
      
      canProceedToStep: (step) => {
        const state = get()
        
        // Define step dependencies
        const stepDependencies: Record<string, string[]> = {
          'gri_2a': ['gri_1'],
          'gri_2b': ['gri_1'],
          'gri_3a': ['gri_1', 'gri_2a', 'gri_2b'],
          'gri_3b': ['gri_3a'],
          'gri_3c': ['gri_3b'],
          'gri_4': ['gri_1', 'gri_2a', 'gri_2b', 'gri_3a', 'gri_3b', 'gri_3c'],
          'gri_5': ['gri_1'],
          'gri_6': ['gri_1'],
        }
        
        const required = stepDependencies[step] || []
        return required.every(dep => state.completedSteps.includes(dep))
      },
      
      getDecisionByStep: (step) => {
        const state = get()
        return state.decisions.find(d => d.step === step)
      },
    }),
    {
      name: 'classification-storage',
      partialize: (state) => ({
        classificationId: state.classificationId,
        productDescription: state.productDescription,
        currentStep: state.currentStep,
        decisions: state.decisions,
        completedSteps: state.completedSteps,
        materials: state.materials,
        productDetails: state.productDetails,
      }),
    }
  )
)