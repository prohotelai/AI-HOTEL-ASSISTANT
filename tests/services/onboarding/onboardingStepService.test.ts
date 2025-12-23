/**
 * Onboarding Wizard - Test Suite
 * 
 * Validates all scenarios required for production-grade wizard
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  initializeOnboarding,
  getOnboardingProgress,
  completeStep,
  skipStep,
  editStep,
  resumeOnboarding,
  canAccessStep,
  completeOnboarding,
  resetOnboarding,
  getResumeStep,
  getNextStep,
} from '@/lib/services/onboarding/onboardingStepService'

/**
 * Test setup: Use test hotel ID
 */
const TEST_HOTEL_ID = `test-hotel-${Date.now()}`

describe('Onboarding Step Service', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.onboardingProgress.deleteMany({
      where: { hotelId: TEST_HOTEL_ID },
    })
  })

  afterEach(async () => {
    // Clean up after tests
    await prisma.onboardingProgress.deleteMany({
      where: { hotelId: TEST_HOTEL_ID },
    })
  })

  describe('Initialization', () => {
    it('should initialize onboarding for new hotel', async () => {
      const result = await initializeOnboarding(TEST_HOTEL_ID)

      expect(result.hotelId).toBe(TEST_HOTEL_ID)
      expect(result.status).toBe('PENDING')
      expect(result.completedSteps).toEqual([])
      expect(result.skippedSteps).toEqual([])
      expect(result.currentStep).toBeNull()
    })

    it('should be idempotent - multiple calls safe', async () => {
      const result1 = await initializeOnboarding(TEST_HOTEL_ID)
      const result2 = await initializeOnboarding(TEST_HOTEL_ID)

      expect(result1).toEqual(result2)
    })

    it('should return null if never initialized and not requested', async () => {
      const result = await getOnboardingProgress(TEST_HOTEL_ID)
      expect(result).toBeNull()
    })
  })

  describe('Step Completion', () => {
    beforeEach(async () => {
      await initializeOnboarding(TEST_HOTEL_ID)
    })

    it('should complete first step and move to next', async () => {
      const result = await completeStep(TEST_HOTEL_ID, 'hotel-details')

      expect(result.success).toBe(true)
      expect(result.stepStatus).toBe('completed')
      expect(result.completedSteps).toContain('hotel-details')
      expect(result.nextStep).toBe('room-config')
      expect(result.progress.status).toBe('IN_PROGRESS')
    })

    it('should complete steps in order', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      await completeStep(TEST_HOTEL_ID, 'room-config')
      const result = await completeStep(TEST_HOTEL_ID, 'services-setup')

      expect(result.completedSteps).toEqual([
        'hotel-details',
        'room-config',
        'services-setup',
      ])
      expect(result.nextStep).toBe('finish')
    })

    it('should complete all steps and lock wizard', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      await completeStep(TEST_HOTEL_ID, 'room-config')
      await completeStep(TEST_HOTEL_ID, 'services-setup')
      const result = await completeStep(TEST_HOTEL_ID, 'finish')

      expect(result.progress.status).toBe('COMPLETED')
      expect(result.nextStep).toBeNull()
      expect(result.progress.completedAt).toBeDefined()
    })

    it('should be idempotent - completing same step multiple times is safe', async () => {
      const result1 = await completeStep(TEST_HOTEL_ID, 'hotel-details')
      const result2 = await completeStep(TEST_HOTEL_ID, 'hotel-details')

      expect(result1.completedSteps).toEqual(result2.completedSteps)
      expect(result1.nextStep).toBe(result2.nextStep)
    })
  })

  describe('Step Skipping', () => {
    beforeEach(async () => {
      await initializeOnboarding(TEST_HOTEL_ID)
    })

    it('should skip step and move to next', async () => {
      const result = await skipStep(TEST_HOTEL_ID, 'hotel-details')

      expect(result.success).toBe(true)
      expect(result.stepStatus).toBe('skipped')
      expect(result.skippedSteps).toContain('hotel-details')
      expect(result.completedSteps).not.toContain('hotel-details')
      expect(result.nextStep).toBe('room-config')
    })

    it('should allow completing skipped step later', async () => {
      await skipStep(TEST_HOTEL_ID, 'hotel-details')
      const result = await completeStep(TEST_HOTEL_ID, 'hotel-details')

      expect(result.completedSteps).toContain('hotel-details')
      expect(result.skippedSteps).not.toContain('hotel-details')
    })

    it('should skip all steps if needed', async () => {
      await skipStep(TEST_HOTEL_ID, 'hotel-details')
      await skipStep(TEST_HOTEL_ID, 'room-config')
      await skipStep(TEST_HOTEL_ID, 'services-setup')
      const result = await skipStep(TEST_HOTEL_ID, 'finish')

      expect(result.progress.status).toBe('COMPLETED')
      expect(result.completedSteps).toEqual([])
      expect(result.skippedSteps).toEqual([
        'hotel-details',
        'room-config',
        'services-setup',
        'finish',
      ])
    })
  })

  describe('Step Editing', () => {
    beforeEach(async () => {
      await initializeOnboarding(TEST_HOTEL_ID)
    })

    it('should edit completed step and allow re-entry', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      
      const editResult = await editStep(TEST_HOTEL_ID, 'hotel-details')

      expect(editResult.status).toBe('IN_PROGRESS')
      expect(editResult.completedAt).toBeNull()
    })

    it('should allow going back and editing multiple times', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      await completeStep(TEST_HOTEL_ID, 'room-config')
      
      // Go back and edit room-config
      await editStep(TEST_HOTEL_ID, 'room-config')
      const progress = await getOnboardingProgress(TEST_HOTEL_ID)

      expect(progress?.completedSteps).toContain('room-config')
      expect(progress?.status).toBe('IN_PROGRESS')
    })
  })

  describe('Navigation & Resume', () => {
    beforeEach(async () => {
      await initializeOnboarding(TEST_HOTEL_ID)
    })

    it('should resume from last incomplete step', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      
      const resumeStep = await resumeOnboarding(TEST_HOTEL_ID)

      expect(resumeStep).toBe('room-config')
    })

    it('should handle "go back" scenarios', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      await completeStep(TEST_HOTEL_ID, 'room-config')
      
      const progress = await getOnboardingProgress(TEST_HOTEL_ID)
      
      // Admin should be able to navigate back
      const canGoBack = progress?.completedSteps.length! > 0
      expect(canGoBack).toBe(true)
    })

    it('should calculate next step correctly', () => {
      const nextStep1 = getNextStep([], [])
      expect(nextStep1).toBe('hotel-details')

      const nextStep2 = getNextStep(['hotel-details'], [])
      expect(nextStep2).toBe('room-config')

      const nextStep3 = getNextStep(
        ['hotel-details', 'room-config'],
        ['services-setup']
      )
      expect(nextStep3).toBe('finish')

      const nextStep4 = getNextStep(
        ['hotel-details', 'room-config', 'services-setup', 'finish'],
        []
      )
      expect(nextStep4).toBeNull()
    })

    it('should calculate resume step correctly', () => {
      const resume1 = getResumeStep([], [])
      expect(resume1).toBe('hotel-details')

      const resume2 = getResumeStep(['hotel-details'], [])
      expect(resume2).toBe('room-config')

      const resume3 = getResumeStep(['hotel-details', 'room-config'], [])
      expect(resume3).toBe('services-setup')
    })
  })

  describe('Access Control', () => {
    beforeEach(async () => {
      await initializeOnboarding(TEST_HOTEL_ID)
    })

    it('should deny access after completion', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      await completeStep(TEST_HOTEL_ID, 'room-config')
      await completeStep(TEST_HOTEL_ID, 'services-setup')
      await completeStep(TEST_HOTEL_ID, 'finish')
      
      const canAccess = await canAccessStep(TEST_HOTEL_ID, 'hotel-details')

      expect(canAccess).toBe(false)
    })

    it('should allow access while IN_PROGRESS', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      
      const canAccess = await canAccessStep(TEST_HOTEL_ID, 'room-config')

      expect(canAccess).toBe(true)
    })

    it('should allow first step access for NOT_STARTED', async () => {
      const canAccess = await canAccessStep(TEST_HOTEL_ID, 'hotel-details')

      expect(canAccess).toBe(true)
    })
  })

  describe('State Transitions', () => {
    beforeEach(async () => {
      await initializeOnboarding(TEST_HOTEL_ID)
    })

    it('should transition through state machine: PENDING → IN_PROGRESS → COMPLETED', async () => {
      let progress = await getOnboardingProgress(TEST_HOTEL_ID)
      expect(progress?.status).toBe('PENDING')

      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      progress = await getOnboardingProgress(TEST_HOTEL_ID)
      expect(progress?.status).toBe('IN_PROGRESS')

      await completeStep(TEST_HOTEL_ID, 'room-config')
      await completeStep(TEST_HOTEL_ID, 'services-setup')
      await completeStep(TEST_HOTEL_ID, 'finish')
      progress = await getOnboardingProgress(TEST_HOTEL_ID)
      expect(progress?.status).toBe('COMPLETED')
    })

    it('should handle skip without changing state', async () => {
      const progress1 = await getOnboardingProgress(TEST_HOTEL_ID)
      await skipStep(TEST_HOTEL_ID, 'hotel-details')
      const progress2 = await getOnboardingProgress(TEST_HOTEL_ID)

      // State should transition to IN_PROGRESS
      expect(progress1?.status).toBe('PENDING')
      expect(progress2?.status).toBe('IN_PROGRESS')
    })
  })

  describe('Reset (Testing Only)', () => {
    beforeEach(async () => {
      await initializeOnboarding(TEST_HOTEL_ID)
    })

    it('should reset onboarding progress', async () => {
      await completeStep(TEST_HOTEL_ID, 'hotel-details')
      await resetOnboarding(TEST_HOTEL_ID)

      const progress = await getOnboardingProgress(TEST_HOTEL_ID)

      expect(progress?.status).toBe('PENDING')
      expect(progress?.completedSteps).toEqual([])
      expect(progress?.completedAt).toBeNull()
    })
  })
})
