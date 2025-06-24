'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'

interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
  helpText?: string
}

interface DynamicFormProps {
  formType: string
  onSubmit: (data: any) => void
  onCancel: () => void
  context?: {
    griRule?: string
    classificationId?: string
  }
}

// Form configurations for different types
const formConfigs: Record<string, { title: string; fields: FormField[] }> = {
  product_details: {
    title: 'Product Information',
    fields: [
      {
        name: 'physicalDescription',
        label: 'Physical Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the physical characteristics, appearance, and dimensions',
        validation: { minLength: 50 },
        helpText: 'Provide detailed physical characteristics including size, shape, color, and construction'
      },
      {
        name: 'materials',
        label: 'Materials/Composition',
        type: 'textarea',
        required: true,
        placeholder: 'List all materials and their percentages if known',
        helpText: 'Include all materials by weight or value percentage'
      },
      {
        name: 'function',
        label: 'Primary Function',
        type: 'text',
        required: true,
        placeholder: 'What is the main purpose of this product?'
      },
      {
        name: 'intendedUse',
        label: 'Intended Use',
        type: 'textarea',
        required: true,
        placeholder: 'How will this product be used by the end consumer?'
      },
      {
        name: 'commercialName',
        label: 'Commercial/Trade Name',
        type: 'text',
        required: false,
        placeholder: 'Brand name or common trade name'
      },
      {
        name: 'technicalSpecs',
        label: 'Technical Specifications',
        type: 'textarea',
        required: false,
        placeholder: 'Any relevant technical details, certifications, or standards'
      }
    ]
  },
  section_selection: {
    title: 'Section and Chapter Analysis',
    fields: [
      {
        name: 'possibleSections',
        label: 'Potentially Applicable Sections',
        type: 'checkbox',
        required: true,
        options: [
          { value: 'S1', label: 'Section I - Live Animals; Animal Products' },
          { value: 'S2', label: 'Section II - Vegetable Products' },
          { value: 'S3', label: 'Section III - Animal or Vegetable Fats and Oils' },
          { value: 'S4', label: 'Section IV - Prepared Foodstuffs' },
          { value: 'S6', label: 'Section VI - Products of Chemical Industries' },
          { value: 'S7', label: 'Section VII - Plastics and Rubber' },
          { value: 'S11', label: 'Section XI - Textiles and Textile Articles' },
          { value: 'S15', label: 'Section XV - Base Metals' },
          { value: 'S16', label: 'Section XVI - Machinery and Electrical Equipment' },
          { value: 'S17', label: 'Section XVII - Vehicles and Transport Equipment' },
          { value: 'S18', label: 'Section XVIII - Optical and Medical Instruments' },
          { value: 'S20', label: 'Section XX - Miscellaneous Manufactured Articles' }
        ],
        helpText: 'Select all sections that might apply to your product'
      },
      {
        name: 'excludedBySectionNotes',
        label: 'Are there any Section Notes that exclude this product?',
        type: 'radio',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'unsure', label: 'Unsure' }
        ]
      },
      {
        name: 'exclusionDetails',
        label: 'Exclusion Details (if any)',
        type: 'textarea',
        required: false,
        placeholder: 'Describe any exclusions that might apply'
      }
    ]
  },
  essential_character: {
    title: 'Essential Character Analysis',
    fields: [
      {
        name: 'components',
        label: 'List All Components',
        type: 'textarea',
        required: true,
        placeholder: 'List each component and its approximate percentage by value or weight',
        helpText: 'Essential character determination requires complete component analysis'
      },
      {
        name: 'primaryComponent',
        label: 'Which Component Gives Essential Character?',
        type: 'text',
        required: true,
        placeholder: 'Identify the most important component'
      },
      {
        name: 'characterFactors',
        label: 'Factors Determining Essential Character',
        type: 'checkbox',
        required: true,
        options: [
          { value: 'value', label: 'Value (monetary worth)' },
          { value: 'weight', label: 'Weight or quantity' },
          { value: 'volume', label: 'Volume or bulk' },
          { value: 'function', label: 'Role in product function' },
          { value: 'marketability', label: 'Marketability factor' },
          { value: 'consumer', label: 'Consumer perception' }
        ]
      },
      {
        name: 'justification',
        label: 'Justification',
        type: 'textarea',
        required: true,
        placeholder: 'Explain why this component gives the essential character',
        validation: { minLength: 50 }
      }
    ]
  }
}

export default function DynamicForm({ formType, onSubmit, onCancel, context }: DynamicFormProps) {
  const config = formConfigs[formType]
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!config) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Unknown form type: {formType}</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    )
  }

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && !value) {
      return `${field.label} is required`
    }

    if (field.validation) {
      if (field.type === 'text' || field.type === 'textarea') {
        const strValue = String(value || '')
        if (field.validation.minLength && strValue.length < field.validation.minLength) {
          return `${field.label} must be at least ${field.validation.minLength} characters`
        }
        if (field.validation.maxLength && strValue.length > field.validation.maxLength) {
          return `${field.label} must be no more than ${field.validation.maxLength} characters`
        }
        if (field.validation.pattern && !new RegExp(field.validation.pattern).test(strValue)) {
          return `${field.label} format is invalid`
        }
      }

      if (field.type === 'number') {
        const numValue = Number(value)
        if (field.validation.min !== undefined && numValue < field.validation.min) {
          return `${field.label} must be at least ${field.validation.min}`
        }
        if (field.validation.max !== undefined && numValue > field.validation.max) {
          return `${field.label} must be no more than ${field.validation.max}`
        }
      }
    }

    if (field.type === 'checkbox' && field.required && (!value || !Object.values(value).some(v => v))) {
      return `At least one ${field.label.toLowerCase()} must be selected`
    }

    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const newErrors: Record<string, string> = {}
    config.fields.forEach(field => {
      const error = validateField(field, formData[field.name])
      if (error) {
        newErrors[field.name] = error
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Add context to submission
    const submissionData = {
      ...formData,
      _metadata: {
        formType,
        submittedAt: new Date().toISOString(),
        context
      }
    }

    onSubmit(submissionData)
  }

  const handleFieldChange = (field: FormField, value: any) => {
    setFormData(prev => ({ ...prev, [field.name]: value }))
    // Clear error when field is changed
    if (errors[field.name]) {
      setErrors(prev => ({ ...prev, [field.name]: '' }))
    }
  }

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'textarea':
        return (
          <textarea
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      case 'select':
        return (
          <select
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData[field.name]?.[option.value] || false}
                  onChange={(e) => {
                    const newValue = { ...(formData[field.name] || {}), [option.value]: e.target.checked }
                    handleFieldChange(field, newValue)
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={formData[field.name] === option.value}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'number':
        return (
          <input
            type="number"
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{config.title}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {config.fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
            {errors[field.name] && (
              <p className="mt-1 text-xs text-red-600">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-xs text-gray-500">
          This information will be recorded for legal compliance
        </p>
        <div className="space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </div>
      </div>
    </form>
  )
}