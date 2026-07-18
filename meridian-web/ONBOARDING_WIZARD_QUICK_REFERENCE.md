# 🧙‍♂️ Onboarding Wizard - Quick Reference

> Fast access to common patterns and commands

---

## ⚡ Quick Start (2 minutes)

### 1. Import

```typescript
import { OnboardingWizard, useOnboardingWizard } from '@/components/onboarding-wizard'
```

### 2. Define Steps

```typescript
const steps = [
  {
    id: 'welcome',
    title: 'Welcome!',
    description: 'Let\'s get started',
    content: <div>Welcome content</div>,
  },
  // ... more steps
]
```

### 3. Add Component

```typescript
export function MyOnboarding() {
  const { open, setOpen, openWizard } = useOnboardingWizard()

  return (
    <>
      <Button onClick={openWizard}>Start</Button>
      
      <OnboardingWizard
        wizardId="my-wizard"
        steps={steps}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
```

---

## 📝 Common Patterns

### Pattern 1: Basic Wizard

```typescript
<OnboardingWizard
  wizardId="user-setup"
  steps={steps}
  open={open}
  onOpenChange={setOpen}
/>
```

### Pattern 2: With Completion Handler

```typescript
<OnboardingWizard
  wizardId="user-setup"
  steps={steps}
  open={open}
  onOpenChange={setOpen}
  onComplete={() => {
    router.push('/dashboard')
    toast.success('Complete!')
  }}
/>
```

### Pattern 3: Custom URL Parameter

```typescript
<OnboardingWizard
  wizardId="user-setup"
  steps={steps}
  queryParam="setup" // Use ?setup=step-id
  open={open}
  onOpenChange={setOpen}
/>
```

### Pattern 4: Auto-Open on Mount

```typescript
const { open, setOpen } = useOnboardingWizard(true) // Auto-open
```

### Pattern 5: No Close Button

```typescript
<OnboardingWizard
  showCloseButton={false} // Force completion
  steps={steps}
  open={open}
  onOpenChange={setOpen}
/>
```

---

## 🎨 Step Content Examples

### Example 1: Simple Text

```typescript
{
  id: 'welcome',
  title: 'Welcome!',
  description: 'Get started',
  content: (
    <div className="space-y-4">
      <p>Welcome to our platform!</p>
      <p>We'll guide you through setup.</p>
    </div>
  ),
}
```

### Example 2: Form Inputs

```typescript
{
  id: 'profile',
  title: 'Your Profile',
  description: 'Tell us about yourself',
  content: (
    <form className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </div>
    </form>
  ),
}
```

### Example 3: With Icon

```typescript
import { Rocket } from 'lucide-react'

{
  id: 'welcome',
  title: 'Welcome!',
  description: 'Get started',
  content: (
    <div className="flex flex-col items-center gap-4">
      <Rocket className="size-16 text-primary" />
      <p>Ready to launch!</p>
    </div>
  ),
}
```

### Example 4: Checklist

```typescript
{
  id: 'features',
  title: 'Key Features',
  description: 'What you can do',
  content: (
    <div className="space-y-3">
      {['Feature 1', 'Feature 2', 'Feature 3'].map((item) => (
        <div key={item} className="flex items-center gap-2">
          <Check className="size-5 text-green-500" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  ),
}
```

---

## 🔗 Deep-Linking Examples

### Create Deep Link

```typescript
const createDeepLink = (stepId: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set('onboarding', stepId)
  return url.toString()
}

// Usage
const link = createDeepLink('profile')
// Returns: "http://localhost:3000/page?onboarding=profile"
```

### Navigate to Step via URL

```typescript
const goToStep = (stepId: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set('onboarding', stepId)
  window.history.pushState({}, '', url.toString())
  setOpen(true)
}
```

### Share Step Link

```typescript
const shareStep = async (stepId: string) => {
  const url = createDeepLink(stepId)
  await navigator.clipboard.writeText(url)
  toast.success('Link copied!')
}
```

---

## 💾 State Management

### Clear Saved Progress

```typescript
localStorage.removeItem('onboarding-wizard-my-wizard')
```

### Check Current Progress

```typescript
const savedStep = localStorage.getItem('onboarding-wizard-my-wizard')
console.log('Saved at step:', savedStep)
```

### Manually Save Progress

```typescript
localStorage.setItem('onboarding-wizard-my-wizard', '2') // Save step 3 (index 2)
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **→** | Next step |
| **←** | Previous step |
| **Tab** | Navigate elements |
| **Shift+Tab** | Navigate backward |
| **Escape** | Close wizard |
| **Enter** | Activate button |

---

## 🎯 Props Quick Reference

```typescript
interface OnboardingWizardProps {
  wizardId?: string          // Default: 'default'
  steps: OnboardingStep[]    // Required
  open?: boolean             // Controlled state
  onOpenChange?: Function    // State change callback
  onComplete?: Function      // Completion callback
  showCloseButton?: boolean  // Default: true
  queryParam?: string        // Default: 'onboarding'
  className?: string         // Custom CSS
}
```

---

## 🧪 Testing Commands

```bash
# All tests
npm run test:e2e

# Onboarding tests only
npx playwright test e2e/onboarding-wizard.spec.ts

# Specific test
npx playwright test -g "should save progress"

# With UI
npm run test:e2e:ui

# Debug mode
npx playwright test --debug
```

---

## 🔍 Debugging

### Check if Wizard is Open

```typescript
console.log('Wizard open:', open)
```

### Check Saved Progress

```typescript
console.log(
  'Saved step:',
  localStorage.getItem('onboarding-wizard-my-wizard')
)
```

### Check URL Parameters

```typescript
const searchParams = new URLSearchParams(window.location.search)
console.log('URL step:', searchParams.get('onboarding'))
```

### Verify Steps

```typescript
console.log('Total steps:', steps.length)
console.log('Step IDs:', steps.map(s => s.id))
```

---

## ⚠️ Common Issues

### Issue: Progress not saving

**Solution:** Check wizardId is consistent
```typescript
// ❌ Bad
<OnboardingWizard wizardId="setup-1" />
<OnboardingWizard wizardId="setup-2" />

// ✅ Good
const WIZARD_ID = 'user-setup'
<OnboardingWizard wizardId={WIZARD_ID} />
```

### Issue: Deep-linking not working

**Solution:** Step ID must match exactly
```typescript
// Step definition
{ id: 'profile', ... }

// URL (case-sensitive!)
?onboarding=profile ✅
?onboarding=Profile ❌
```

### Issue: Arrow keys not working

**Solution:** Focus is on input (intentional)
```typescript
// Arrow keys disabled when typing in inputs
// This prevents navigation while user is typing
```

---

## 📚 Documentation Links

| Need | Link | Time |
|------|------|------|
| **Complete guide** | [ONBOARDING_WIZARD_GUIDE.md](./ONBOARDING_WIZARD_GUIDE.md) | 30 min |
| **Implementation details** | [ONBOARDING_WIZARD_IMPLEMENTATION_SUMMARY.md](./ONBOARDING_WIZARD_IMPLEMENTATION_SUMMARY.md) | 10 min |
| **Live demo** | `/onboarding-demo` | 5 min |
| **Source code** | `components/onboarding-wizard.tsx` | As needed |

---

## 🎯 Checklist

### Implementation
- [ ] Import component
- [ ] Define steps
- [ ] Add wizard to page
- [ ] Test navigation
- [ ] Test state persistence
- [ ] Test deep-linking

### Accessibility
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify focus management
- [ ] Check ARIA attributes

### Production
- [ ] Add error handling
- [ ] Add analytics tracking
- [ ] Test on mobile
- [ ] Test in production

---

**Version:** 1.0.0  
**Last Updated:** 2026-07-18  

**Need more help?** Check the [complete guide](./ONBOARDING_WIZARD_GUIDE.md)
