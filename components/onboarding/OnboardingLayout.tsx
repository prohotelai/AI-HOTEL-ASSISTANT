/**
 * Onboarding Wizard Layout
 * Provides stepper navigation and progress tracking
 */

'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

const ONBOARDING_STEPS = [
  { id: 'welcome', label: 'Welcome', estimatedTime: 1 },
  { id: 'profile', label: 'Hotel Profile', estimatedTime: 3 },
  { id: 'website-scan', label: 'Website Scan', estimatedTime: 2 },
  { id: 'knowledge-base', label: 'Knowledge Base', estimatedTime: 4 },
  { id: 'widget', label: 'Widget Setup', estimatedTime: 2 },
  { id: 'integrations', label: 'Integrations', estimatedTime: 3 },
  { id: 'invite-staff', label: 'Invite Staff', estimatedTime: 2 },
  { id: 'test', label: 'Test & Activate', estimatedTime: 3 },
  { id: 'finish', label: 'Complete', estimatedTime: 1 },
]

interface OnboardingLayoutProps {
  children: ReactNode
  currentStep: string
  completedSteps: string[]
  onStepChange?: (step: string) => void
}

export default function OnboardingLayout({
  children,
  currentStep,
  completedSteps,
  onStepChange,
}: OnboardingLayoutProps) {
  const router = useRouter()
  const params = useParams()
  const [totalTime, setTotalTime] = useState(0)

  useEffect(() => {
    const total = ONBOARDING_STEPS.reduce((sum, step) => sum + step.estimatedTime, 0)
    const completed = ONBOARDING_STEPS.filter((step) =>
      completedSteps.includes(step.id)
    ).reduce((sum, step) => sum + step.estimatedTime, 0)

    setTotalTime(total - completed)
  }, [completedSteps])

  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep)
  const progress = ((completedSteps.length / ONBOARDING_STEPS.length) * 100).toFixed(0)

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-brand-border z-50">
        <motion.div
          className="h-full bg-brand-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Stepper */}
          <div className="lg:col-span-1">
            <div className="bg-brand-card rounded-2xl p-6 border border-brand-border sticky top-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-brand-muted mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">~{totalTime} min remaining</span>
                </div>
                <div className="text-2xl font-bold text-brand-text">{progress}%</div>
                <p className="text-sm text-brand-muted mt-1">Setup Complete</p>
              </div>

              <div className="space-y-2">
                {ONBOARDING_STEPS.map((step, index) => {
                  const isCompleted = completedSteps.includes(step.id)
                  const isCurrent = step.id === currentStep
                  const isAccessible = index <= currentStepIndex

                  return (
                    <button
                      key={step.id}
                      onClick={() => isAccessible && onStepChange?.(step.id)}
                      disabled={!isAccessible}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                        isCurrent
                          ? 'bg-brand-primary/10 border border-brand-primary'
                          : isCompleted
                          ? 'hover:bg-brand-bg'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-accent flex-shrink-0" />
                      ) : (
                        <Circle
                          className={`w-5 h-5 flex-shrink-0 ${
                            isCurrent ? 'text-brand-primary' : 'text-brand-muted'
                          }`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            isCurrent
                              ? 'text-brand-primary'
                              : isCompleted
                              ? 'text-brand-text'
                              : 'text-brand-muted'
                          }`}
                        >
                          {step.label}
                        </div>
                        {isCurrent && !isCompleted && (
                          <div className="text-xs text-brand-muted">
                            ~{step.estimatedTime} min
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-brand-border">
                <button
                  onClick={() => router.push(`/dashboard`)}
                  className="w-full text-sm text-brand-muted hover:text-brand-text transition-colors"
                >
                  Save & Exit
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
