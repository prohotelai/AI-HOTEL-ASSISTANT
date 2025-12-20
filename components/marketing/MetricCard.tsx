'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  icon: LucideIcon
  value: string
  label: string
  description: string
  delay?: number
  className?: string
}

export function MetricCard({
  icon: Icon,
  value,
  label,
  description,
  delay = 0,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-brand-border bg-gradient-to-br from-white to-gray-50 p-6 shadow-md transition-shadow hover:shadow-lg md:p-8',
        className
      )}
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-primary/5" />
      <div className="relative">
        <div className="mb-4 inline-flex rounded-lg bg-brand-primary/10 p-2.5 text-brand-primary transition-transform group-hover:scale-110">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="mb-2 text-4xl font-bold tracking-tight text-brand-primary md:text-5xl">
          {value}
        </div>
        <div className="mb-2 text-base font-semibold text-brand-text md:text-lg">
          {label}
        </div>
        <p className="text-sm text-brand-muted">
          {description}
        </p>
      </div>
    </motion.div>
  )
}
