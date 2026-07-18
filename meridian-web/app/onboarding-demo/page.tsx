import { Metadata } from 'next'
import { OnboardingDemo } from './onboarding-demo-client'

export const metadata: Metadata = {
  title: 'Onboarding Wizard Demo | Meridians',
  description: 'Interactive demonstration of the multi-step onboarding wizard',
}

/**
 * Onboarding Demo Page
 * 
 * Demonstrates the OnboardingWizard component with:
 * - Multiple example steps
 * - State persistence
 * - Deep-linking via URL
 * - Accessibility features
 */
export default function OnboardingDemoPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Onboarding Wizard Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Experience our accessible, multi-step onboarding flow with state persistence and deep-linking
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
          <FeatureCard
            title="State Persistence"
            description="Your progress is automatically saved. Reload the page and pick up where you left off."
            icon="💾"
          />
          <FeatureCard
            title="Deep Linking"
            description="Share or bookmark specific steps with URL parameters like ?onboarding=step-2"
            icon="🔗"
          />
          <FeatureCard
            title="Keyboard Navigation"
            description="Navigate with arrow keys, tab through elements, and use Escape to close."
            icon="⌨️"
          />
          <FeatureCard
            title="Screen Reader Support"
            description="Full ARIA support with live regions announcing step changes and focus management."
            icon="♿"
          />
        </div>

        {/* Demo component */}
        <OnboardingDemo />

        {/* Instructions */}
        <div className="mt-12 p-6 border rounded-lg bg-muted/50 space-y-4">
          <h2 className="text-xl font-semibold">Try These Features:</h2>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground">
            <li>Click "Start Onboarding" to begin the wizard</li>
            <li>Navigate through steps using Next/Back buttons or arrow keys</li>
            <li>Reload the page mid-flow - your progress is saved!</li>
            <li>Try deep-linking: add <code className="px-1 py-0.5 bg-muted rounded text-sm">?onboarding=step-3</code> to the URL</li>
            <li>Test keyboard navigation: Tab to focus elements, Escape to close</li>
            <li>Check focus management: focus returns to the trigger button on close</li>
          </ul>
        </div>

        {/* Code example */}
        <div className="mt-8 p-6 border rounded-lg bg-muted/50 space-y-4">
          <h2 className="text-xl font-semibold">Usage Example:</h2>
          <pre className="text-sm overflow-x-auto p-4 bg-background rounded border">
            <code>{`import { OnboardingWizard, useOnboardingWizard } from '@/components/onboarding-wizard'

const steps = [
  {
    id: 'welcome',
    title: 'Welcome!',
    description: 'Let\\'s get you started',
    content: <WelcomeContent />
  },
  // ... more steps
]

function MyApp() {
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
        onComplete={() => console.log('Done!')}
      />
    </>
  )
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="p-6 border rounded-lg space-y-3 bg-card hover:shadow-md transition-shadow">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
