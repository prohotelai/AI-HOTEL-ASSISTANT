'use client'

/**
 * External PMS Connection Wizard
 * AI-assisted multi-step wizard for connecting external PMS systems
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Server,
  Key,
  TestTube,
  CheckCheck,
  Rocket,
  Info,
  ExternalLink,
  Shield,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PMSType {
  value: string
  label: string
  description: string
  available: boolean
  comingSoon?: string
}

const PMS_TYPES: PMSType[] = [
  {
    value: 'OPERA',
    label: 'Oracle Opera',
    description: 'Industry-leading hotel management system',
    available: false,
    comingSoon: 'Q1 2026'
  },
  {
    value: 'MEWS',
    label: 'Mews Commander',
    description: 'Cloud-based PMS for modern hotels',
    available: false,
    comingSoon: 'Q1 2026'
  },
  {
    value: 'CLOUDBEDS',
    label: 'Cloudbeds',
    description: 'All-in-one hotel management platform',
    available: false,
    comingSoon: 'Q2 2026'
  },
  {
    value: 'PROTEL',
    label: 'Protel Air',
    description: 'Leading European hotel software',
    available: false,
    comingSoon: 'Q2 2026'
  },
  {
    value: 'APALEO',
    label: 'Apaleo',
    description: 'Open API-first hospitality platform',
    available: false,
    comingSoon: 'Q2 2026'
  },
  {
    value: 'CUSTOM',
    label: 'Custom Integration',
    description: 'Connect your proprietary or unsupported PMS',
    available: true
  }
]

interface WizardState {
  step: number
  pmsType: string
  apiKey: string
  version: string
  endpoint: string
  testResult: any
  testing: boolean
  saving: boolean
}

export default function PMSConnectionWizard() {
  const { toast } = useToast()
  const [state, setState] = useState<WizardState>({
    step: 1,
    pmsType: '',
    apiKey: '',
    version: '',
    endpoint: '',
    testResult: null,
    testing: false,
    saving: false
  })

  const [aiGuidance, setAIGuidance] = useState('')

  const totalSteps = 5

  // Update AI guidance based on current step
  useEffect(() => {
    const guidance = [
      'Select the PMS that your hotel currently uses. If unsure, check with your front desk or IT team.',
      'Enter your API credentials. These are typically found in your PMS admin panel under Integrations or API Settings.',
      'We\'ll test the connection to your PMS to ensure everything is configured correctly.',
      'Review all settings before saving. Data synchronization will begin once confirmed.',
      'Connection established! Monitor sync status in the PMS dashboard.'
    ]
    setAIGuidance(guidance[state.step - 1] || '')
  }, [state.step])

  const selectedPMS = PMS_TYPES.find(p => p.value === state.pmsType)

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.pmsType !== ''
      case 2:
        return state.apiKey.length >= 10
      case 3:
        return state.testResult?.success === true
      case 4:
        return state.testResult?.success === true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (state.step === 3 && !state.testResult) {
      // Auto-trigger test on step 3
      handleTestConnection()
      return
    }

    if (state.step === 4) {
      // Save configuration
      handleSaveConfiguration()
      return
    }

    if (canProceed()) {
      setState(prev => ({ ...prev, step: prev.step + 1 }))
      toast({
        title: 'Progress saved',
        description: `Moving to step ${state.step + 1} of ${totalSteps}`,
        duration: 2000
      })
    }
  }

  const handleBack = () => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: prev.step - 1 }))
    }
  }

  const handleTestConnection = async () => {
    setState(prev => ({ ...prev, testing: true, testResult: null }))

    try {
      const response = await fetch('/api/admin/pms/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pmsType: state.pmsType,
          apiKey: state.apiKey,
          version: state.version || undefined,
          endpoint: state.endpoint || undefined
        })
      })

      const result = await response.json()

      setState(prev => ({ ...prev, testResult: result, testing: false }))

      if (result.success) {
        toast({
          title: '✅ Connection successful!',
          description: result.message,
          duration: 5000
        })
      } else {
        toast({
          title: '❌ Connection failed',
          description: result.message,
          variant: 'destructive',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Test connection error:', error)
      setState(prev => ({
        ...prev,
        testResult: {
          success: false,
          message: 'Failed to test connection',
          errors: [(error as Error).message]
        },
        testing: false
      }))

      toast({
        title: 'Error',
        description: 'Failed to test connection. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleSaveConfiguration = async () => {
    setState(prev => ({ ...prev, saving: true }))

    try {
      const response = await fetch('/api/admin/pms/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pmsType: state.pmsType,
          apiKey: state.apiKey,
          version: state.version || undefined,
          endpoint: state.endpoint || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setState(prev => ({ ...prev, step: 5, saving: false }))
        toast({
          title: '🎉 Configuration saved!',
          description: 'Your external PMS is now connected.',
          duration: 5000
        })
      } else {
        throw new Error(result.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Save configuration error:', error)
      setState(prev => ({ ...prev, saving: false }))

      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Server className="w-12 h-12 text-blue-600" />
              <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Connect External PMS
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            AI-assisted wizard to integrate your existing property management system
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Step {state.step} of {totalSteps}
            </span>
            <span className="text-sm text-slate-500">
              {Math.round((state.step / totalSteps) * 100)}% Complete
            </span>
          </div>
          <Progress value={(state.step / totalSteps) * 100} className="h-2" />
        </motion.div>

        {/* AI Guidance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">AI Assistant</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-200">
              {aiGuidance}
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Wizard Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-xl border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {state.step === 1 && <Server className="w-6 h-6 text-blue-600" />}
                  {state.step === 2 && <Key className="w-6 h-6 text-green-600" />}
                  {state.step === 3 && <TestTube className="w-6 h-6 text-purple-600" />}
                  {state.step === 4 && <CheckCheck className="w-6 h-6 text-orange-600" />}
                  {state.step === 5 && <Rocket className="w-6 h-6 text-pink-600" />}
                  
                  <div>
                    <CardTitle>
                      {state.step === 1 && 'Select PMS Type'}
                      {state.step === 2 && 'Enter Credentials'}
                      {state.step === 3 && 'Test Connection'}
                      {state.step === 4 && 'Review & Confirm'}
                      {state.step === 5 && 'Complete!'}
                    </CardTitle>
                    <CardDescription>
                      {state.step === 1 && 'Choose your property management system'}
                      {state.step === 2 && 'Provide your PMS API credentials'}
                      {state.step === 3 && 'Verify connection to your PMS'}
                      {state.step === 4 && 'Review configuration and save'}
                      {state.step === 5 && 'Connection established successfully'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Step 1: Select PMS Type */}
                {state.step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PMS_TYPES.map((pms) => (
                        <motion.div
                          key={pms.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <button
                            onClick={() => setState(prev => ({ ...prev, pmsType: pms.value }))}
                            disabled={!pms.available}
                            className={cn(
                              'w-full p-4 rounded-lg border-2 text-left transition-all duration-200',
                              state.pmsType === pms.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700',
                              !pms.available && 'opacity-60 cursor-not-allowed'
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {pms.label}
                              </h3>
                              {pms.comingSoon && (
                                <Badge variant="secondary" className="text-xs">
                                  {pms.comingSoon}
                                </Badge>
                              )}
                              {pms.available && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Available
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {pms.description}
                            </p>
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    {selectedPMS && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4"
                      >
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Selected: {selectedPMS.label}</AlertTitle>
                          <AlertDescription>
                            {selectedPMS.available
                              ? 'This PMS type is available for integration. Click Next to continue.'
                              : `This integration is coming soon (${selectedPMS.comingSoon}). You can still set up the connection for when it becomes available.`}
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Step 2: Enter Credentials */}
                {state.step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey" className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        API Key / Access Token *
                      </Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your PMS API key"
                        value={state.apiKey}
                        onChange={(e) => setState(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="font-mono"
                      />
                      <p className="text-xs text-slate-500">
                        Your API key is encrypted and stored securely
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="version">PMS Version (Optional)</Label>
                      <Input
                        id="version"
                        placeholder="e.g., 5.0, 2023.1"
                        value={state.version}
                        onChange={(e) => setState(prev => ({ ...prev, version: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endpoint">Custom Endpoint URL (Optional)</Label>
                      <Input
                        id="endpoint"
                        type="url"
                        placeholder="https://api.yourpms.com"
                        value={state.endpoint}
                        onChange={(e) => setState(prev => ({ ...prev, endpoint: e.target.value }))}
                      />
                      <p className="text-xs text-slate-500">
                        Leave empty to use default endpoint
                      </p>
                    </div>

                    <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-900 dark:text-amber-100">Security Notice</AlertTitle>
                      <AlertDescription className="text-amber-700 dark:text-amber-200">
                        Your API credentials are encrypted at rest and never exposed in logs or error messages.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Step 3: Test Connection */}
                {state.step === 3 && (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      {state.testing ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-4"
                        >
                          <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
                          <p className="text-lg font-medium">Testing connection...</p>
                          <p className="text-sm text-slate-500">
                            This may take a few moments
                          </p>
                        </motion.div>
                      ) : state.testResult ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4"
                        >
                          {state.testResult.success ? (
                            <>
                              <CheckCircle2 className="w-16 h-16 mx-auto text-green-600" />
                              <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
                                Connection Successful!
                              </h3>
                              <p className="text-slate-600 dark:text-slate-400">
                                {state.testResult.message}
                              </p>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-16 h-16 mx-auto text-red-600" />
                              <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">
                                Connection Failed
                              </h3>
                              <p className="text-slate-600 dark:text-slate-400">
                                {state.testResult.message}
                              </p>
                            </>
                          )}

                          {state.testResult.suggestions && state.testResult.suggestions.length > 0 && (
                            <div className="mt-6 text-left">
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-600" />
                                AI Suggestions:
                              </h4>
                              <ul className="space-y-2 text-sm">
                                {state.testResult.suggestions.map((suggestion: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-0.5">→</span>
                                    <span className="text-slate-600 dark:text-slate-400">{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <div className="space-y-4">
                          <TestTube className="w-16 h-16 mx-auto text-purple-600" />
                          <p className="text-lg font-medium">Ready to test connection</p>
                          <Button
                            onClick={handleTestConnection}
                            size="lg"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <TestTube className="w-4 h-4 mr-2" />
                            Test Connection Now
                          </Button>
                        </div>
                      )}
                    </div>

                    {state.testResult && !state.testResult.success && (
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setState(prev => ({ ...prev, step: 2, testResult: null }))}
                        >
                          Edit Credentials
                        </Button>
                        <Button
                          onClick={handleTestConnection}
                          disabled={state.testing}
                        >
                          Retry Test
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Review & Confirm */}
                {state.step === 4 && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          PMS Type:
                        </span>
                        <span className="font-semibold">{selectedPMS?.label}</span>
                      </div>
                      {state.version && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Version:
                          </span>
                          <span className="font-semibold">{state.version}</span>
                        </div>
                      )}
                      {state.endpoint && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Endpoint:
                          </span>
                          <span className="font-semibold text-sm truncate max-w-xs">
                            {state.endpoint}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          API Key:
                        </span>
                        <span className="font-mono text-sm">
                          {state.apiKey.slice(0, 4)}{'*'.repeat(12)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Connection Status:
                        </span>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>What happens next?</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>Configuration will be saved securely</li>
                          <li>Initial data synchronization will begin</li>
                          <li>You&apos;ll receive notifications when sync completes</li>
                          <li>Monitor sync status in PMS Dashboard</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <input type="checkbox" id="confirm" className="rounded" required />
                      <label htmlFor="confirm" className="text-sm text-slate-700 dark:text-slate-300">
                        I understand that data synchronization will begin and my PMS data will be integrated with the AI Hotel Assistant platform.
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 5: Complete */}
                {state.step === 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 space-y-6"
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: 2
                      }}
                    >
                      <Rocket className="w-20 h-20 mx-auto text-pink-600" />
                    </motion.div>

                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        🎉 All Set!
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        Your external PMS is now connected and ready to sync.
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-6 text-left">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Next Steps:
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Initial data sync will begin in a few moments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Monitor sync status in PMS Dashboard</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Configure sync frequency in Settings</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Review integration guide for advanced features</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => window.location.href = '/dashboard/admin'}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Go to Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = '/dashboard/admin/pms'}
                        size="lg"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View PMS Settings
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>

              {state.step < 5 && (
                <CardFooter className="flex justify-between border-t pt-6">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={state.step === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || state.testing || state.saving}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {state.saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : state.step === 4 ? (
                      <>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Confirm & Save
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
