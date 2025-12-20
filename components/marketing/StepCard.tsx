'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepCardProps {
  step: number
  icon: LucideIcon
  title: string
  description: string
  delay?: number
  className?: string
}

export function StepCard({
  step,
  icon: Icon,
  title,
  description,
  delay = 0,
  className,
}: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      className={cn('relative', className)}
    >
      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left">
        <div className="relative mb-4 md:mb-0 md:mr-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-2xl font-bold text-white shadow-lg">
            {step}
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-3 inline-flex rounded-lg bg-brand-primary/10 p-2 text-brand-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-brand-text md:text-xl">
            {title}
          </h3>
          <p className="text-sm text-brand-muted md:text-base">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
