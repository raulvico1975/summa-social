'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  PartyPopper,
  X,
  Upload,
  FileSpreadsheet,
  Users,
  Landmark,
  FolderTree,
  Building2,
  UserPlus,
  Heart,
} from 'lucide-react';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Contact, Category, Organization, BankAccount } from '@/lib/data';

// Importadors
import { CategoryImporter } from '@/components/category-importer';
import { BankAccountImporter } from '@/components/bank-accounts/bank-account-importer';
import { MemberInviterImporter } from '@/components/member-inviter-importer';
import { EmployeeImporter } from '@/components/employee-importer';
import { SupplierImporter } from '@/components/supplier-importer';
import { DonorImporter } from '@/components/donor-importer';

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTÈNCIA D'ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════════

const ONBOARDING_STORAGE_KEY = 'summa.onboarding';

type SetupMode = 'manual' | 'import';

interface OnboardingState {
  inProgress: boolean;
  startedAt: string;
  setupMode?: SetupMode;
}

function getOnboardingState(orgId: string, userId: string): OnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${ONBOARDING_STORAGE_KEY}.${orgId}.${userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setOnboardingState(orgId: string, userId: string, state: OnboardingState | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${ONBOARDING_STORAGE_KEY}.${orgId}.${userId}`;
    if (state) {
      localStorage.setItem(key, JSON.stringify(state));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage errors
  }
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

type ImportItemId = 'categories' | 'bankAccounts' | 'members' | 'employees' | 'suppliers' | 'donors';

interface ImportCheckItem {
  id: ImportItemId;
  label: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
}

// IMPORTANT: aquests checks han de reflectir la font real de dades de cada pantalla.
// Totes les pantalles de contactes (Donants, Proveïdors, Treballadors) usen:
//   organizations/{orgId}/contacts amb where('type', '==', 'donor'|'supplier'|'employee')
// No canviar col·leccions aquí sense canviar també el manager corresponent.
function getImportChecklist(
  categories: Category[] | null,
  bankAccounts: BankAccount[] | null,
  contacts: Contact[] | null,
  t: typeof import('./../../i18n/ca').ca
): ImportCheckItem[] {
  // Separar contactes per tipus (camp type: 'donor' | 'supplier' | 'employee')
  // Font: mateixa que donor-manager.tsx, supplier-manager.tsx, employee-manager.tsx
  const suppliers = contacts?.filter(c => c.type === 'supplier') || [];
  const donors = contacts?.filter(c => c.type === 'donor') || [];
  const employees = contacts?.filter(c => c.type === 'employee') || [];

  return [
    {
      id: 'categories',
      label: t.onboarding?.steps?.categories ?? 'Categories',
      description: t.onboarding?.import?.categoriesDesc ?? 'Ingressos i despeses',
      icon: FolderTree,
      isComplete: (categories?.length || 0) > 0,
    },
    {
      id: 'bankAccounts',
      label: t.onboarding?.import?.bankAccounts ?? 'Comptes bancaris',
      description: t.onboarding?.import?.bankAccountsDesc ?? 'IBAN i noms dels comptes',
      icon: Landmark,
      isComplete: (bankAccounts?.length || 0) > 0,
    },
    {
      id: 'members',
      label: t.onboarding?.import?.members ?? 'Membres',
      description: t.onboarding?.import?.membersDesc ?? 'Invitacions massives per email',
      icon: UserPlus,
      isComplete: false, // No es pot detectar fàcilment si hi ha invitacions pendents
    },
    {
      id: 'employees',
      label: t.onboarding?.import?.employees ?? 'Treballadors',
      description: t.onboarding?.import?.employeesDesc ?? 'Nòmines i dietes',
      icon: Users,
      isComplete: employees.length > 0,
    },
    {
      id: 'suppliers',
      label: t.onboarding?.import?.suppliers ?? 'Proveïdors',
      description: t.onboarding?.import?.suppliersDesc ?? 'Contactes de pagament',
      icon: Building2,
      isComplete: suppliers.length > 0,
    },
    {
      id: 'donors',
      label: t.onboarding?.import?.donors ?? 'Donants',
      description: t.onboarding?.import?.donorsDesc ?? 'Contactes de donació',
      icon: Heart,
      isComplete: donors.length > 0,
    },
  ];
}

function getOnboardingChecks(
  organization: Organization | null,
  contacts: Contact[] | null,
  categories: Category[] | null,
  t: typeof import('./../../i18n/ca').ca
): OnboardingCheckResult[] {
  return [
    {
      step: 'organization',
      isComplete: !!(organization?.name && organization?.taxId && organization?.address && organization?.city && organization?.zipCode),
      isOptional: false,
      label: t.onboarding?.steps?.organization ?? "Dades de l'organització",
      description: t.onboarding?.steps?.organizationDesc ?? 'Nom, CIF i adreça fiscal',
      href: '/dashboard/configuracion',
    },
    {
      step: 'signature',
      isComplete: !!(organization?.signatureUrl && organization?.signatoryName && organization?.signatoryRole),
      isOptional: false,
      label: t.onboarding?.steps?.signature ?? 'Firma i signant',
      description: t.onboarding?.steps?.signatureDesc ?? 'Necessaris per emetre certificats',
      href: '/dashboard/configuracion',
    },
    {
      step: 'categories',
      isComplete: !!(categories && categories.length > 0),
      isOptional: false,
      label: t.onboarding?.steps?.categories ?? 'Categories',
      description: t.onboarding?.steps?.categoriesDesc ?? 'Crea o personalitza les categories',
      href: '/dashboard/configuracion',
    },
    {
      step: 'contacts',
      isComplete: !!(contacts && contacts.length > 0),
      isOptional: true,
      label: t.onboarding?.steps?.contacts ?? 'Contactes',
      description: t.onboarding?.steps?.contactsDesc ?? 'Importa donants o proveïdors',
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
  const { firestore, user } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  const searchParams = useSearchParams();

  // Estat del wizard
  const [setupMode, setSetupMode] = React.useState<SetupMode | null>(null);

  // Estats dels modals d'importació
  const [openImporter, setOpenImporter] = React.useState<ImportItemId | null>(null);

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

  const bankAccountsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'bankAccounts') : null,
    [firestore, organizationId]
  );
  const { data: bankAccounts } = useCollection<BankAccount>(bankAccountsQuery);

  // NOTE: No fem query separada d'employees perquè viuen a contacts amb type='employee'
  // Igual que fan donor-manager.tsx, supplier-manager.tsx i employee-manager.tsx

  const checks = React.useMemo(
    () => getOnboardingChecks(organization, contacts, categories, t),
    [organization, contacts, categories, t]
  );

  const importChecklist = React.useMemo(
    () => getImportChecklist(categories, bankAccounts, contacts, t),
    [categories, bankAccounts, contacts, t]
  );

  const progress = React.useMemo(() => computeProgress(checks), [checks]);
  const isComplete = React.useMemo(() => isOnboardingComplete(checks), [checks]);

  // Detectar si venim de configuració amb onboarding=1
  const isReturningFromOnboarding = searchParams.get('onboarding') === '1';

  // Reobrir modal automàticament si venim de configuració amb onboarding actiu
  React.useEffect(() => {
    if (!organizationId || !user?.uid) return;

    // Si venim amb ?onboarding=1, reobrir la modal
    if (isReturningFromOnboarding && !open) {
      onOpenChange(true);
      return;
    }

    // Si hi ha estat d'onboarding persistent i no està obert, reobrir
    const savedState = getOnboardingState(organizationId, user.uid);
    if (savedState?.inProgress && !open && !isComplete) {
      onOpenChange(true);
      // Restaurar setupMode si estava guardat
      if (savedState.setupMode) {
        setSetupMode(savedState.setupMode);
      }
    }
  }, [organizationId, user?.uid, isReturningFromOnboarding, open, isComplete, onOpenChange]);

  // Netejar estat quan l'onboarding es completa
  React.useEffect(() => {
    if (isComplete && organizationId && user?.uid) {
      setOnboardingState(organizationId, user.uid, null);
    }
  }, [isComplete, organizationId, user?.uid]);

  // Tancar modal
  const handleClose = () => {
    // Netejar estat persistent quan l'usuari tanca manualment
    if (organizationId && user?.uid) {
      setOnboardingState(organizationId, user.uid, null);
    }
    setSetupMode(null);
    onOpenChange(false);
  };

  // Seleccionar mode i guardar a Firestore
  const handleSelectMode = (mode: SetupMode) => {
    setSetupMode(mode);

    // Guardar a localStorage
    if (organizationId && user?.uid) {
      setOnboardingState(organizationId, user.uid, {
        inProgress: true,
        startedAt: new Date().toISOString(),
        setupMode: mode,
      });
    }

    // Guardar a Firestore (opcional, per tracking)
    if (organizationId) {
      setDocumentNonBlocking(
        doc(firestore, 'organizations', organizationId, 'onboarding', 'settings'),
        { setupMode: mode, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  };

  // Navegar a una secció i guardar estat
  const handleNavigate = (href: string) => {
    // Guardar estat abans de navegar
    if (organizationId && user?.uid) {
      setOnboardingState(organizationId, user.uid, {
        inProgress: true,
        startedAt: new Date().toISOString(),
        setupMode: setupMode ?? undefined,
      });
    }
    // Tancar el modal abans de navegar
    onOpenChange(false);
    // La navegació es fa via Link, no cal fer res més
  };

  // Obrir un importador
  const handleOpenImporter = (id: ImportItemId) => {
    setOpenImporter(id);
  };

  // Tancar importador
  const handleCloseImporter = () => {
    setOpenImporter(null);
  };

  // Tornar a la selecció de mode
  const handleBackToModeSelection = () => {
    setSetupMode(null);
    if (organizationId && user?.uid) {
      setOnboardingState(organizationId, user.uid, null);
    }
  };

  // Renderitzar contingut segons l'estat
  const renderContent = () => {
    // Pantalla de completat
    if (isComplete) {
      return (
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
      );
    }

    // Pantalla de selecció de mode (si no s'ha seleccionat)
    if (!setupMode) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight font-headline">
              {t.onboarding?.setupTitle ?? "Configuració inicial"}
            </DialogTitle>
            <DialogDescription>
              {t.onboarding?.modeSelection?.subtitle ?? "Com vols configurar la teva organització?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {/* Opció Manual */}
            <button
              onClick={() => handleSelectMode('manual')}
              className="w-full flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                <ArrowRight className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">{t.onboarding?.modeSelection?.manual ?? "Pas a pas"}</p>
                <p className="text-sm text-muted-foreground">
                  {t.onboarding?.modeSelection?.manualDesc ?? "Configura manualment cada secció. Ideal si comences de zero."}
                </p>
              </div>
            </button>

            {/* Opció Import */}
            <button
              onClick={() => handleSelectMode('import')}
              className="w-full flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                <Upload className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">{t.onboarding?.modeSelection?.import ?? "Importar dades"}</p>
                <p className="text-sm text-muted-foreground">
                  {t.onboarding?.modeSelection?.importDesc ?? "Carrega fitxers Excel amb categories, comptes, contactes i més."}
                </p>
              </div>
            </button>

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
      );
    }

    // Mode IMPORT: Checklist d'importació
    if (setupMode === 'import') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight font-headline flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t.onboarding?.importMode?.title ?? "Importar dades"}
            </DialogTitle>
            <DialogDescription>
              {t.onboarding?.importMode?.subtitle ?? "Carrega fitxers Excel per configurar ràpidament. Pots importar qualsevol combinació."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Llista d'imports */}
            <ul className="space-y-2">
              {importChecklist.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleOpenImporter(item.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group text-left"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 ${
                        item.isComplete ? 'bg-emerald-100' : 'bg-muted'
                      }`}>
                        <Icon className={`h-4 w-4 ${item.isComplete ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.isComplete ? 'text-muted-foreground' : ''}`}>
                          {item.label}
                          {item.isComplete && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 inline ml-2" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <Upload className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Botons d'acció */}
            <div className="pt-2 border-t space-y-2">
              <Button onClick={handleClose} className="w-full">
                {t.onboarding?.buttons?.finish ?? "Finalitzar"}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleBackToModeSelection}
              >
                {t.onboarding?.buttons?.back ?? "Tornar"}
              </Button>
            </div>
          </div>
        </>
      );
    }

    // Mode MANUAL: Flux existent amb progrés
    return (
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
            {checks.map((check) => {
              // Afegir ?onboarding=1 per poder tornar i reobrir la modal
              const hrefWithOnboarding = `${buildUrl(check.href)}?onboarding=1`;
              return (
              <li key={check.step}>
                <Link
                  href={hrefWithOnboarding}
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
              );
            })}
          </ul>

          {/* Botons d'acció */}
          <div className="pt-2 border-t space-y-2">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleBackToModeSelection}
            >
              {t.onboarding?.buttons?.back ?? "Tornar"}
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Modals d'importació */}
      <CategoryImporter
        open={openImporter === 'categories'}
        onOpenChange={(open) => !open && handleCloseImporter()}
      />
      <BankAccountImporter
        open={openImporter === 'bankAccounts'}
        onOpenChange={(open) => !open && handleCloseImporter()}
      />
      <MemberInviterImporter
        open={openImporter === 'members'}
        onOpenChange={(open) => !open && handleCloseImporter()}
      />
      <EmployeeImporter
        open={openImporter === 'employees'}
        onOpenChange={(open) => !open && handleCloseImporter()}
      />
      <SupplierImporter
        open={openImporter === 'suppliers'}
        onOpenChange={(open) => !open && handleCloseImporter()}
      />
      <DonorImporter
        open={openImporter === 'donors'}
        onOpenChange={(open) => !open && handleCloseImporter()}
      />
    </>
  );
}
