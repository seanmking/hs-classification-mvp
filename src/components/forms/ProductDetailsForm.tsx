'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const productDetailsSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  primaryFunction: z.string().min(10, 'Please provide a detailed description of the primary function'),
  intendedUse: z.string().min(10, 'Please describe how the product is intended to be used'),
  targetMarket: z.string().min(1, 'Target market is required'),
  dimensions: z.object({
    length: z.number().positive('Length must be positive').optional(),
    width: z.number().positive('Width must be positive').optional(),
    height: z.number().positive('Height must be positive').optional(),
    weight: z.number().positive('Weight must be positive').optional(),
    unit: z.enum(['cm', 'inch', 'kg', 'lb']),
  }).optional(),
  countryOfOrigin: z.string().min(1, 'Country of origin is required'),
  isAssembled: z.enum(['yes', 'no', 'partially']),
  additionalInfo: z.string().optional(),
})

type ProductDetailsData = z.infer<typeof productDetailsSchema>

interface ProductDetailsFormProps {
  onSubmit: (data: ProductDetailsData) => void
  initialData?: Partial<ProductDetailsData>
}

export default function ProductDetailsForm({ onSubmit, initialData }: ProductDetailsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductDetailsData>({
    resolver: zodResolver(productDetailsSchema),
    defaultValues: initialData,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-legal-blue mb-4">
          Product Details Information
        </h3>
        <p className="text-sm text-legal-gray mb-4">
          Please provide comprehensive details about your product. This information is crucial for accurate classification under GRI rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-legal-gray mb-1">
            Product Name/Model
          </label>
          <input
            {...register('productName')}
            className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
            placeholder="e.g., XYZ-2000 Industrial Printer"
          />
          {errors.productName && (
            <p className="text-red-500 text-xs mt-1">{errors.productName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-legal-gray mb-1">
            Country of Origin
          </label>
          <input
            {...register('countryOfOrigin')}
            className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
            placeholder="e.g., United States"
          />
          {errors.countryOfOrigin && (
            <p className="text-red-500 text-xs mt-1">{errors.countryOfOrigin.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-legal-gray mb-1">
          Primary Function
        </label>
        <textarea
          {...register('primaryFunction')}
          rows={3}
          className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
          placeholder="Describe the main purpose and function of this product..."
        />
        {errors.primaryFunction && (
          <p className="text-red-500 text-xs mt-1">{errors.primaryFunction.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-legal-gray mb-1">
          Intended Use
        </label>
        <textarea
          {...register('intendedUse')}
          rows={3}
          className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
          placeholder="How is this product intended to be used by the end user?"
        />
        {errors.intendedUse && (
          <p className="text-red-500 text-xs mt-1">{errors.intendedUse.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-legal-gray mb-1">
            Target Market
          </label>
          <select
            {...register('targetMarket')}
            className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
          >
            <option value="">Select target market</option>
            <option value="consumer">Consumer/Retail</option>
            <option value="commercial">Commercial/Business</option>
            <option value="industrial">Industrial</option>
            <option value="medical">Medical/Healthcare</option>
            <option value="educational">Educational</option>
            <option value="government">Government/Military</option>
          </select>
          {errors.targetMarket && (
            <p className="text-red-500 text-xs mt-1">{errors.targetMarket.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-legal-gray mb-1">
            Assembly Status
          </label>
          <select
            {...register('isAssembled')}
            className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
          >
            <option value="">Select assembly status</option>
            <option value="yes">Fully Assembled</option>
            <option value="no">Unassembled/Kit</option>
            <option value="partially">Partially Assembled</option>
          </select>
          {errors.isAssembled && (
            <p className="text-red-500 text-xs mt-1">{errors.isAssembled.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-legal-gray mb-1">
          Additional Information
        </label>
        <textarea
          {...register('additionalInfo')}
          rows={3}
          className="w-full px-3 py-2 border legal-border rounded-md focus:outline-none focus:ring-2 focus:ring-legal-blue"
          placeholder="Any other relevant information about the product..."
        />
      </div>

      <div className="pt-4 border-t">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-legal-blue text-white rounded-md hover:bg-opacity-90 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Product Details'}
        </button>
      </div>
    </form>
  )
}