'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Onboarding step definition
 */
export interface OnboardingStep {
  id: string
  title: string
  description: string
  content: React.ReactNode
}

/**
 * Props for the OnboardingWizard component
 */
export interface OnboardingWizardProps {
  /** Unique identifier for this wizard instance (used for localStorage key) */
  wizardId?: string
  /** Array of step definitions */
  steps: OnboardingStep[]
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Callback when wizard is completed */
  onComplete?: () => void
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** URL query parameter name for deep linking */
  queryParam?: string
  /** Custom CSS class for the dialog content */
  className?: string
}

const STORAGE_KEY_PREFIX = 'onboarding-wizard'
const DEFAULT_QUERY_PARAM = 'onboarding'

/**
 * OnboardingWizard Component
 * 
 * A fully accessible, multi-step onboarding wizard with:
 * - State persistence via localStorage
 * - Deep-linking via URL query parameters
 * - Focus management and keyboard navigation
 * - ARIA attributes for screen readers
 * - Progress indicators
 * 
 * @example
 * ```tsx
 * const steps = [
 *   {
 *     id: 'welcome',
 *     title: 'Welcome!',
 *     description: 'Let\'s get you started',
 *     content: <div>Welcome content</div>
 *   },
 *   // ... more steps
 * ]
 * 
 * <OnboardingWizard
 *   wizardId="user-onboarding"
 *   steps={steps}
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   onComplete={() => console.log('Completed!')}
 * />
 * ```
 */
export function OnboardingWizard({
  wizardId = 'default',
  steps,
  open: controlledOpen,
  onOpenChange,
  onComplete,
  showCloseButton = true,
  queryParam = DEFAULT_QUERY_PARAM,
  className,
}: OnboardingWizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Storage key for this wizard instance
  const storageKey = `${STORAGE_KEY_PREFIX}-${wizardId}`
  
  // Internal state for current step
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0)
  
  // Track if wizard is controlled or uncontrolled
  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = isControlled ? controlledOpen : uncontrolledOpen
  
  // Reference to the element that triggered the dialog (for focus restoration)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  
  // Reference to the dialog content for focus management
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  // Live region for announcing step changes to screen readers
  const liveRegionRef = React.useRef<HTMLDivElement>(null)

  /**
   * Load saved progress from localStorage
   */
  const loadSavedProgress = React.useCallback((): number => {
    if (typeof window === 'undefined') return 0
    
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const stepIndex = parseInt(saved, 10)
        if (!isNaN(stepIndex) && stepIndex >= 0 && stepIndex < steps.length) {
          return stepIndex
        }
      }
    } catch (error) {
      console.warn('Failed to load onboarding progress from localStorage:', error)
    }
    
    return 0
  }, [storageKey, steps.length])

  /**
   * Save progress to localStorage
   */
  const saveProgress = React.useCallback((stepIndex: number) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(storageKey, stepIndex.toString())
    } catch (error) {
      console.warn('Failed to save onboarding progress to localStorage:', error)
    }
  }, [storageKey])

  /**
   * Clear saved progress from localStorage
   */
  const clearProgress = React.useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear onboarding progress from localStorage:', error)
    }
  }, [storageKey])

  /**
   * Parse step ID from URL query parameter
   */
  const getStepFromQuery = React.useCallback((): number | null => {
    const stepId = searchParams.get(queryParam)
    if (!stepId) return null
    
    const stepIndex = steps.findIndex(step => step.id === stepId)
    return stepIndex !== -1 ? stepIndex : null
  }, [searchParams, queryParam, steps])

  /**
   * Update URL query parameter with current step
   */
  const updateQueryParam = React.useCallback((stepId: string | null) => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams(searchParams.toString())
    
    if (stepId) {
      params.set(queryParam, stepId)
    } else {
      params.delete(queryParam)
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
    router.replace(newUrl, { scroll: false })
  }, [searchParams, queryParam, router])

  /**
   * Initialize wizard state from URL or localStorage
   */
  React.useEffect(() => {
    if (!open) return
    
    // Priority 1: Check URL query parameter (deep linking)
    const queryStepIndex = getStepFromQuery()
    if (queryStepIndex !== null) {
      setCurrentStepIndex(queryStepIndex)
      saveProgress(queryStepIndex)
      return
    }
    
    // Priority 2: Load from localStorage
    const savedStepIndex = loadSavedProgress()
    setCurrentStepIndex(savedStepIndex)
    
    // Update URL to reflect current step
    if (savedStepIndex > 0) {
      updateQueryParam(steps[savedStepIndex].id)
    }
  }, [open, getStepFromQuery, loadSavedProgress, saveProgress, updateQueryParam, steps])

  /**
   * Handle step navigation
   */
  const goToStep = React.useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return
    
    setCurrentStepIndex(stepIndex)
    saveProgress(stepIndex)
    updateQueryParam(steps[stepIndex].id)
    
    // Announce step change to screen readers
    if (liveRegionRef.current) {
      const step = steps[stepIndex]
      liveRegionRef.current.textContent = `Step ${stepIndex + 1} of ${steps.length}: ${step.title}`
    }
    
    // Focus the dialog title for the new step
    setTimeout(() => {
      const titleElement = contentRef.current?.querySelector('[data-slot="dialog-title"]')
      if (titleElement instanceof HTMLElement) {
        titleElement.focus()
      }
    }, 100)
  }, [steps, saveProgress, updateQueryParam])

  /**
   * Navigation handlers
   */
  const handleNext = React.useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      goToStep(currentStepIndex + 1)
    }
  }, [currentStepIndex, steps.length, goToStep])

  const handleBack = React.useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1)
    }
  }, [currentStepIndex, goToStep])

  const handleComplete = React.useCallback(() => {
    clearProgress()
    updateQueryParam(null)
    
    // Announce completion to screen readers
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Onboarding completed!'
    }
    
    // Close the dialog
    if (isControlled) {
      onOpenChange?.(false)
    } else {
      setUncontrolledOpen(false)
    }
    
    // Call completion callback
    onComplete?.()
    
    // Restore focus to trigger element
    setTimeout(() => {
      if (triggerRef.current) {
        triggerRef.current.focus()
      }
    }, 100)
  }, [clearProgress, updateQueryParam, isControlled, onOpenChange, onComplete])

  /**
   * Handle dialog open/close
   */
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Clear URL query param when closing
      updateQueryParam(null)
      
      // Restore focus to trigger element
      setTimeout(() => {
        if (triggerRef.current) {
          triggerRef.current.focus()
        }
      }, 100)
    } else {
      // Store reference to the element that triggered the dialog
      if (document.activeElement instanceof HTMLElement) {
        triggerRef.current = document.activeElement
      }
    }
    
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setUncontrolledOpen(newOpen)
    }
  }, [isControlled, onOpenChange, updateQueryParam])

  /**
   * Keyboard navigation
   */
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' && !event.metaKey && !event.ctrlKey) {
      // Next step (if not on input/textarea)
      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault()
        handleNext()
      }
    } else if (event.key === 'ArrowLeft' && !event.metaKey && !event.ctrlKey) {
      // Previous step (if not on input/textarea)
      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault()
        handleBack()
      }
    }
  }, [handleNext, handleBack])

  // Current step data
  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  if (!currentStep) {
    console.warn('OnboardingWizard: No valid step found')
    return null
  }

  return (
    <>
      {/* Screen reader live region for announcements */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          ref={contentRef}
          className={cn('max-w-2xl', className)}
          showCloseButton={showCloseButton}
          onKeyDown={handleKeyDown}
          aria-labelledby="onboarding-wizard-title"
          aria-describedby="onboarding-wizard-description"
        >
          {/* Progress indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-t-lg overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={currentStepIndex + 1}
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-label={`Step ${currentStepIndex + 1} of ${steps.length}`}
            />
          </div>

          {/* Step counter */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 mt-2">
            <span aria-live="polite">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <div className="flex gap-1.5">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === currentStepIndex
                      ? 'bg-primary'
                      : index < currentStepIndex
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  )}
                  aria-label={`Step ${index + 1}: ${step.title}${
                    index === currentStepIndex
                      ? ' (current)'
                      : index < currentStepIndex
                      ? ' (completed)'
                      : ''
                  }`}
                  aria-current={index === currentStepIndex ? 'step' : undefined}
                />
              ))}
            </div>
          </div>

          {/* Step content */}
          <DialogHeader>
            <DialogTitle
              id="onboarding-wizard-title"
              tabIndex={-1}
              className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
            >
              {currentStep.title}
            </DialogTitle>
            <DialogDescription id="onboarding-wizard-description">
              {currentStep.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4" role="region" aria-label="Step content">
            {currentStep.content}
          </div>

          {/* Navigation footer */}
          <DialogFooter>
            <div className="flex items-center justify-between w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isFirstStep}
                aria-label="Go to previous step"
                className="gap-1"
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>

              <div className="flex gap-2">
                {!isLastStep ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    aria-label="Go to next step"
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleComplete}
                    aria-label="Complete onboarding"
                    className="gap-1"
                  >
                    <Check className="size-4" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Hook for managing onboarding wizard state
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { open, setOpen, openWizard } = useOnboardingWizard()
 *   
 *   return (
 *     <>
 *       <Button onClick={openWizard}>Start Onboarding</Button>
 *       <OnboardingWizard
 *         open={open}
 *         onOpenChange={setOpen}
 *         steps={steps}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
export function useOnboardingWizard(initialOpen = false) {
  const [open, setOpen] = React.useState(initialOpen)
  
  const openWizard = React.useCallback(() => {
    setOpen(true)
  }, [])
  
  const closeWizard = React.useCallback(() => {
    setOpen(false)
  }, [])
  
  return {
    open,
    setOpen,
    openWizard,
    closeWizard,
  }
}
