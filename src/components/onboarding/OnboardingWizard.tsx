'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, PartyPopper, X } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Contact, Category, Organization } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS I UTILITATS INTERNES (no exposades)
// ═══════════════════════════════════════════════════════════════════════════════

type OnboardingStep = 'organization' | 'signature' | 'categories' | 'contacts';

interface OnboardingCheckResult {
  step: OnboardingStep;
  isComplete: boolean;
  isOptional: boolean;
  label: string;
  description: string;
  href: string;
}

const REQUIRED_STEPS: OnboardingStep[] = ['organization', 'signature', 'categories'];

function getOnboardingChecks(
  organization: Organization | null,
  contacts: Contact[] | null,
  categories: Category[] | null
): OnboardingCheckResult[] {
  return [
    {
      step: 'organization',
      isComplete: !!(organization?.name && organization?.taxId && organization?.address && organization?.city && organization?.zipCode),
      isOptional: false,
      label: "Dades de l'organització",
      description: 'Nom, CIF i adreça fiscal',
      href: '/dashboard/configuracion',
    },
    {
      step: 'signature',
      isComplete: !!(organization?.signatureUrl && organization?.signatoryName && organization?.signatoryRole),
      isOptional: false,
      label: 'Firma i signant',
      description: 'Necessaris per emetre certificats',
      href: '/dashboard/configuracion',
    },
    {
      step: 'categories',
      isComplete: !!(categories && categories.length > 0),
      isOptional: false,
      label: 'Categories',
      description: 'Crea o personalitza les categories',
      href: '/dashboard/configuracion',
    },
    {
      step: 'contacts',
      isComplete: !!(contacts && contacts.length > 0),
      isOptional: true,
      label: 'Contactes',
      description: 'Importa donants o proveïdors',
      href: '/dashboard/donants',
    },
  ];
}

function computeProgress(checks: OnboardingCheckResult[]): number {
  const requiredChecks = checks.filter(c => REQUIRED_STEPS.includes(c.step));
  const requiredCompleted = requiredChecks.filter(c => c.isComplete).length;
  return Math.round((requiredCompleted / requiredChecks.length) * 100);
}

function isOnboardingComplete(checks: OnboardingCheckResult[]): boolean {
  const requiredPending = checks.filter(c => REQUIRED_STEPS.includes(c.step) && !c.isComplete);
  return requiredPending.length === 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface OnboardingWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingWizardModal({ open, onOpenChange }: OnboardingWizardModalProps) {
  const { t } = useTranslations();
  const { firestore } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();

  // Carregar dades per computar estat
  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  const categoriesQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const checks = React.useMemo(
    () => getOnboardingChecks(organization, contacts, categories),
    [organization, contacts, categories]
  );

  const progress = React.useMemo(() => computeProgress(checks), [checks]);
  const isComplete = React.useMemo(() => isOnboardingComplete(checks), [checks]);

  // Tancar modal
  const handleClose = () => {
    onOpenChange(false);
  };

  // Navegar a una secció i tancar el modal
  const handleNavigate = (href: string) => {
    // Tancar el modal abans de navegar
    onOpenChange(false);
    // La navegació es fa via Link, no cal fer res més
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {isComplete ? (
          // Pantalla de completat
          <>
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <PartyPopper className="h-8 w-8 text-emerald-600" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight font-headline">
                {t.onboarding?.completeTitle ?? "Tot a punt!"}
              </DialogTitle>
              <DialogDescription>
                {t.onboarding?.completeDescription ?? "La configuració inicial s'ha completat. Ja pots començar a gestionar les finances de la teva organització."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">{t.onboarding?.summaryTitle ?? "Resum de configuració"}</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {checks.filter(c => c.isComplete).map(check => (
                    <li key={check.step} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {check.label}
                    </li>
                  ))}
                </ul>
              </div>
              <Button onClick={handleClose} className="w-full">
                {t.onboarding?.goToDashboard ?? "Anar al Dashboard"}
              </Button>
            </div>
          </>
        ) : (
          // Pantalla de progrés
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight font-headline">
                {t.onboarding?.setupTitle ?? "Configuració inicial"}
              </DialogTitle>
              <DialogDescription>
                {t.onboarding?.welcomeDescription ?? "Configura la teva organització en pocs passos per començar a gestionar les finances."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Barra de progrés */}
              <div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>{t.onboarding?.progress ?? "Progrés"}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Llista de passos */}
              <ul className="space-y-2">
                {checks.map((check) => (
                  <li key={check.step}>
                    <Link
                      href={buildUrl(check.href)}
                      onClick={() => handleNavigate(check.href)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      {check.isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${check.isComplete ? 'text-muted-foreground line-through' : ''}`}>
                          {check.label}
                          {check.isOptional && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              ({t.onboarding?.optional ?? "opcional"})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {check.description}
                        </p>
                      </div>
                      {!check.isComplete && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Botó tancar */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t.common?.close ?? "Tancar"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
