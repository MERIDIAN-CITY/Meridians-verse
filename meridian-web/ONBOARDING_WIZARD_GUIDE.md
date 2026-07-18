# 🧙‍♂️ Onboarding Wizard - Complete Guide

> A fully accessible, multi-step onboarding wizard with state persistence and deep-linking

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Accessibility](#accessibility)
- [State Management](#state-management)
- [Deep-Linking](#deep-linking)
- [Customization](#customization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

---

## 🎯 Overview

The OnboardingWizard component provides a production-ready, accessible multi-step dialog for guiding users through initial setup, configuration, or feature discovery flows.

### Key Capabilities

✅ **Multi-Step Navigation** - Linear step progression with Next/Back controls  
✅ **State Persistence** - Automatic localStorage saving and restoration  
✅ **Deep-Linking** - URL-based step navigation  
✅ **Accessibility** - Full WCAG 2.1 AA compliance  
✅ **Focus Management** - Automatic focus trapping and restoration  
✅ **Keyboard Navigation** - Arrow keys, Tab, and Escape support  
✅ **Progress Tracking** - Visual progress bar and step indicators  
✅ **Screen Reader Support** - ARIA live regions and descriptive labels  

---

## ✨ Features

### 1. State Persistence

Progress is automatically saved to `localStorage` and restored on reload:

```typescript
// Automatically handled - no code needed!
// User on step 3 → reload page → resumes at step 3
```

**Benefits:**
- Users never lose progress
- Seamless experience across sessions
- No server-side state needed

### 2. Deep-Linking

Navigate directly to specific steps via URL parameters:

```
https://app.com/onboarding?onboarding=step-3
```

**Use Cases:**
- Share specific onboarding steps
- Jump to configuration sections
- Support documentation links
- Email campaign links

### 3. Accessibility

Full WCAG 2.1 AA compliance:

- ✅ Focus trapping within dialog
- ✅ Focus restoration on close
- ✅ ARIA live regions for announcements
- ✅ Keyboard navigation (arrows, Tab, Escape)
- ✅ Screen reader announcements
- ✅ Semantic HTML structure

### 4. Progress Tracking

Visual indicators for user orientation:

- Animated progress bar
- Step counter (Step 1 of 5)
- Dot indicators showing completed/current/upcoming steps

---

## 📦 Installation

The wizard is already included in the project:

```typescript
import { OnboardingWizard, useOnboardingWizard } from '@/components/onboarding-wizard'
```

**Dependencies:**
- `@radix-ui/react-dialog` (already installed)
- `next/navigation` (Next.js App Router)
- `lucide-react` (icons)

---

## 🚀 Basic Usage

### Step 1: Define Your Steps

```typescript
import { OnboardingStep } from '@/components/onboarding-wizard'

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome!',
    description: 'Let\'s get you started',
    content: (
      <div>
        <h3>Welcome to our platform!</h3>
        <p>We'll guide you through the setup process.</p>
      </div>
    ),
  },
  {
    id: 'profile',
    title: 'Create Your Profile',
    description: 'Tell us about yourself',
    content: (
      <form>
        <input type="text" placeholder="Your name" />
        <textarea placeholder="Bio" />
      </form>
    ),
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Ready to get started',
    content: (
      <div>
        <p>✅ Setup complete!</p>
      </div>
    ),
  },
]
```

### Step 2: Add the Wizard Component

```typescript
'use client'

import { OnboardingWizard, useOnboardingWizard } from '@/components/onboarding-wizard'
import { Button } from '@/components/ui/button'

export function MyOnboarding() {
  const { open, setOpen, openWizard } = useOnboardingWizard()

  return (
    <>
      <Button onClick={openWizard}>
        Start Onboarding
      </Button>

      <OnboardingWizard
        wizardId="user-onboarding"
        steps={steps}
        open={open}
        onOpenChange={setOpen}
        onComplete={() => console.log('Completed!')}
      />
    </>
  )
}
```

### Step 3: Use in Your App

```typescript
// app/dashboard/page.tsx
import { MyOnboarding } from '@/components/my-onboarding'

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <MyOnboarding />
    </div>
  )
}
```

---

## 🔧 Advanced Usage

### Controlled vs Uncontrolled

#### Controlled (Recommended)

```typescript
const [open, setOpen] = useState(false)

<OnboardingWizard
  open={open}
  onOpenChange={setOpen}
  // ... other props
/>
```

#### Uncontrolled

```typescript
<OnboardingWizard
  // No open/onOpenChange props
  // Manage internally
  // ... other props
/>
```

### Custom Storage Keys

```typescript
<OnboardingWizard
  wizardId="user-setup" // Creates 'onboarding-wizard-user-setup' key
  // ... other props
/>
```

### Custom URL Parameters

```typescript
<OnboardingWizard
  queryParam="setup" // Use ?setup=step-2 instead of ?onboarding=step-2
  // ... other props
/>
```

### Programmatic Navigation

```typescript
// Deep link to specific step
const url = new URL(window.location.href)
url.searchParams.set('onboarding', 'profile')
window.history.pushState({}, '', url.toString())
setOpen(true) // Opens wizard at 'profile' step
```

### Completion Handling

```typescript
<OnboardingWizard
  onComplete={() => {
    // Track analytics
    analytics.track('onboarding_completed')
    
    // Navigate to dashboard
    router.push('/dashboard')
    
    // Show success toast
    toast.success('Welcome aboard!')
  }}
  // ... other props
/>
```

---

## 📚 API Reference

### OnboardingWizard Props

```typescript
interface OnboardingWizardProps {
  /** Unique identifier for localStorage key (default: 'default') */
  wizardId?: string
  
  /** Array of step definitions */
  steps: OnboardingStep[]
  
  /** Controlled open state */
  open?: boolean
  
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  
  /** Callback when wizard is completed */
  onComplete?: () => void
  
  /** Whether to show the X close button (default: true) */
  showCloseButton?: boolean
  
  /** URL query parameter name (default: 'onboarding') */
  queryParam?: string
  
  /** Custom CSS class for dialog content */
  className?: string
}
```

### OnboardingStep Interface

```typescript
interface OnboardingStep {
  /** Unique step identifier (used in URLs) */
  id: string
  
  /** Step title (shown in header) */
  title: string
  
  /** Step description (shown below title) */
  description: string
  
  /** Step content (any React node) */
  content: React.ReactNode
}
```

### useOnboardingWizard Hook

```typescript
const {
  open,        // Current open state
  setOpen,     // Set open state
  openWizard,  // Helper to open (setOpen(true))
  closeWizard, // Helper to close (setOpen(false))
} = useOnboardingWizard(initialOpen?: boolean)
```

---

## ♿ Accessibility

### Focus Management

The wizard automatically manages focus:

1. **On Open:** Stores reference to trigger element
2. **During:** Traps focus within dialog
3. **On Close:** Restores focus to trigger element
4. **On Step Change:** Focuses the step title

```typescript
// Automatic focus flow:
<Button onClick={openWizard}>Start</Button> // 1. Focus here
  ↓
Dialog Opens // 2. Focus trapped inside
  ↓
User navigates steps // 3. Focus on each new title
  ↓
Dialog Closes // 4. Focus returns to Button
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| **Tab** | Navigate through interactive elements |
| **Shift+Tab** | Navigate backwards |
| **Escape** | Close dialog |
| **→ (Right Arrow)** | Next step (when not in input) |
| **← (Left Arrow)** | Previous step (when not in input) |
| **Enter** | Activate focused button |

### Screen Reader Support

**ARIA Attributes:**
```html
<div role="dialog" aria-labelledby="title" aria-describedby="description">
  <div role="progressbar" aria-valuenow="2" aria-valuemin="1" aria-valuemax="5">
  <div role="status" aria-live="polite">Step 2 of 5: Create Profile</div>
</div>
```

**Announcements:**
- Step changes: "Step 2 of 5: Create Profile"
- Completion: "Onboarding completed!"
- Progress updates: "Step 3 of 5"

### Testing Accessibility

```bash
# Keyboard-only testing
# 1. Tab through all elements
# 2. Verify focus indicators visible
# 3. Test arrow key navigation
# 4. Test Escape to close
# 5. Verify focus restoration

# Screen reader testing
# - Use NVDA (Windows) or VoiceOver (Mac)
# - Navigate through wizard
# - Verify all announcements
# - Check form labels
```

---

## 💾 State Management

### localStorage Keys

```
onboarding-wizard-{wizardId}
```

**Example:**
```typescript
<OnboardingWizard wizardId="user-setup" />
// Creates key: 'onboarding-wizard-user-setup'
```

### Storage Format

```typescript
// Stored value: step index as string
localStorage.getItem('onboarding-wizard-user-setup')
// Returns: "2" (for step index 2)
```

### State Priority

When the wizard opens, state is resolved in this order:

1. **URL Query Parameter** (highest priority)
2. **localStorage**
3. **Default (step 0)**

```typescript
// Example flow:
// User opens: ?onboarding=step-3
// → Jumps to step 3, saves to localStorage
//
// User reloads without query param
// → Loads from localStorage (step 3)
//
// User clears cache
// → Starts at step 0
```

### Clearing Progress

Progress is automatically cleared when:
- User clicks "Complete" button
- `onComplete` callback is triggered

**Manual clearing:**
```typescript
localStorage.removeItem('onboarding-wizard-user-setup')
```

---

## 🔗 Deep-Linking

### URL Format

```
https://yourapp.com/page?onboarding=step-id
```

### Examples

```typescript
// Step definitions
const steps = [
  { id: 'welcome', ... },
  { id: 'profile', ... },
  { id: 'settings', ... },
]

// Deep link URLs
?onboarding=welcome   // Opens at step 1
?onboarding=profile   // Opens at step 2
?onboarding=settings  // Opens at step 3
```

### Sharing Links

```typescript
// Create shareable link
const shareStep = (stepId: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set('onboarding', stepId)
  
  navigator.clipboard.writeText(url.toString())
  toast.success('Link copied!')
}

// Usage
<Button onClick={() => shareStep('profile')}>
  Share Profile Step
</Button>
```

### Email Campaigns

```html
<!-- Email template -->
<a href="https://app.com/onboarding?onboarding=welcome">
  Complete your setup
</a>
```

### Documentation Links

```markdown
Need help with your profile?
[Jump to profile setup](https://app.com/onboarding?onboarding=profile)
```

---

## 🎨 Customization

### Custom Styling

```typescript
<OnboardingWizard
  className="max-w-4xl" // Wider dialog
  steps={steps}
  // ... other props
/>
```

### Custom Content

```typescript
const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome!',
    description: 'Get started',
    content: (
      <div className="space-y-6">
        {/* Your custom components */}
        <CustomForm />
        <CustomChart />
        <CustomVideo src="/intro.mp4" />
      </div>
    ),
  },
]
```

### Custom Icons

```typescript
import { Rocket, Shield, Zap } from 'lucide-react'

const steps = [
  {
    id: 'security',
    title: 'Security',
    description: 'Keep your account safe',
    content: (
      <div className="flex items-center gap-4">
        <Shield className="size-12 text-primary" />
        <p>Setup two-factor authentication</p>
      </div>
    ),
  },
]
```

### Conditional Steps

```typescript
const getSteps = (userType: string) => {
  const baseSteps = [
    { id: 'welcome', ... },
    { id: 'profile', ... },
  ]
  
  if (userType === 'admin') {
    baseSteps.push({ id: 'admin-settings', ... })
  }
  
  return baseSteps
}

<OnboardingWizard steps={getSteps(user.type)} />
```

---

## 🧪 Testing

### Unit Tests (Example)

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingWizard } from '@/components/onboarding-wizard'

describe('OnboardingWizard', () => {
  const steps = [
    { id: 'step1', title: 'Step 1', description: 'First', content: <div>Content 1</div> },
    { id: 'step2', title: 'Step 2', description: 'Second', content: <div>Content 2</div> },
  ]

  it('renders first step', () => {
    render(<OnboardingWizard open steps={steps} />)
    expect(screen.getByText('Step 1')).toBeInTheDocument()
  })

  it('navigates to next step', () => {
    render(<OnboardingWizard open steps={steps} />)
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('disables back button on first step', () => {
    render(<OnboardingWizard open steps={steps} />)
    expect(screen.getByText('Back')).toBeDisabled()
  })
})
```

### E2E Tests (Playwright Example)

```typescript
test('onboarding wizard flow', async ({ page }) => {
  await page.goto('/onboarding-demo')
  
  // Open wizard
  await page.click('text=Start Onboarding')
  
  // Verify first step
  await expect(page.locator('text=Step 1 of 5')).toBeVisible()
  
  // Navigate through steps
  await page.click('text=Next')
  await expect(page.locator('text=Step 2 of 5')).toBeVisible()
  
  // Test keyboard navigation
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('text=Step 3 of 5')).toBeVisible()
  
  // Complete wizard
  await page.click('text=Next')
  await page.click('text=Next')
  await page.click('text=Complete')
  
  // Verify closed
  await expect(page.locator('[role="dialog"]')).not.toBeVisible()
})

test('state persistence', async ({ page }) => {
  await page.goto('/onboarding-demo')
  await page.click('text=Start Onboarding')
  
  // Navigate to step 3
  await page.click('text=Next')
  await page.click('text=Next')
  
  // Reload page
  await page.reload()
  
  // Verify resumed at step 3
  await page.click('text=Start Onboarding')
  await expect(page.locator('text=Step 3 of 5')).toBeVisible()
})

test('deep linking', async ({ page }) => {
  // Navigate with query param
  await page.goto('/onboarding-demo?onboarding=step-3')
  
  // Verify wizard opens at step 3
  await expect(page.locator('text=Step 3 of 5')).toBeVisible()
})
```

---

## 🔍 Troubleshooting

### Issue: Progress not saving

**Symptoms:** Progress resets on page reload

**Solutions:**
1. Check localStorage is available:
   ```typescript
   console.log('localStorage available:', typeof window !== 'undefined' && 'localStorage' in window)
   ```

2. Check browser privacy settings (localStorage may be disabled)

3. Verify wizardId is consistent:
   ```typescript
   // ❌ Bad - different IDs
   <OnboardingWizard wizardId="onboarding-1" />
   <OnboardingWizard wizardId="onboarding-2" />
   
   // ✅ Good - same ID
   const WIZARD_ID = 'user-onboarding'
   <OnboardingWizard wizardId={WIZARD_ID} />
   ```

### Issue: Deep-linking not working

**Symptoms:** URL parameter doesn't open correct step

**Solutions:**
1. Verify step ID matches:
   ```typescript
   // Step definition
   { id: 'profile', ... }
   
   // URL must match exactly
   ?onboarding=profile ✅
   ?onboarding=Profile ❌ (case-sensitive)
   ```

2. Check query param name:
   ```typescript
   <OnboardingWizard queryParam="onboarding" />
   // Use: ?onboarding=step-id
   
   <OnboardingWizard queryParam="setup" />
   // Use: ?setup=step-id
   ```

3. Ensure wizard is opened after setting URL:
   ```typescript
   // ❌ Wrong order
   setOpen(true)
   updateURL()
   
   // ✅ Correct order
   updateURL()
   setOpen(true)
   ```

### Issue: Focus not trapping

**Symptoms:** Tab key escapes dialog

**Solutions:**
1. Verify Radix Dialog is working:
   ```typescript
   // Check Dialog is rendering
   console.log('Dialog open:', open)
   ```

2. Ensure no conflicting z-index:
   ```css
   /* Dialog should be highest z-index */
   .dialog-overlay { z-index: 50; }
   ```

3. Check for portal issues:
   ```typescript
   // Dialog renders in portal by default
   // Should appear at end of <body>
   ```

### Issue: Keyboard navigation not working

**Symptoms:** Arrow keys don't navigate

**Solutions:**
1. Check if focus is on input/textarea:
   ```typescript
   // Arrow keys disabled when typing
   // This is intentional behavior
   ```

2. Verify keyboard event handler:
   ```typescript
   // Check console for errors
   console.log('Keyboard handler registered')
   ```

---

## 📝 Examples

### Example 1: User Registration

```typescript
const registrationSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome!',
    description: 'Create your account',
    content: <WelcomeScreen />,
  },
  {
    id: 'email',
    title: 'Email Verification',
    description: 'Verify your email address',
    content: <EmailVerification />,
  },
  {
    id: 'password',
    title: 'Set Password',
    description: 'Choose a secure password',
    content: <PasswordForm />,
  },
  {
    id: 'complete',
    title: 'Account Created!',
    description: 'You\'re all set',
    content: <CompletionScreen />,
  },
]

function Registration() {
  const { open, setOpen } = useOnboardingWizard(true) // Auto-open
  const router = useRouter()

  return (
    <OnboardingWizard
      wizardId="registration"
      steps={registrationSteps}
      open={open}
      onOpenChange={setOpen}
      onComplete={() => router.push('/dashboard')}
      showCloseButton={false} // Prevent skipping
    />
  )
}
```

### Example 2: Feature Tour

```typescript
const featureTourSteps: OnboardingStep[] = [
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'Overview of key metrics',
    content: <DashboardTour />,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Track your performance',
    content: <AnalyticsTour />,
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Customize your experience',
    content: <SettingsTour />,
  },
]

function FeatureTour() {
  const { open, setOpen, openWizard } = useOnboardingWizard()

  return (
    <>
      <Button variant="outline" onClick={openWizard}>
        📚 Take a Tour
      </Button>

      <OnboardingWizard
        wizardId="feature-tour"
        steps={featureTourSteps}
        open={open}
        onOpenChange={setOpen}
        queryParam="tour"
      />
    </>
  )
}
```

### Example 3: Settings Wizard

```typescript
const settingsSteps: OnboardingStep[] = [
  {
    id: 'profile',
    title: 'Profile Settings',
    description: 'Update your profile information',
    content: <ProfileSettings />,
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Customize your experience',
    content: <PreferenceSettings />,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage notification settings',
    content: <NotificationSettings />,
  },
]

function SettingsWizard() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState({})

  const handleComplete = async () => {
    await saveSettings(settings)
    toast.success('Settings saved!')
  }

  return (
    <OnboardingWizard
      wizardId="settings"
      steps={settingsSteps}
      open={open}
      onOpenChange={setOpen}
      onComplete={handleComplete}
    />
  )
}
```

---

## 🎯 Best Practices

### DO ✅

- Keep steps concise (3-7 steps ideal)
- Provide clear titles and descriptions
- Show progress indicators
- Allow users to go back
- Save progress automatically
- Restore focus on close
- Use semantic HTML
- Test with keyboard only
- Test with screen readers
- Handle errors gracefully

### DON'T ❌

- Make steps too long or complex
- Force users through unnecessary steps
- Disable the back button without reason
- Forget to handle completion
- Ignore accessibility
- Skip focus management
- Use confusing navigation
- Force completion without exit option

---

## 📚 Additional Resources

### Related Documentation
- [Dialog Component](./components/ui/dialog.tsx)
- [Button Component](./components/ui/button.tsx)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog)

### Accessibility Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### Testing Tools
- [Playwright](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

## ✅ Summary

The OnboardingWizard component provides:

✅ **Multi-step navigation** with intuitive controls  
✅ **State persistence** via localStorage  
✅ **Deep-linking** via URL parameters  
✅ **Full accessibility** with WCAG 2.1 AA compliance  
✅ **Focus management** with automatic trapping and restoration  
✅ **Keyboard support** for power users  
✅ **Screen reader support** with ARIA live regions  
✅ **Progress tracking** with visual indicators  
✅ **Customization** options for any use case  

**Status**: ✅ **Production Ready**

---

**Last Updated**: 2026-07-18  
**Version**: 1.0.0  
**Maintained By**: Frontend Team

---

**Questions?** Check the [demo page](/onboarding-demo) or reach out to the team.
