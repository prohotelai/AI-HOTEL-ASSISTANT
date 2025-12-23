'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Clock, Circle, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react'
import type { OnboardingProgressData } from '@/lib/services/onboarding/onboardingStepService'

const STEP_ORDER = ['hotel-details', 'room-config', 'services-setup', 'finish']

const STEP_LABELS: Record<string, string> = {
  'hotel-details': 'Hotel Details',
  'room-config': 'Room Configuration',
  'services-setup': 'Services Setup',
  'finish': 'Finalize',
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  'hotel-details': 'Add your hotel information and contact details',
  'room-config': 'Configure room types and inventory',
  'services-setup': 'Set up hotel services and integrations',
  'finish': 'Review and activate your setup',
}

type OnboardingProgressWidgetProps = {
  onOnboardingChange?: (progress: OnboardingProgressData) => void
}

export function OnboardingProgressWidget({ onOnboardingChange }: OnboardingProgressWidgetProps) {
  const [progress, setProgress] = useState<OnboardingProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/onboarding/progress')
      if (!response.ok) {
        throw new Error('Failed to load onboarding progress')
      }
      const data: OnboardingProgressData = await response.json()
      setProgress(data)
      setError(null)
      if (onOnboardingChange) {
        onOnboardingChange(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [onOnboardingChange])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const handleResume = useCallback(async () => {
    if (!progress) return

    try {
      setActionLoading('resume')
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })

      if (!response.ok) {
        throw new Error('Failed to resume onboarding')
      }

      const updatedProgress: OnboardingProgressData = await response.json()
      setProgress(updatedProgress)
      if (onOnboardingChange) {
        onOnboardingChange(updatedProgress)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume')
    } finally {
      setActionLoading(null)
    }
  }, [progress, onOnboardingChange])

  const handleEditStep = useCallback(
    async (stepName: string) => {
      if (!progress) return

      try {
        setActionLoading(`edit-${stepName}`)
        const response = await fetch('/api/onboarding/steps/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit', stepName }),
        })

        if (!response.ok) {
          throw new Error('Failed to edit step')
        }

        await loadProgress()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to edit step')
      } finally {
        setActionLoading(null)
      }
    },
    [progress, loadProgress]
  )

  const handleFinishSkippedStep = useCallback(
    async (stepName: string) => {
      if (!progress) return

      try {
        setActionLoading(`finish-${stepName}`)
        const response = await fetch('/api/onboarding/steps/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete', stepName }),
        })

        if (!response.ok) {
          throw new Error('Failed to complete step')
        }

        await loadProgress()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete step')
      } finally {
        setActionLoading(null)
      }
    },
    [progress, loadProgress]
  )

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Unable to load onboarding progress</p>
        </div>
      </div>
    )
  }

  const isCompleted = progress.status === 'COMPLETED'
  const completionPercentage = Math.round((progress.completedSteps.length / STEP_ORDER.length) * 100)

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Onboarding Setup</h2>
          {isCompleted && <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">Completed</span>}
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {isCompleted
            ? 'Your onboarding is complete. You can edit steps below if needed.'
            : `${completionPercentage}% complete - ${STEP_ORDER.length - progress.completedSteps.length} step${STEP_ORDER.length - progress.completedSteps.length === 1 ? '' : 's'} remaining`}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Steps list */}
      <div className="space-y-3">
        {STEP_ORDER.map((stepName, index) => {
          const isCompleted = progress.completedSteps.includes(stepName)
          const isSkipped = progress.skippedSteps.includes(stepName)
          const isCurrent = progress.currentStep === stepName
          const stepLabel = STEP_LABELS[stepName] || stepName
          const stepDescription = STEP_DESCRIPTIONS[stepName]

          return (
            <div
              key={stepName}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                isCompleted
                  ? 'bg-green-50 border-green-200'
                  : isSkipped
                    ? 'bg-amber-50 border-amber-200'
                    : isCurrent
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Step icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : isSkipped ? (
                  <Clock className="w-6 h-6 text-amber-600" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
                    {index + 1}. {stepLabel}
                  </h3>
                  {isCompleted && <span className="text-xs text-green-700 font-semibold">Completed</span>}
                  {isSkipped && <span className="text-xs text-amber-700 font-semibold">Skipped</span>}
                  {isCurrent && <span className="text-xs text-blue-700 font-semibold">Current</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1">{stepDescription}</p>
              </div>

              {/* Step actions */}
              {(isCompleted || isSkipped) && !actionLoading && (
                <div className="flex-shrink-0 flex gap-2">
                  {isCompleted && (
                    <button
                      onClick={() => handleEditStep(stepName)}
                      disabled={actionLoading === `edit-${stepName}`}
                      className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white rounded border border-gray-300 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {isSkipped && (
                    <button
                      onClick={() => handleFinishSkippedStep(stepName)}
                      disabled={actionLoading === `finish-${stepName}`}
                      className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white rounded border border-gray-300 transition-colors"
                    >
                      Complete
                    </button>
                  )}
                </div>
              )}

              {actionLoading && (actionLoading === `edit-${stepName}` || actionLoading === `finish-${stepName}`) && (
                <div className="flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions footer */}
      {!isCompleted && progress.currentStep && (
        <div className="mt-6 pt-4 border-t flex gap-3">
          <a
            href={`/admin/onboarding?step=${progress.currentStep}`}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Continue Setup
          </a>
          {progress.completedSteps.length > 0 && (
            <button
              onClick={handleResume}
              disabled={actionLoading === 'resume'}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'resume' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Resume'}
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-gray-600 mb-3">Your setup is complete and your hotel is ready to use.</p>
          <a
            href="/dashboard"
            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      )}
    </div>
  )
}
