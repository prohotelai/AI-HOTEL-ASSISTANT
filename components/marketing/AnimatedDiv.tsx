"use client"

import { motion, type MotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

interface AnimatedDivProps extends MotionProps {
  children: ReactNode
  className?: string
}

export default function AnimatedDiv({ children, ...props }: AnimatedDivProps) {
  return (
    <motion.div {...props}>
      {children}
    </motion.div>
  )
}
