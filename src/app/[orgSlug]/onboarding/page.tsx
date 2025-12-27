'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <OnboardingWizard />
    </div>
  );
}
