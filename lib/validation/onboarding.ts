/**
 * Onboarding Validation Schemas
 */

import { z } from 'zod'

export const hotelProfileSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(300).optional(),
  timezone: z.string().optional(),
  logo: z.string().url().optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
})

export const websiteScanSchema = z.object({
  url: z.string().url(),
  extractFAQs: z.boolean().default(true),
  extractServices: z.boolean().default(true),
  extractPolicies: z.boolean().default(true),
})

export const knowledgeBaseImportSchema = z.object({
  type: z.enum(['url', 'file', 'text']),
  content: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string().min(1).max(200),
  category: z.string().optional(),
})

export const widgetConfigSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  generateKey: z.boolean().default(true),
})

export const staffInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['owner', 'manager', 'reception', 'staff']),
  message: z.string().max(500).optional(),
})

export const onboardingStepUpdateSchema = z.object({
  currentStep: z.string().optional(),
  completedStep: z.string().optional(),
  timeSpent: z.number().int().min(0).optional(),
})

export const chatTestSchema = z.object({
  message: z.string().min(1).max(1000),
  guestName: z.string().optional(),
})
