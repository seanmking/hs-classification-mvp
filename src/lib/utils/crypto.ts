import { createHash, randomBytes } from 'crypto'

/**
 * Generate a secure random ID
 */
export function generateSecureId(prefix?: string): string {
  const id = randomBytes(16).toString('hex')
  return prefix ? `${prefix}_${id}` : id
}

/**
 * Hash data for integrity verification
 */
export function hashData(data: any): string {
  const jsonString = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(jsonString).digest('hex')
}

/**
 * Verify data integrity
 */
export function verifyDataIntegrity(data: any, expectedHash: string): boolean {
  const actualHash = hashData(data)
  return actualHash === expectedHash
}

/**
 * Generate a hash for audit log entries
 */
export function generateAuditHash(entry: {
  action: string
  actor: string
  details: any
  timestamp: string
}): string {
  const dataToHash = {
    action: entry.action,
    actor: entry.actor,
    details: entry.details,
    timestamp: entry.timestamp
  }
  
  return hashData(dataToHash).substring(0, 32)
}

/**
 * Create a checksum for classification data
 */
export function createClassificationChecksum(classification: {
  id: string
  productDescription: string
  decisions: Array<{
    step: string
    answer: string
    confidence: number
  }>
  finalHsCode?: string
}): string {
  const relevantData = {
    id: classification.id,
    productDescription: classification.productDescription,
    decisions: classification.decisions.map(d => ({
      step: d.step,
      answer: d.answer,
      confidence: d.confidence
    })),
    finalHsCode: classification.finalHsCode
  }
  
  return hashData(relevantData)
}

/**
 * Encrypt sensitive data (simplified - use proper encryption in production)
 */
export function encryptData(data: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key'
  
  // This is a simplified implementation
  // In production, use proper encryption like AES
  const encrypted = Buffer.from(data).toString('base64')
  const hash = createHash('sha256').update(encryptionKey + encrypted).digest('hex')
  
  return `${encrypted}.${hash.substring(0, 8)}`
}

/**
 * Decrypt sensitive data (simplified - use proper decryption in production)
 */
export function decryptData(encryptedData: string, key?: string): string | null {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key'
  
  try {
    const [encrypted, checksum] = encryptedData.split('.')
    const expectedChecksum = createHash('sha256')
      .update(encryptionKey + encrypted)
      .digest('hex')
      .substring(0, 8)
    
    if (checksum !== expectedChecksum) {
      console.error('Checksum mismatch - data may be tampered')
      return null
    }
    
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}

/**
 * Generate a time-based token for session management
 */
export function generateTimeBasedToken(userId: string, expirationMinutes: number = 60): string {
  const expiresAt = Date.now() + (expirationMinutes * 60 * 1000)
  const data = `${userId}:${expiresAt}`
  
  const signature = createHash('sha256')
    .update(data + (process.env.JWT_SECRET || 'default-secret'))
    .digest('hex')
  
  return Buffer.from(`${data}:${signature}`).toString('base64')
}

/**
 * Verify a time-based token
 */
export function verifyTimeBasedToken(token: string): { valid: boolean; userId?: string; expired?: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [userId, expiresAt, signature] = decoded.split(':')
    
    // Check expiration
    if (parseInt(expiresAt) < Date.now()) {
      return { valid: false, expired: true }
    }
    
    // Verify signature
    const expectedSignature = createHash('sha256')
      .update(`${userId}:${expiresAt}` + (process.env.JWT_SECRET || 'default-secret'))
      .digest('hex')
    
    if (signature !== expectedSignature) {
      return { valid: false }
    }
    
    return { valid: true, userId }
  } catch (error) {
    return { valid: false }
  }
}

/**
 * Anonymize sensitive data for logging
 */
export function anonymizeData(data: any): any {
  const sensitive = ['email', 'phone', 'address', 'ssn', 'creditCard']
  
  if (typeof data === 'string') {
    return data.replace(/\S/g, '*')
  }
  
  if (typeof data === 'object' && data !== null) {
    const anonymized: any = Array.isArray(data) ? [] : {}
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitive.some(field => key.toLowerCase().includes(field))) {
        anonymized[key] = anonymizeData(value)
      } else if (typeof value === 'object') {
        anonymized[key] = anonymizeData(value)
      } else {
        anonymized[key] = value
      }
    }
    
    return anonymized
  }
  
  return data
}

/**
 * Generate a deterministic ID from input data
 */
export function generateDeterministicId(data: any, prefix?: string): string {
  const hash = hashData(data).substring(0, 16)
  return prefix ? `${prefix}_${hash}` : hash
}