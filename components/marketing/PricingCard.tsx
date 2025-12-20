'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface PricingCardProps {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
  cta: string
  ctaLink: string
  index?: number
}

export default function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
  cta,
  ctaLink,
  index = 0
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative rounded-2xl p-6 md:p-8 ${
        highlighted
          ? 'bg-brand-primary text-white shadow-xl ring-2 ring-brand-primary md:scale-105'
          : 'bg-brand-card text-brand-text shadow-md border border-brand-border hover:border-brand-primary/30 transition-all duration-300'
      }`}
      role="article"
      aria-label={`${name} pricing plan`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-accent text-white px-4 py-1 rounded-full text-xs md:text-sm font-semibold shadow-md">
          Most Popular
        </div>
      )}
      
      <div className="mb-6">
        <h3 className={`text-2xl md:text-3xl font-bold mb-2 tracking-tight ${highlighted ? 'text-white' : 'text-brand-text'}`}>
          {name}
        </h3>
        <p className={`text-sm md:text-base ${highlighted ? 'text-blue-100' : 'text-brand-muted'}`}>
          {description}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl md:text-5xl font-bold tracking-tight ${highlighted ? 'text-white' : 'text-brand-text'}`}>
            {price}
          </span>
          {price !== 'Free' && (
            <span className={`text-base md:text-lg ${highlighted ? 'text-blue-100' : 'text-brand-muted'}`}>
              /month
            </span>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              highlighted ? 'text-brand-accent' : 'text-brand-primary'
            }`} aria-hidden="true" />
            <span className={`text-sm md:text-base ${highlighted ? 'text-white' : 'text-brand-muted'} leading-relaxed`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaLink}
        className={`block w-full text-center py-3.5 md:py-4 px-6 rounded-xl font-semibold transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[3rem] flex items-center justify-center ${
          highlighted
            ? 'bg-white text-brand-primary hover:bg-blue-50 shadow-lg hover:shadow-xl focus:ring-white'
            : 'bg-brand-primary text-white hover:bg-brand-primary-dark shadow-md hover:shadow-lg focus:ring-brand-primary'
        }`}
        aria-label={`${cta} - ${name} plan`}
      >
        {cta}
      </Link>
    </motion.div>
  )
}
