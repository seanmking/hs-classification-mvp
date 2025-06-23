/**
 * Format HS code for display
 */
export function formatHSCode(code: string): string {
  // Remove any existing dots or spaces
  const cleanCode = code.replace(/[\s.]/g, '')
  
  if (cleanCode.length === 4) {
    // Format as XX.XX
    return `${cleanCode.substring(0, 2)}.${cleanCode.substring(2)}`
  } else if (cleanCode.length === 6) {
    // Format as XXXX.XX
    return `${cleanCode.substring(0, 4)}.${cleanCode.substring(4)}`
  } else if (cleanCode.length === 8) {
    // Format as XXXX.XX.XX
    return `${cleanCode.substring(0, 4)}.${cleanCode.substring(4, 6)}.${cleanCode.substring(6)}`
  }
  
  return code // Return as-is if not standard length
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format confidence score with color coding
 */
export function formatConfidence(confidence: number): {
  text: string
  color: string
  label: string
} {
  const percentage = (confidence * 100).toFixed(0)
  
  if (confidence >= 0.9) {
    return {
      text: `${percentage}%`,
      color: 'text-green-600',
      label: 'High Confidence'
    }
  } else if (confidence >= 0.7) {
    return {
      text: `${percentage}%`,
      color: 'text-yellow-600',
      label: 'Moderate Confidence'
    }
  } else if (confidence >= 0.5) {
    return {
      text: `${percentage}%`,
      color: 'text-orange-600',
      label: 'Low Confidence'
    }
  } else {
    return {
      text: `${percentage}%`,
      color: 'text-red-600',
      label: 'Very Low Confidence'
    }
  }
}

/**
 * Format classification status
 */
export function formatStatus(status: string): {
  text: string
  color: string
  bgColor: string
} {
  const statusMap: Record<string, { text: string; color: string; bgColor: string }> = {
    'in_progress': {
      text: 'In Progress',
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100'
    },
    'completed': {
      text: 'Completed',
      color: 'text-green-800',
      bgColor: 'bg-green-100'
    },
    'needs_review': {
      text: 'Needs Review',
      color: 'text-orange-800',
      bgColor: 'bg-orange-100'
    },
    'archived': {
      text: 'Archived',
      color: 'text-gray-800',
      bgColor: 'bg-gray-100'
    }
  }
  
  return statusMap[status] || {
    text: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    color: 'text-gray-800',
    bgColor: 'bg-gray-100'
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - ellipsis.length) + ellipsis
}

/**
 * Format product description for display
 */
export function formatProductDescription(description: string, maxLength: number = 100): string {
  // Clean up whitespace
  const cleaned = description.trim().replace(/\s+/g, ' ')
  
  // Truncate if needed
  if (cleaned.length > maxLength) {
    return truncateText(cleaned, maxLength)
  }
  
  return cleaned
}

/**
 * Format GRI step name
 */
export function formatGRIStep(step: string): string {
  const stepMap: Record<string, string> = {
    'gri_1': 'GRI Rule 1: Classification by Terms',
    'gri_2a': 'GRI Rule 2(a): Incomplete Articles',
    'gri_2b': 'GRI Rule 2(b): Mixtures & Composites',
    'gri_3a': 'GRI Rule 3(a): Most Specific Description',
    'gri_3b': 'GRI Rule 3(b): Essential Character',
    'gri_3c': 'GRI Rule 3(c): Last Heading',
    'gri_4': 'GRI Rule 4: Most Similar Goods',
    'gri_5': 'GRI Rule 5: Packing Materials',
    'gri_6': 'GRI Rule 6: Subheading Classification'
  }
  
  return stepMap[step] || step
}

/**
 * Format JSON for display
 */
export function formatJSON(obj: any, indent: number = 2): string {
  return JSON.stringify(obj, null, indent)
}

/**
 * Format classification ID for display
 */
export function formatClassificationId(id: string): string {
  // Add spaces for readability: clf_abc123 -> CLF-ABC123
  const parts = id.split('_')
  if (parts.length === 2) {
    return `${parts[0].toUpperCase()}-${parts[1].toUpperCase()}`
  }
  return id.toUpperCase()
}

/**
 * Format material composition list
 */
export function formatMaterialList(materials: Array<{ name: string; percentage: number }>): string {
  return materials
    .sort((a, b) => b.percentage - a.percentage)
    .map(m => `${m.name} (${m.percentage}%)`)
    .join(', ')
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`
  return `${count} ${plural || singular + 's'}`
}