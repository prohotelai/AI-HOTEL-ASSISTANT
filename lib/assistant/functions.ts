// AI Assistant Function Calling Tools
// These functions can be called by the AI assistant to perform actions

export interface FunctionCall {
  name: string
  parameters: Record<string, any>
}

export interface FunctionResult {
  success: boolean
  data?: any
  error?: string
  message?: string
}

// Navigation function - Opens a page for the user
export async function navigationOpenPage(params: { path: string }): Promise<FunctionResult> {
  const { path } = params

  // Validate path
  const validPaths = [
    '/dashboard',
    '/dashboard/tickets',
    '/dashboard/knowledge-base',
    '/dashboard/pms',
    '/dashboard/staff',
    '/dashboard/analytics',
    '/dashboard/settings',
    '/assistant'
  ]

  if (!validPaths.includes(path)) {
    return {
      success: false,
      error: 'Invalid path',
      message: `Path "${path}" is not available. Valid paths are: ${validPaths.join(', ')}`
    }
  }

  return {
    success: true,
    data: { path },
    message: `Navigate to ${path}`
  }
}

// Help module - Provides structured explanation of platform modules
export async function helpShowModule(params: { 
  module: 'tickets' | 'settings' | 'analytics' | 'kb' | 'voice' | 'billing' | 'pms' | 'staff'
}): Promise<FunctionResult> {
  const { module } = params

  const moduleInfo: Record<string, { title: string; description: string; features: string[] }> = {
    tickets: {
      title: 'Ticket Management System',
      description: 'Comprehensive guest request tracking and resolution',
      features: [
        'Multi-channel ticket creation (chat, QR, portal)',
        'AI-powered categorization and priority assignment',
        'SLA tracking with escalation alerts',
        'Team collaboration and assignment',
        'Guest satisfaction tracking'
      ]
    },
    kb: {
      title: 'Knowledge Base',
      description: 'Centralized documentation with AI-powered search',
      features: [
        'Document upload (PDF, DOCX, TXT, MD)',
        'Automatic chunking and embedding',
        'Semantic search across all documents',
        'Version control and audit trails',
        'Multi-language support'
      ]
    },
    pms: {
      title: 'PMS Integration',
      description: 'Connect with existing property management systems',
      features: [
        'Support for Opera, Mews, Cloudbeds, Protel',
        'Real-time room status sync',
        'Guest profile synchronization',
        'Booking and availability management',
        'Housekeeping integration'
      ]
    },
    staff: {
      title: 'Staff Management',
      description: 'Team collaboration and role management',
      features: [
        'Role-based access control (5 levels)',
        'Staff invitation system',
        'Department management',
        'Performance analytics',
        'Shift scheduling'
      ]
    },
    analytics: {
      title: 'Analytics & Reporting',
      description: 'Data-driven insights for operations',
      features: [
        'Ticket response time metrics',
        'Guest satisfaction scores',
        'Staff performance tracking',
        'Peak hours analysis',
        'Custom report generation'
      ]
    },
    voice: {
      title: 'Voice AI Assistant',
      description: 'Hands-free staff assistance',
      features: [
        'Real-time speech-to-text',
        'Multi-language support (15+ languages)',
        'Context-aware responses',
        'Voice command execution',
        'Call recording and transcription'
      ]
    },
    billing: {
      title: 'Billing & Subscriptions',
      description: 'Manage your platform subscription',
      features: [
        'Flexible pricing tiers',
        'Usage-based billing',
        'Invoice management',
        'Payment method management',
        'Subscription upgrades/downgrades'
      ]
    },
    settings: {
      title: 'Settings & Configuration',
      description: 'Customize your platform experience',
      features: [
        'Hotel profile management',
        'User preferences',
        'Notification settings',
        'API key management',
        'Security and access controls'
      ]
    }
  }

  const info = moduleInfo[module]
  if (!info) {
    return {
      success: false,
      error: 'Invalid module',
      message: `Module "${module}" not found`
    }
  }

  return {
    success: true,
    data: info,
    message: `# ${info.title}\n\n${info.description}\n\n## Key Features:\n${info.features.map(f => `- ${f}`).join('\n')}`
  }
}

// Troubleshooting function - Provides guided steps for common issues
export async function troubleshootCheck(params: { issue: string }): Promise<FunctionResult> {
  const { issue } = params
  const lowerIssue = issue.toLowerCase()

  // Common troubleshooting scenarios
  const troubleshooting: Record<string, { steps: string[]; tips: string[] }> = {
    login: {
      steps: [
        'Verify your email address is correct',
        'Check if Caps Lock is on',
        'Try resetting your password',
        'Clear browser cache and cookies',
        'Try a different browser',
        'Contact your hotel admin if issue persists'
      ],
      tips: [
        'Password is case-sensitive',
        'Use the "Forgot Password" link if needed',
        'Check your spam folder for reset emails'
      ]
    },
    ticket: {
      steps: [
        'Verify you have permission to create tickets',
        'Check if all required fields are filled',
        'Ensure guest information is valid',
        'Try refreshing the page',
        'Check if the ticket system is enabled for your hotel',
        'Contact your supervisor if issue persists'
      ],
      tips: [
        'You can save tickets as drafts',
        'Use templates for common ticket types',
        'Attach photos for better context'
      ]
    },
    pms: {
      steps: [
        'Verify PMS credentials are correct',
        'Check PMS system is online',
        'Confirm network connectivity',
        'Review API endpoint configuration',
        'Check rate limits haven\'t been exceeded',
        'Contact technical support with error logs'
      ],
      tips: [
        'Test connection in settings before full sync',
        'Schedule syncs during off-peak hours',
        'Monitor sync logs regularly'
      ]
    },
    performance: {
      steps: [
        'Check your internet connection speed',
        'Clear browser cache (Ctrl/Cmd + Shift + Delete)',
        'Close unnecessary browser tabs',
        'Update your browser to latest version',
        'Disable browser extensions temporarily',
        'Try using a different network'
      ],
      tips: [
        'Recommended: Chrome, Firefox, Safari (latest versions)',
        'Minimum 5 Mbps internet speed',
        'Use wired connection for stability'
      ]
    }
  }

  // Find matching troubleshooting guide
  let guide = null
  for (const [key, value] of Object.entries(troubleshooting)) {
    if (lowerIssue.includes(key)) {
      guide = value
      break
    }
  }

  if (!guide) {
    return {
      success: true,
      message: `I'll help you troubleshoot "${issue}". Here are general troubleshooting steps:

1. **Refresh the page** - Often resolves temporary issues
2. **Clear cache** - Remove old data that might cause problems
3. **Check permissions** - Verify you have access to this feature
4. **Try different browser** - Rule out browser-specific issues
5. **Contact support** - If issue persists, we're here to help

What specific error message are you seeing?`
    }
  }

  return {
    success: true,
    data: guide,
    message: `# Troubleshooting: ${issue}

## Steps to Resolve:
${guide.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

## Helpful Tips:
${guide.tips.map(tip => `- ${tip}`).join('\n')}

Still having issues? Contact support with the error message details.`
  }
}

// Execute function call from AI
export async function executeFunctionCall(functionCall: FunctionCall): Promise<FunctionResult> {
  const { name, parameters } = functionCall

  try {
    switch (name) {
      case 'navigation.openPage':
        return await navigationOpenPage(parameters as { path: string })
      
      case 'help.showModule':
        return await helpShowModule(parameters as { module: 'tickets' | 'settings' | 'analytics' | 'kb' | 'voice' | 'billing' | 'pms' | 'staff' })
      
      case 'troubleshoot.check':
        return await troubleshootCheck(parameters as { issue: string })
      
      default:
        return {
          success: false,
          error: 'Unknown function',
          message: `Function "${name}" is not available`
        }
    }
  } catch (error) {
    return {
      success: false,
      error: 'Function execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get available functions list
export function getAvailableFunctions() {
  return [
    {
      name: 'navigation.openPage',
      description: 'Navigate to a specific page in the platform',
      parameters: {
        path: 'string - The page path to navigate to'
      },
      examples: [
        '{ path: "/dashboard/tickets" }',
        '{ path: "/dashboard/settings" }'
      ]
    },
    {
      name: 'help.showModule',
      description: 'Show detailed information about a platform module',
      parameters: {
        module: 'string - tickets | settings | analytics | kb | voice | billing | pms | staff'
      },
      examples: [
        '{ module: "tickets" }',
        '{ module: "kb" }'
      ]
    },
    {
      name: 'troubleshoot.check',
      description: 'Get troubleshooting steps for common issues',
      parameters: {
        issue: 'string - Description of the problem'
      },
      examples: [
        '{ issue: "cannot login" }',
        '{ issue: "pms sync failed" }'
      ]
    }
  ]
}
