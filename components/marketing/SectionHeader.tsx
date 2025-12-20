'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  description?: string
  centered?: boolean
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  description,
  centered = true,
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5 }}
      className={cn(
        'mb-12 md:mb-16',
        centered && 'text-center',
        className
      )}
    >
      {subtitle && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-primary">
          {subtitle}
        </p>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-brand-text md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-2xl text-base text-brand-muted md:text-lg lg:text-xl">
          {description}
        </p>
      )}
    </motion.div>
  )
}
