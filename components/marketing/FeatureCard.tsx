'use client'

import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  index?: number
}

export default function FeatureCard({ icon: Icon, title, description, index = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
      className="bg-brand-card rounded-2xl p-6 shadow-sm border border-brand-border transition-all duration-300 hover:border-brand-primary/30 cursor-pointer group"
      role="article"
      aria-label={title}
    >
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-4 group-hover:bg-brand-primary/20 transition-colors">
        <Icon className="w-6 h-6 md:w-7 md:h-7 text-brand-primary" aria-hidden="true" />
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-brand-text mb-2 group-hover:text-brand-primary transition-colors">{title}</h3>
      <p className="text-brand-muted text-sm md:text-base leading-relaxed">{description}</p>
    </motion.div>
  )
}
