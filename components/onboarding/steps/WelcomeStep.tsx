/**
 * Onboarding Step 1: Welcome & Introduction
 */

'use client'

import { motion } from 'framer-motion'
import { Sparkles, Zap, Clock } from 'lucide-react'

interface WelcomeStepProps {
  onComplete: () => void
  onNext: () => void
}

export default function WelcomeStep({ onComplete, onNext }: WelcomeStepProps) {
  function handleGetStarted() {
    onComplete()
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-primary/10 text-brand-primary mb-6"
        >
          <Sparkles className="w-10 h-10" />
        </motion.div>
        
        <h1 className="text-4xl font-bold text-brand-text mb-4">
          Welcome to Your AI Hotel Assistant
        </h1>
        <p className="text-xl text-brand-muted max-w-2xl mx-auto">
          Let&apos;s get your AI assistant set up in just a few minutes. We&apos;ll guide you through everything.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-brand-border"
        >
          <div className="w-12 h-12 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-brand-text mb-2">
            Quick Setup
          </h3>
          <p className="text-brand-muted">
            Complete setup in under 15 minutes with our guided wizard
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-brand-border"
        >
          <div className="w-12 h-12 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-brand-text mb-2">
            AI-Powered
          </h3>
          <p className="text-brand-muted">
            Your assistant learns from your hotel&apos;s unique information
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-brand-border"
        >
          <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-brand-text mb-2">
            Save & Resume
          </h3>
          <p className="text-brand-muted">
            Take your time&mdash;your progress is automatically saved
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <button
          onClick={handleGetStarted}
          className="px-8 py-4 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors shadow-lg shadow-brand-primary/30"
        >
          Get Started →
        </button>
        <p className="text-sm text-brand-muted mt-4">
          Estimated time: 10-15 minutes
        </p>
      </motion.div>
    </motion.div>
  )
}
