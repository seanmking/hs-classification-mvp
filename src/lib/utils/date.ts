import { format, formatDistance, formatRelative, parseISO } from 'date-fns'

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr)
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'MMM d, yyyy \'at\' h:mm a')
}

/**
 * Format a date for legal documents (full format)
 */
export function formatLegalDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'MMMM d, yyyy \'at\' HH:mm:ss \'UTC\'')
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true })
}

/**
 * Get relative date (e.g., "yesterday at 10:00 AM")
 */
export function getRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatRelative(dateObj, new Date())
}

/**
 * Calculate duration between two dates
 */
export function calculateDuration(start: Date | string, end: Date | string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  formatted: string
} {
  const startDate = typeof start === 'string' ? parseISO(start) : start
  const endDate = typeof end === 'string' ? parseISO(end) : end
  
  const durationMs = endDate.getTime() - startDate.getTime()
  
  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)
  
  let formatted = ''
  if (days > 0) formatted += `${days}d `
  if (hours > 0) formatted += `${hours}h `
  if (minutes > 0) formatted += `${minutes}m `
  if (seconds > 0 && days === 0) formatted += `${seconds}s`
  
  return {
    days,
    hours,
    minutes,
    seconds,
    formatted: formatted.trim() || '0s'
  }
}

/**
 * Get timestamp for legal records
 */
export function getLegalTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const today = new Date()
  
  return dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
}

/**
 * Check if a date is within the last N days
 */
export function isWithinDays(date: Date | string, days: number): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  
  return dateObj >= cutoff
}