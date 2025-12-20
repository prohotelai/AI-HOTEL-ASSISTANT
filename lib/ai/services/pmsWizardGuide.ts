/**
 * AI-Assisted PMS Wizard Guide
 * Provides intelligent guidance for external PMS connection wizard
 */

import { ExternalPMSType } from '@/lib/services/pms/externalPMSService'

export interface WizardStep {
  step: number
  title: string
  description: string
  aiGuidance: string
  validationRules: string[]
}

export interface PMSTypeInfo {
  type: ExternalPMSType
  name: string
  description: string
  logoUrl?: string
  documentation?: string
  requirements: string[]
  commonIssues: string[]
  setupGuide: string[]
  available: boolean
  comingSoon?: string
}

/**
 * Get PMS type information
 */
export function getPMSTypeInfo(pmsType: ExternalPMSType): PMSTypeInfo {
  const pmsInfo: Record<ExternalPMSType, PMSTypeInfo> = {
    [ExternalPMSType.OPERA]: {
      type: ExternalPMSType.OPERA,
      name: 'Oracle Opera',
      description: 'Industry-leading hotel management system by Oracle',
      documentation: 'https://docs.oracle.com/en/industries/hospitality/opera-cloud/',
      requirements: [
        'Opera Cloud API access token',
        'Property/Hotel ID',
        'API endpoint URL (usually provided by Oracle)',
        'OAuth credentials (if using OAuth flow)'
      ],
      commonIssues: [
        'API token expiration - tokens typically expire after 24 hours',
        'Insufficient permissions - ensure API user has read/write access',
        'Rate limiting - Opera has strict rate limits (100 requests/minute)',
        'Version compatibility - Opera Cloud vs Opera On-Premise have different APIs'
      ],
      setupGuide: [
        'Log in to Opera Cloud Administration',
        'Navigate to Interfaces > API Configuration',
        'Generate new API access token',
        'Note your property ID and endpoint URL',
        'Test connection using provided credentials'
      ],
      available: false,
      comingSoon: 'Q1 2026'
    },
    [ExternalPMSType.MEWS]: {
      type: ExternalPMSType.MEWS,
      name: 'Mews Commander',
      description: 'Cloud-based PMS for modern hotels and hostels',
      documentation: 'https://mews-systems.gitbook.io/connector-api/',
      requirements: [
        'Client Token (provided by Mews)',
        'Access Token (generated in Mews dashboard)',
        'Enterprise ID',
        'API endpoint (default: https://api.mews-demo.com)'
      ],
      commonIssues: [
        'Token mismatch - Client Token vs Access Token confusion',
        'Demo vs Production - ensure using correct environment',
        'Time zone issues - Mews uses UTC, ensure date conversions',
        'Resource not found - verify Enterprise ID is correct'
      ],
      setupGuide: [
        'Open Mews Commander dashboard',
        'Go to Settings > Integrations > Create',
        'Select "Connector API" integration',
        'Copy Client Token and generate Access Token',
        'Note your Enterprise ID',
        'Use demo endpoint for testing, production for live'
      ],
      available: false,
      comingSoon: 'Q1 2026'
    },
    [ExternalPMSType.CLOUDBEDS]: {
      type: ExternalPMSType.CLOUDBEDS,
      name: 'Cloudbeds',
      description: 'All-in-one hotel management platform',
      documentation: 'https://hotels.cloudbeds.com/api/docs/',
      requirements: [
        'OAuth Client ID',
        'OAuth Client Secret',
        'Property ID',
        'Redirect URI (for OAuth flow)'
      ],
      commonIssues: [
        'OAuth flow failure - ensure redirect URI is whitelisted',
        'Property ID mismatch - verify correct property selected',
        'Scope limitations - ensure OAuth scopes include required permissions',
        'Sandbox vs Live - different credentials for each environment'
      ],
      setupGuide: [
        'Log in to Cloudbeds MyAllocator',
        'Navigate to Settings > Integrations',
        'Create new API application',
        'Copy Client ID and Client Secret',
        'Add authorized redirect URI',
        'Complete OAuth flow to get access token'
      ],
      available: false,
      comingSoon: 'Q2 2026'
    },
    [ExternalPMSType.PROTEL]: {
      type: ExternalPMSType.PROTEL,
      name: 'Protel Air',
      description: 'Leading European hotel software',
      documentation: 'https://developer.protel.io/',
      requirements: [
        'API Key',
        'Hotel Code',
        'System ID',
        'API endpoint (region-specific)'
      ],
      commonIssues: [
        'Region-specific endpoints - EU, US, APAC have different URLs',
        'System ID confusion - different from Hotel Code',
        'HTTPS certificate issues - Protel requires valid SSL',
        'XML format - Protel uses SOAP/XML, not REST'
      ],
      setupGuide: [
        'Contact Protel support for API access',
        'Receive API credentials via secure channel',
        'Identify your region and use correct endpoint',
        'Test with XML/SOAP client first',
        'Verify Hotel Code and System ID match'
      ],
      available: false,
      comingSoon: 'Q2 2026'
    },
    [ExternalPMSType.APALEO]: {
      type: ExternalPMSType.APALEO,
      name: 'Apaleo',
      description: 'Open API-first hospitality platform',
      documentation: 'https://apaleo.dev/',
      requirements: [
        'Client ID',
        'Client Secret',
        'Account Code',
        'Property ID'
      ],
      commonIssues: [
        'Multi-property setup - ensure correct property selected',
        'Token refresh - implement proper OAuth refresh flow',
        'Webhook setup - Apaleo requires webhook endpoint for real-time sync',
        'Rate limiting - respect API rate limits (1000 requests/hour)'
      ],
      setupGuide: [
        'Register account at https://app.apaleo.com',
        'Go to Apps & Integrations',
        'Create new app integration',
        'Copy Client ID and Client Secret',
        'Note your Account Code and Property ID',
        'Configure webhook endpoint if needed'
      ],
      available: false,
      comingSoon: 'Q2 2026'
    },
    [ExternalPMSType.CUSTOM]: {
      type: ExternalPMSType.CUSTOM,
      name: 'Custom Integration',
      description: 'Connect your proprietary or unsupported PMS',
      documentation: 'Contact our support team for assistance',
      requirements: [
        'API documentation from your PMS provider',
        'API authentication credentials',
        'Base URL/endpoint',
        'List of available API methods'
      ],
      commonIssues: [
        'Non-standard API format - may require custom adapter',
        'Legacy protocols - SOAP, XML-RPC, or proprietary formats',
        'Limited API coverage - not all PMS features may be available',
        'Custom development - may require professional services'
      ],
      setupGuide: [
        'Gather complete API documentation',
        'Test API endpoints with Postman or similar tool',
        'Document authentication flow',
        'Contact our support team with API details',
        'Schedule integration consultation call'
      ],
      available: true,
      comingSoon: undefined
    }
  }

  return pmsInfo[pmsType]
}

/**
 * Get wizard steps with AI guidance
 */
export function getWizardSteps(): WizardStep[] {
  return [
    {
      step: 1,
      title: 'Select PMS Type',
      description: 'Choose your property management system from the list',
      aiGuidance: 'Select the PMS that your hotel currently uses. If you\'re unsure, check with your front desk or IT team. For custom or unlisted systems, choose "Custom Integration".',
      validationRules: [
        'PMS type must be selected',
        'Verify this is your production PMS (not a demo or test system)'
      ]
    },
    {
      step: 2,
      title: 'Enter Credentials',
      description: 'Provide your PMS API credentials',
      aiGuidance: 'Enter your API key or authentication credentials. These are typically found in your PMS admin panel under Integrations or API Settings. Never share these credentials publicly.',
      validationRules: [
        'API key must be provided',
        'API key format must match PMS requirements',
        'Optional endpoint URL must be valid HTTPS URL',
        'Version number should match your PMS installation'
      ]
    },
    {
      step: 3,
      title: 'Test Connection',
      description: 'Verify connection to your PMS',
      aiGuidance: 'We\'ll test the connection to your PMS using the provided credentials. This ensures everything is configured correctly before saving. The test is read-only and won\'t modify any data.',
      validationRules: [
        'Connection must succeed',
        'API credentials must be valid',
        'Endpoint must be reachable',
        'PMS version must be compatible'
      ]
    },
    {
      step: 4,
      title: 'Review & Confirm',
      description: 'Review configuration and save',
      aiGuidance: 'Review all settings before saving. Once confirmed, your PMS will be connected and data synchronization will begin. You can always update these settings later from the admin dashboard.',
      validationRules: [
        'All required fields must be filled',
        'Connection test must have passed',
        'Admin must confirm understanding of data sync'
      ]
    },
    {
      step: 5,
      title: 'Complete',
      description: 'Connection established successfully',
      aiGuidance: 'Congratulations! Your external PMS is now connected. Data synchronization will begin shortly. You can monitor sync status in the PMS dashboard.',
      validationRules: []
    }
  ]
}

/**
 * Get AI suggestions based on connection test results
 */
export function getAISuggestions(
  pmsType: ExternalPMSType,
  error?: string
): string[] {
  const pmsInfo = getPMSTypeInfo(pmsType)
  const suggestions: string[] = []

  if (error) {
    // Parse error and provide specific suggestions
    if (error.includes('401') || error.includes('authentication')) {
      suggestions.push('🔑 API key appears to be invalid or expired')
      suggestions.push('Try generating a new API key from your PMS dashboard')
      suggestions.push('Ensure the API key has not been revoked')
    }

    if (error.includes('403') || error.includes('permission')) {
      suggestions.push('🚫 Insufficient API permissions')
      suggestions.push('Verify the API user has read/write access')
      suggestions.push('Check if specific scopes need to be enabled')
    }

    if (error.includes('404') || error.includes('not found')) {
      suggestions.push('🔍 Resource not found')
      suggestions.push('Double-check your property/hotel ID')
      suggestions.push('Verify the endpoint URL is correct')
    }

    if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
      suggestions.push('⏱️ Connection timeout')
      suggestions.push('Check if your PMS API is currently accessible')
      suggestions.push('Verify firewall settings allow our IP addresses')
    }

    if (error.includes('SSL') || error.includes('certificate')) {
      suggestions.push('🔒 SSL certificate issue')
      suggestions.push('Ensure endpoint uses HTTPS with valid certificate')
      suggestions.push('Check if certificate has expired')
    }
  }

  // Add PMS-specific suggestions
  suggestions.push(...pmsInfo.commonIssues.map(issue => `💡 ${issue}`))

  return suggestions
}

/**
 * Validate API key format for specific PMS
 */
export function validateAPIKeyFormat(
  pmsType: ExternalPMSType,
  apiKey: string
): { valid: boolean; message?: string } {
  switch (pmsType) {
    case ExternalPMSType.OPERA:
      if (apiKey.length < 32) {
        return {
          valid: false,
          message: 'Opera API keys are typically 32+ characters long'
        }
      }
      break

    case ExternalPMSType.MEWS:
      if (!apiKey.includes('-')) {
        return {
          valid: false,
          message: 'Mews tokens typically contain hyphens (e.g., xxx-yyy-zzz)'
        }
      }
      break

    case ExternalPMSType.CLOUDBEDS:
      if (apiKey.length < 20) {
        return {
          valid: false,
          message: 'Cloudbeds credentials should be 20+ characters'
        }
      }
      break
  }

  return { valid: true }
}

/**
 * Get next steps after successful connection
 */
export function getNextSteps(pmsType: ExternalPMSType): string[] {
  return [
    '✅ Configuration saved successfully',
    '🔄 Initial data sync will begin in a few moments',
    '📊 Monitor sync status in the PMS Dashboard',
    '🔔 You\'ll receive notifications when sync completes',
    '⚙️ Configure sync frequency in Settings > PMS Integration',
    '📚 Review the integration guide for advanced features'
  ]
}
