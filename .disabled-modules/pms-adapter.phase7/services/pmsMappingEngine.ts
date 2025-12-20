// ============================================================================
// PMS MAPPING ENGINE
// ============================================================================
// Handles field mapping and data transformation between external PMS and internal schema
// ============================================================================

import {
  PMSEntity,
  PMSEntityMapping,
  PMSFieldMapping,
  PMSMappingError,
} from '../types/pms.types'

export class PMSMappingEngine {
  
  /**
   * Transform external PMS data to internal format
   */
  static transformToInternal(
    externalData: any,
    entity: PMSEntity,
    mapping: PMSEntityMapping
  ): any {
    if (!mapping.enabled) {
      throw new PMSMappingError(`Mapping for entity ${entity} is disabled`)
    }
    
    const internalData: any = {}
    
    for (const [internalField, fieldMapping] of Object.entries(mapping.mappings)) {
      try {
        const value = this.transformField(
          externalData,
          fieldMapping,
          'TO_INTERNAL'
        )
        
        if (value !== undefined) {
          internalData[internalField] = value
        } else if (fieldMapping.isRequired) {
          throw new PMSMappingError(
            `Required field ${internalField} is missing in external data`
          )
        }
      } catch (error: any) {
        if (fieldMapping.isRequired) {
          throw new PMSMappingError(
            `Failed to map required field ${internalField}: ${error.message}`
          )
        }
        // Optional field failed, use default or skip
        if (fieldMapping.defaultValue !== undefined) {
          internalData[internalField] = fieldMapping.defaultValue
        }
      }
    }
    
    return internalData
  }
  
  /**
   * Transform internal data to external PMS format
   */
  static transformToExternal(
    internalData: any,
    entity: PMSEntity,
    mapping: PMSEntityMapping
  ): any {
    if (!mapping.enabled) {
      throw new PMSMappingError(`Mapping for entity ${entity} is disabled`)
    }
    
    const externalData: any = {}
    
    for (const [internalField, fieldMapping] of Object.entries(mapping.mappings)) {
      try {
        const value = this.transformField(
          internalData,
          fieldMapping,
          'TO_EXTERNAL'
        )
        
        if (value !== undefined) {
          externalData[fieldMapping.externalField] = value
        }
      } catch (error: any) {
        // Log error but continue
        console.error(`Failed to map field ${internalField}:`, error)
      }
    }
    
    return externalData
  }
  
  /**
   * Transform a single field
   */
  private static transformField(
    sourceData: any,
    fieldMapping: PMSFieldMapping,
    direction: 'TO_INTERNAL' | 'TO_EXTERNAL'
  ): any {
    const sourceField = direction === 'TO_INTERNAL' 
      ? fieldMapping.externalField 
      : fieldMapping.internalField
    
    let value = this.getNestedValue(sourceData, sourceField)
    
    if (value === undefined || value === null) {
      return fieldMapping.defaultValue
    }
    
    // Apply transformation
    switch (fieldMapping.transformType) {
      case 'DIRECT':
        return value
        
      case 'CUSTOM':
        if (fieldMapping.transformCode) {
          return this.applyCustomTransform(value, fieldMapping.transformCode)
        }
        return value
        
      case 'LOOKUP':
        // TODO: Implement lookup tables
        return value
        
      default:
        return value
    }
  }
  
  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    const keys = path.split('.')
    let value = obj
    
    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined
      }
      value = value[key]
    }
    
    return value
  }
  
  /**
   * Apply custom transformation code
   * ⚠️ WARNING: This executes user-provided code - use with caution
   */
  private static applyCustomTransform(value: any, transformCode: string): any {
    try {
      // Create a safe execution context
      const transform = new Function('value', transformCode)
      return transform(value)
    } catch (error: any) {
      throw new PMSMappingError(
        `Custom transform failed: ${error.message}`
      )
    }
  }
  
  /**
   * Validate mapping configuration
   */
  static validateMapping(mapping: PMSEntityMapping): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!mapping.entity) {
      errors.push('Entity is required')
    }
    
    if (!mapping.mappings || Object.keys(mapping.mappings).length === 0) {
      errors.push('At least one field mapping is required')
    }
    
    for (const [internalField, fieldMapping] of Object.entries(mapping.mappings)) {
      if (!fieldMapping.externalField) {
        errors.push(`External field missing for ${internalField}`)
      }
      
      if (fieldMapping.transformType === 'CUSTOM' && !fieldMapping.transformCode) {
        errors.push(`Custom transform code missing for ${internalField}`)
      }
      
      if (fieldMapping.isRequired && !fieldMapping.defaultValue) {
        warnings.push(`Required field ${internalField} has no default value`)
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
  
  /**
   * Generate mapping template for an entity
   */
  static generateMappingTemplate(entity: PMSEntity): PMSEntityMapping {
    const templates: Record<PMSEntity, any> = {
      rooms: {
        id: { externalField: 'room_id', transformType: 'DIRECT', isRequired: true },
        number: { externalField: 'room_number', transformType: 'DIRECT', isRequired: true },
        floor: { externalField: 'floor', transformType: 'DIRECT' },
        status: { externalField: 'room_status', transformType: 'DIRECT' },
        roomTypeId: { externalField: 'room_type_id', transformType: 'DIRECT' },
      },
      bookings: {
        id: { externalField: 'reservation_id', transformType: 'DIRECT', isRequired: true },
        guestId: { externalField: 'guest_id', transformType: 'DIRECT', isRequired: true },
        roomId: { externalField: 'room_id', transformType: 'DIRECT', isRequired: true },
        checkIn: { externalField: 'check_in_date', transformType: 'DIRECT', isRequired: true },
        checkOut: { externalField: 'check_out_date', transformType: 'DIRECT', isRequired: true },
        status: { externalField: 'status', transformType: 'DIRECT' },
        totalAmount: { externalField: 'total_amount', transformType: 'DIRECT' },
      },
      guests: {
        id: { externalField: 'guest_id', transformType: 'DIRECT', isRequired: true },
        firstName: { externalField: 'first_name', transformType: 'DIRECT', isRequired: true },
        lastName: { externalField: 'last_name', transformType: 'DIRECT', isRequired: true },
        email: { externalField: 'email', transformType: 'DIRECT' },
        phone: { externalField: 'phone', transformType: 'DIRECT' },
      },
      invoices: {
        id: { externalField: 'invoice_id', transformType: 'DIRECT', isRequired: true },
        folioId: { externalField: 'folio_id', transformType: 'DIRECT' },
        guestId: { externalField: 'guest_id', transformType: 'DIRECT', isRequired: true },
        totalAmount: { externalField: 'total_amount', transformType: 'DIRECT' },
        status: { externalField: 'status', transformType: 'DIRECT' },
      },
      folios: {
        id: { externalField: 'folio_id', transformType: 'DIRECT', isRequired: true },
        bookingId: { externalField: 'booking_id', transformType: 'DIRECT', isRequired: true },
        balance: { externalField: 'balance', transformType: 'DIRECT' },
      },
      rates: {
        id: { externalField: 'rate_id', transformType: 'DIRECT', isRequired: true },
        roomTypeId: { externalField: 'room_type_id', transformType: 'DIRECT', isRequired: true },
        amount: { externalField: 'rate_amount', transformType: 'DIRECT', isRequired: true },
      },
    }
    
    return {
      entity,
      enabled: true,
      mappings: templates[entity] || {},
    }
  }
  
  /**
   * Auto-detect field mappings by comparing schemas
   */
  static autoDetectMappings(
    externalSchema: any,
    internalSchema: any,
    entity: PMSEntity
  ): PMSEntityMapping {
    const mappings: Record<string, PMSFieldMapping> = {}
    
    // Simple heuristic: match by similar field names
    for (const internalField of Object.keys(internalSchema)) {
      const lowerInternal = internalField.toLowerCase()
      
      for (const externalField of Object.keys(externalSchema)) {
        const lowerExternal = externalField.toLowerCase()
        
        // Check for exact match or similar names
        if (
          lowerInternal === lowerExternal ||
          lowerInternal.replace(/_/g, '') === lowerExternal.replace(/_/g, '') ||
          this.isSimilarFieldName(lowerInternal, lowerExternal)
        ) {
          mappings[internalField] = {
            externalField,
            internalField,
            transformType: 'DIRECT',
          }
          break
        }
      }
    }
    
    return {
      entity,
      enabled: true,
      mappings,
    }
  }
  
  private static isSimilarFieldName(field1: string, field2: string): boolean {
    // Simple similarity check
    const commonVariations: Record<string, string[]> = {
      id: ['id', 'identifier', 'code'],
      name: ['name', 'title', 'label'],
      date: ['date', 'datetime', 'timestamp'],
      status: ['status', 'state', 'condition'],
    }
    
    for (const [key, variations] of Object.entries(commonVariations)) {
      if (
        (field1.includes(key) && variations.some(v => field2.includes(v))) ||
        (field2.includes(key) && variations.some(v => field1.includes(v)))
      ) {
        return true
      }
    }
    
    return false
  }
}
