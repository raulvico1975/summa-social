'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface WelcomeOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartGuide: () => void;
  onSkip: () => void;
}

export function WelcomeOnboardingModal({
  open,
  onOpenChange,
  onStartGuide,
  onSkip,
}: WelcomeOnboardingModalProps) {
  const { t } = useTranslations();
  const { organizationId, organization } = useCurrentOrganization();
  const { firestore } = useFirebase();
  const [isMarking, setIsMarking] = React.useState(false);

  // Marcar welcomeSeenAt a Firestore
  const markWelcomeSeen = React.useCallback(async () => {
    if (!organizationId || isMarking) return;
    // Evitar dobles crides
    if (organization?.onboarding?.welcomeSeenAt) return;

    setIsMarking(true);
    try {
      const orgRef = doc(firestore, 'organizations', organizationId);
      await updateDoc(orgRef, {
        'onboarding.welcomeSeenAt': new Date().toISOString().split('T')[0], // YYYY-MM-DD
      });
    } catch (error) {
      console.error('Error marking welcome seen:', error);
    }
  }, [organizationId, firestore, isMarking, organization?.onboarding?.welcomeSeenAt]);

  // Gestionar "Guia'm"
  const handleStartGuide = async () => {
    await markWelcomeSeen();
    onOpenChange(false);
    onStartGuide();
  };

  // Gestionar "Començar pel meu compte"
  const handleSkip = async () => {
    await markWelcomeSeen();
    onOpenChange(false);
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {t.onboarding?.welcome?.title ?? "Benvingut a Summa Social"}
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-2">
            <p>
              {t.onboarding?.welcome?.body1 ??
                "Et guiarem pels passos bàsics per configurar la teva organització: dades fiscals, firma per certificats i categories de moviments."}
            </p>
            <p>
              {t.onboarding?.welcome?.body2 ??
                "Pots fer-ho ara o més endavant des de Configuració."}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleStartGuide} className="w-full">
            {t.onboarding?.welcome?.ctaGuide ?? "Guia'm"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleSkip} className="w-full">
            {t.onboarding?.welcome?.ctaSkip ?? "Començar pel meu compte"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
