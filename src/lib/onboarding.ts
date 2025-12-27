/**
 * Onboarding status types and utilities
 */

import type { Organization, Contact, Category } from './data';

export type OnboardingStep =
  | 'organization'  // Dades bàsiques org (nom, CIF, adreça)
  | 'signature'     // Firma i signant per certificats
  | 'categories'    // Categories personalitzades (mínim 1 creada)
  | 'contacts'      // Almenys 1 contacte importat (opcional, es pot saltar)
  | 'complete';     // Tot configurat

export type OnboardingStatus = {
  isComplete: boolean;
  wasSkipped: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  pendingSteps: OnboardingStep[];
  progress: number; // 0-100
};

export type OnboardingCheckResult = {
  step: OnboardingStep;
  isComplete: boolean;
  isOptional: boolean;
  label: string;
  description: string;
  href: string;
};

/**
 * Passos requerits per considerar l'onboarding complet.
 * Contactes és opcional.
 */
const REQUIRED_STEPS: OnboardingStep[] = ['organization', 'signature', 'categories'];

/**
 * Computa l'estat d'onboarding basant-se en les dades reals.
 * Si l'admin ha saltat l'onboarding (onboardingSkippedAt), es considera complet.
 */
export function computeOnboardingStatus(
  organization: Organization | null,
  contacts: Contact[] | null,
  categories: Category[] | null
): OnboardingStatus {
  // Si s'ha saltat, l'onboarding es considera complet
  if (organization?.onboardingSkippedAt) {
    return {
      isComplete: true,
      wasSkipped: true,
      currentStep: 'complete',
      completedSteps: ['organization', 'signature', 'categories', 'contacts'],
      pendingSteps: [],
      progress: 100,
    };
  }

  const checks = getOnboardingChecks(organization, contacts, categories);
  const completedSteps = checks.filter(c => c.isComplete).map(c => c.step);
  const pendingSteps = checks.filter(c => !c.isComplete).map(c => c.step);

  // L'onboarding està complet si tots els passos REQUERITS estan fets
  const requiredPending = pendingSteps.filter(step => REQUIRED_STEPS.includes(step));
  const isComplete = requiredPending.length === 0;

  const currentStep = pendingSteps[0] || 'complete';

  // Progrés basat només en passos requerits
  const requiredChecks = checks.filter(c => REQUIRED_STEPS.includes(c.step));
  const requiredCompleted = requiredChecks.filter(c => c.isComplete).length;
  const progress = Math.round((requiredCompleted / requiredChecks.length) * 100);

  return {
    isComplete,
    wasSkipped: false,
    currentStep,
    completedSteps,
    pendingSteps,
    progress,
  };
}

/**
 * Retorna la llista de comprovacions d'onboarding amb el seu estat.
 */
export function getOnboardingChecks(
  organization: Organization | null,
  contacts: Contact[] | null,
  categories: Category[] | null
): OnboardingCheckResult[] {
  return [
    {
      step: 'organization',
      isComplete: checkOrganizationStep(organization),
      isOptional: false,
      label: 'Dades de l\'organització',
      description: 'Nom, CIF i adreça fiscal',
      href: '/dashboard/configuracio',
    },
    {
      step: 'signature',
      isComplete: checkSignatureStep(organization),
      isOptional: false,
      label: 'Firma i signant',
      description: 'Necessaris per emetre certificats',
      href: '/dashboard/configuracio',
    },
    {
      step: 'categories',
      isComplete: checkCategoriesStep(categories),
      isOptional: false,
      label: 'Categories',
      description: 'Crea o personalitza les categories',
      href: '/dashboard/configuracio',
    },
    {
      step: 'contacts',
      isComplete: checkContactsStep(contacts),
      isOptional: true,
      label: 'Contactes',
      description: 'Importa donants o proveïdors',
      href: '/dashboard/donants',
    },
  ];
}

/**
 * Comprova si les dades bàsiques de l'organització estan completes.
 */
function checkOrganizationStep(org: Organization | null): boolean {
  if (!org) return false;
  return !!(
    org.name &&
    org.taxId &&
    org.address &&
    org.city &&
    org.zipCode
  );
}

/**
 * Comprova si la firma i signant estan configurats.
 */
function checkSignatureStep(org: Organization | null): boolean {
  if (!org) return false;
  return !!(
    org.signatureUrl &&
    org.signatoryName &&
    org.signatoryRole
  );
}

/**
 * Comprova si hi ha categories personalitzades.
 */
function checkCategoriesStep(categories: Category[] | null): boolean {
  return !!(categories && categories.length > 0);
}

/**
 * Comprova si hi ha almenys un contacte.
 */
function checkContactsStep(contacts: Contact[] | null): boolean {
  return !!(contacts && contacts.length > 0);
}
