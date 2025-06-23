import { UseFormRegister } from 'react-hook-form'

interface FormFieldProps {
  field: {
    name: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'select' | 'radio'
    required?: boolean
    options?: Array<{ value: string; label: string }>
    placeholder?: string
  }
  register: UseFormRegister<any>
  error?: any
}

export default function FormField({ field, register, error }: FormFieldProps) {
  const baseInputClasses = "w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue text-gray-900 bg-white"

  const renderField = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...register(field.name)}
            rows={4}
            className={baseInputClasses}
            placeholder={field.placeholder}
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            {...register(field.name, { valueAsNumber: true })}
            className={baseInputClasses}
            placeholder={field.placeholder}
          />
        )
      
      case 'select':
        return (
          <select
            {...register(field.name)}
            className={baseInputClasses}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  {...register(field.name)}
                  value={option.value}
                  className="text-legal-blue focus:ring-legal-blue"
                />
                <span className="text-sm text-legal-gray">{option.label}</span>
              </label>
            ))}
          </div>
        )
      
      default:
        return (
          <input
            type="text"
            {...register(field.name)}
            className={baseInputClasses}
            placeholder={field.placeholder}
          />
        )
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-legal-gray mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p className="text-red-500 text-xs mt-1">{error.message}</p>
      )}
    </div>
  )
}