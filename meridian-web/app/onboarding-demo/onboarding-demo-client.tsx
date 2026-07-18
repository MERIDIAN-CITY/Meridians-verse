'use client'

import { useState } from 'react'
import { OnboardingWizard, useOnboardingWizard, OnboardingStep } from '@/components/onboarding-wizard'
import { Button } from '@/components/ui/button'
import { Rocket, Target, Zap, CheckCircle, User, Settings, Bell } from 'lucide-react'

/**
 * Client component for the onboarding demo
 */
export function OnboardingDemo() {
  const { open, setOpen, openWizard } = useOnboardingWizard()
  const [completionCount, setCompletionCount] = useState(0)

  const handleComplete = () => {
    setCompletionCount(prev => prev + 1)
    console.log('Onboarding completed!')
  }

  // Define onboarding steps
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Meridians!',
      description: 'Let\'s get you set up in just a few steps',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <Rocket className="size-24 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            </div>
          </div>
          
          <div className="space-y-4 text-center">
            <h3 className="text-xl font-semibold">
              Ready to boost your productivity?
            </h3>
            <p className="text-muted-foreground">
              We'll walk you through the basics to help you get the most out of Meridians.
              This will only take a couple of minutes.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Target className="size-8 text-primary/70" />
              </div>
              <p className="text-xs text-muted-foreground">Set Your Goals</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Zap className="size-8 text-primary/70" />
              </div>
              <p className="text-xs text-muted-foreground">Customize Settings</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <CheckCircle className="size-8 text-primary/70" />
              </div>
              <p className="text-xs text-muted-foreground">Get Started</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'profile',
      title: 'Create Your Profile',
      description: 'Tell us a bit about yourself',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-4">
            <User className="size-16 text-primary" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                aria-describedby="name-description"
              />
              <p id="name-description" className="text-xs text-muted-foreground">
                This is how others will see you on Meridians
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Your Role
              </label>
              <select
                id="role"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                aria-describedby="role-description"
              >
                <option value="">Select your role...</option>
                <option value="developer">Developer</option>
                <option value="designer">Designer</option>
                <option value="manager">Product Manager</option>
                <option value="founder">Founder</option>
                <option value="other">Other</option>
              </select>
              <p id="role-description" className="text-xs text-muted-foreground">
                Help us personalize your experience
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium">
                Bio (Optional)
              </label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                aria-describedby="bio-description"
              />
              <p id="bio-description" className="text-xs text-muted-foreground">
                Share a brief description about yourself
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'preferences',
      title: 'Customize Your Experience',
      description: 'Choose your preferences and settings',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-4">
            <Settings className="size-16 text-primary" />
          </div>

          <div className="space-y-6">
            {/* Theme preference */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Appearance</h4>
              <div className="grid grid-cols-3 gap-3">
                {['light', 'dark', 'system'].map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    className="p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring capitalize"
                    aria-label={`Select ${theme} theme`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification preferences */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Notifications</h4>
              <div className="space-y-3">
                {[
                  { id: 'email', label: 'Email notifications', description: 'Receive updates via email' },
                  { id: 'push', label: 'Push notifications', description: 'Get real-time alerts' },
                  { id: 'digest', label: 'Daily digest', description: 'Summary of your activity' },
                ].map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded focus:ring-2 focus:ring-ring"
                      aria-describedby={`${option.id}-description`}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-medium">{option.label}</div>
                      <p id={`${option.id}-description`} className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Focus mode */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Focus Mode</h4>
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Default focus duration</span>
                  <select className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-ring">
                    <option>25 minutes</option>
                    <option>50 minutes</option>
                    <option>90 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'notifications',
      title: 'Stay Connected',
      description: 'Enable notifications to never miss an update',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-4">
            <Bell className="size-16 text-primary" />
          </div>

          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">
                Get notified about important updates
              </h3>
              <p className="text-muted-foreground">
                We'll let you know about milestone achievements, team mentions, and payment updates.
              </p>
            </div>

            <div className="grid gap-3 pt-4">
              {[
                { title: 'Milestone Achievements', description: 'Celebrate your accomplishments' },
                { title: 'Team Mentions', description: 'Stay in the loop with your team' },
                { title: 'Payment Updates', description: 'Track your earnings in real-time' },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                  <CheckCircle className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{item.title}</div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button type="button" className="w-full" variant="outline">
                Enable Browser Notifications
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              You can change these settings anytime in your preferences
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Welcome to the Meridians community',
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <CheckCircle className="size-24 text-green-500 animate-pulse" />
              <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
            </div>
          </div>

          <div className="space-y-4 text-center">
            <h3 className="text-2xl font-bold">
              Congratulations! 🎉
            </h3>
            <p className="text-muted-foreground">
              Your account is ready. Let's start building something amazing together.
            </p>
          </div>

          <div className="grid gap-4 pt-4">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">1</span>
                </div>
                <h4 className="font-semibold text-sm">Explore the Dashboard</h4>
              </div>
              <p className="text-xs text-muted-foreground ml-10">
                Check out your personalized dashboard and start tracking your productivity
              </p>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">2</span>
                </div>
                <h4 className="font-semibold text-sm">Start Your First Session</h4>
              </div>
              <p className="text-xs text-muted-foreground ml-10">
                Begin earning by starting a focused work session
              </p>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">3</span>
                </div>
                <h4 className="font-semibold text-sm">Join the Community</h4>
              </div>
              <p className="text-xs text-muted-foreground ml-10">
                Connect with other users and share your experience
              </p>
            </div>
          </div>

          <div className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Need help getting started?{' '}
              <a href="#" className="text-primary hover:underline">
                View our guides
              </a>
            </p>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Trigger button */}
      <Button
        size="lg"
        onClick={openWizard}
        className="gap-2"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Rocket className="size-5" />
        Start Onboarding
      </Button>

      {/* Completion counter */}
      {completionCount > 0 && (
        <div className="text-center space-y-2 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            ✅ Onboarding completed {completionCount} {completionCount === 1 ? 'time' : 'times'}!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Try it again or test deep-linking with URL parameters
          </p>
        </div>
      )}

      {/* Deep link examples */}
      <div className="flex flex-wrap gap-2 justify-center">
        <p className="text-sm text-muted-foreground w-full text-center mb-2">
          Try deep-linking to specific steps:
        </p>
        {steps.map((step, index) => (
          <Button
            key={step.id}
            size="sm"
            variant="outline"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('onboarding', step.id)
              window.history.pushState({}, '', url.toString())
              setOpen(true)
            }}
            className="text-xs"
          >
            Step {index + 1}: {step.title}
          </Button>
        ))}
      </div>

      {/* Onboarding wizard */}
      <OnboardingWizard
        wizardId="demo-wizard"
        steps={steps}
        open={open}
        onOpenChange={setOpen}
        onComplete={handleComplete}
        queryParam="onboarding"
      />
    </div>
  )
}
