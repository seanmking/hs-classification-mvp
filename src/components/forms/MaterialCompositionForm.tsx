'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'

const materialSchema = z.object({
  name: z.string().min(1, 'Material name is required'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  hsCode: z.string().optional(),
  description: z.string().optional(),
})

const materialCompositionSchema = z.object({
  materials: z.array(materialSchema).min(1, 'At least one material is required'),
  totalWeight: z.number().positive('Total weight must be positive').optional(),
  weightUnit: z.enum(['kg', 'g', 'lb', 'oz']).optional(),
  determinationMethod: z.enum(['weight', 'value', 'volume', 'surface_area']),
  notes: z.string().optional(),
}).refine((data) => {
  const total = data.materials.reduce((sum, mat) => sum + mat.percentage, 0)
  return Math.abs(total - 100) < 0.01 // Allow for small rounding errors
}, {
  message: "Material percentages must add up to 100%",
  path: ["materials"],
})

type MaterialCompositionData = z.infer<typeof materialCompositionSchema>

interface MaterialCompositionFormProps {
  onSubmit: (data: MaterialCompositionData) => void
  initialData?: Partial<MaterialCompositionData>
}

export default function MaterialCompositionForm({ onSubmit, initialData }: MaterialCompositionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MaterialCompositionData>({
    resolver: zodResolver(materialCompositionSchema),
    defaultValues: initialData || {
      materials: [{ name: '', percentage: 0, hsCode: '', description: '' }],
      determinationMethod: 'weight',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'materials',
  })

  const materials = watch('materials')
  const totalPercentage = materials?.reduce((sum, mat) => sum + (mat.percentage || 0), 0) || 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-legal-blue mb-4">
          Material Composition
        </h3>
        <p className="text-sm text-legal-gray mb-4">
          For GRI Rule 2(b) and 3(b), we need to understand the material composition of your product. 
          Please provide the breakdown by percentage.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-legal-gray mb-1">
          Determination Method
        </label>
        <select
          {...register('determinationMethod')}
          className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
        >
          <option value="weight">By Weight</option>
          <option value="value">By Value</option>
          <option value="volume">By Volume</option>
          <option value="surface_area">By Surface Area</option>
        </select>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-legal-gray">Materials</h4>
          <div className={`text-sm ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            Total: {totalPercentage.toFixed(1)}%
          </div>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <h5 className="font-medium text-sm">Material {index + 1}</h5>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-legal-gray mb-1">
                  Material Name
                </label>
                <input
                  {...register(`materials.${index}.name`)}
                  className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue text-sm"
                  placeholder="e.g., Stainless Steel"
                />
                {errors.materials?.[index]?.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.materials[index]?.name?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-legal-gray mb-1">
                  Percentage
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register(`materials.${index}.percentage`, { valueAsNumber: true })}
                  className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue text-sm"
                  placeholder="0.0"
                />
                {errors.materials?.[index]?.percentage && (
                  <p className="text-red-500 text-xs mt-1">{errors.materials[index]?.percentage?.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-legal-gray mb-1">
                Known HS Code (if applicable)
              </label>
              <input
                {...register(`materials.${index}.hsCode`)}
                className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue text-sm"
                placeholder="e.g., 7304.31"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-legal-gray mb-1">
                Material Description
              </label>
              <textarea
                {...register(`materials.${index}.description`)}
                rows={2}
                className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue text-sm"
                placeholder="Additional details about this material..."
              />
            </div>
          </div>
        ))}

        {errors.materials?.root && (
          <p className="text-red-500 text-sm">{errors.materials.root.message}</p>
        )}

        <button
          type="button"
          onClick={() => append({ name: '', percentage: 0, hsCode: '', description: '' })}
          className="w-full px-4 py-2 border border-legal-blue text-legal-blue rounded-md hover:bg-legal-blue hover:text-white transition"
        >
          Add Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-legal-gray mb-1">
            Total Weight (optional)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('totalWeight', { valueAsNumber: true })}
            className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-legal-gray mb-1">
            Weight Unit
          </label>
          <select
            {...register('weightUnit')}
            className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
          >
            <option value="kg">Kilograms (kg)</option>
            <option value="g">Grams (g)</option>
            <option value="lb">Pounds (lb)</option>
            <option value="oz">Ounces (oz)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-legal-gray mb-1">
          Additional Notes
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
          placeholder="Any additional information about the material composition..."
        />
      </div>

      <div className="pt-4 border-t">
        <button
          type="submit"
          disabled={isSubmitting || Math.abs(totalPercentage - 100) >= 0.01}
          className="w-full px-4 py-3 bg-legal-blue text-white rounded-md hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Material Composition'}
        </button>
      </div>
    </form>
  )
}