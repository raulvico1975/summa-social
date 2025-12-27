'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, PartyPopper } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { computeOnboardingStatus, getOnboardingChecks } from '@/lib/onboarding';
import type { Contact, Category } from '@/lib/data';

export function OnboardingWizard() {
  const { t } = useTranslations();
  const router = useRouter();
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

  const onboardingStatus = React.useMemo(
    () => computeOnboardingStatus(organization, contacts, categories),
    [organization, contacts, categories]
  );

  const checks = React.useMemo(
    () => getOnboardingChecks(organization, contacts, categories),
    [organization, contacts, categories]
  );

  const [isSkipping, setIsSkipping] = React.useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = React.useState(false);

  // Gestionar "Ho faré després"
  const handleSkip = async () => {
    if (!organizationId) return;
    setIsSkipping(true);
    try {
      const orgRef = doc(firestore, 'organizations', organizationId);
      await updateDoc(orgRef, {
        onboardingSkippedAt: new Date().toISOString(),
      });
      setShowSkipConfirmation(true);
      // Redirigir després de mostrar el missatge
      setTimeout(() => {
        router.push(buildUrl('/dashboard'));
      }, 2500);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      setIsSkipping(false);
    }
  };

  // Pantalla de confirmació després de saltar
  if (showSkipConfirmation) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-lg">
            {t.onboarding?.skipConfirmation ?? "D'acord. Pots continuar treballant."}
          </p>
          <p className="text-sm text-muted-foreground">
            {t.onboarding?.skipHint ?? "Si vols completar la configuració inicial més endavant, la trobaràs a Configuració."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Si l'onboarding ja està complet, mostrar pantalla final
  if (onboardingStatus.isComplete) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <PartyPopper className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight font-headline">
            {t.onboarding?.completeTitle ?? "Tot a punt!"}
          </CardTitle>
          <CardDescription>
            {t.onboarding?.completeDescription ?? "La configuració inicial s'ha completat. Ja pots començar a gestionar les finances de la teva organització."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href={buildUrl('/dashboard')}>
                {t.onboarding?.goToDashboard ?? "Anar al Dashboard"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={buildUrl('/dashboard/movimientos')}>
                {t.onboarding?.goToMovements ?? "Anar a Moviments"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pantalla de progrés amb checklist
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight font-headline">
          {t.onboarding?.setupTitle ?? "Configuració inicial"}
        </CardTitle>
        <CardDescription>
          {t.onboarding?.welcomeDescription ?? "Configura la teva organització en pocs passos per començar a gestionar les finances."}
        </CardDescription>
        <div className="pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{t.onboarding?.progress ?? "Progrés"}</span>
            <span>{onboardingStatus.progress}%</span>
          </div>
          <Progress value={onboardingStatus.progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {checks.map((check) => (
            <li key={check.step}>
              <Link
                href={buildUrl(check.href)}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                {check.isComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${check.isComplete ? 'text-muted-foreground line-through' : ''}`}>
                    {check.label}
                    {check.isOptional && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({t.onboarding?.optional ?? "opcional"})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {check.description}
                  </p>
                </div>
                {!check.isComplete && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Botó "Ho faré després" - visible sempre */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleSkip}
            disabled={isSkipping}
          >
            {isSkipping
              ? (t.common?.loading ?? "Carregant...")
              : (t.onboarding?.skipForNow ?? "Ho faré després")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
