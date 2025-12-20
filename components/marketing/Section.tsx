import { ReactNode } from 'react'

interface SectionProps {
  children: ReactNode
  className?: string
  background?: 'white' | 'gray' | 'gradient'
  id?: string
}

export default function Section({ children, className = '', background = 'white', id }: SectionProps) {
  const bgClasses = {
    white: 'bg-brand-card',
    gray: 'bg-brand-bg',
    gradient: 'bg-gradient-to-b from-brand-card to-brand-bg'
  }

  return (
    <section id={id} className={`py-16 md:py-24 ${bgClasses[background]} ${className}`}>
      {children}
    </section>
  )
}
