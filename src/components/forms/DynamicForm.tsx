'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormField from './FormField'

interface DynamicFormProps {
  formType: string
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'select' | 'radio'
    required?: boolean
    options?: Array<{ value: string; label: string }>
    validation?: any
  }>
  onSubmit: (data: any) => void
  onCancel?: () => void
}

export default function DynamicForm({ 
  formType, 
  fields, 
  onSubmit, 
  onCancel 
}: DynamicFormProps) {
  // Dynamically create Zod schema based on fields
  const createSchema = () => {
    const schemaFields: Record<string, any> = {}
    
    fields.forEach(field => {
      let fieldSchema: any
      
      if (field.type === 'number') {
        fieldSchema = field.required 
          ? z.number().min(0, 'This field is required')
          : z.number().optional()
      } else {
        fieldSchema = field.required
          ? z.string().min(1, 'This field is required')
          : z.string().optional()
      }
      
      schemaFields[field.name] = fieldSchema
    })
    
    return z.object(schemaFields)
  }

  const schema = createSchema()
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const handleFormSubmit = async (data: FormData) => {
    // TODO: Add timestamp and metadata for legal record
    const submissionData = {
      ...data,
      formType,
      submittedAt: new Date().toISOString(),
    }
    onSubmit(submissionData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="text-lg font-semibold text-legal-blue mb-4">
        {formType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </div>
      
      {fields.map((field) => (
        <FormField
          key={field.name}
          field={field}
          register={register}
          error={errors[field.name]}
        />
      ))}
      
      <div className="flex space-x-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-legal-blue text-white rounded hover:bg-opacity-90 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-legal-gray text-legal-gray rounded hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
      
      <div className="text-xs text-legal-gray mt-2">
        This information will be recorded as part of your classification audit trail
      </div>
    </form>
  )
}