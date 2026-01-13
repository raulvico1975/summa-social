'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Donor, BankAccount, SepaCollectionRun, SepaCollectionItem, SepaSequenceType } from '@/lib/data';
import { generatePain008Xml, generateMessageId, validateCollectionRun, filterEligibleDonors, determineSequenceType } from '@/lib/sepa/pain008';
import { ArrowLeft, ArrowRight, Download, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Step components
import { StepConfig, type ConfigData } from './StepConfig';
import { StepSelection, type SelectionData } from './StepSelection';
import { StepReview } from './StepReview';

type WizardStep = 'config' | 'selection' | 'review';

const STEPS: WizardStep[] = ['config', 'selection', 'review'];

export function SepaCollectionWizard() {
  const router = useRouter();
  const { firestore, auth } = useFirebase();
  const { organizationId, organization, orgSlug } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Current step
  const [currentStep, setCurrentStep] = React.useState<WizardStep>('config');
  const [isExporting, setIsExporting] = React.useState(false);

  // Data collections
  const bankAccountsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'bankAccounts') : null,
    [firestore, organizationId]
  );
  const { data: bankAccounts, isLoading: isLoadingAccounts } = useCollection<BankAccount>(bankAccountsCollection);

  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const donorsQuery = useMemoFirebase(
    () => contactsCollection ? query(contactsCollection, where('type', '==', 'donor')) : null,
    [contactsCollection]
  );
  const { data: donorsRaw, isLoading: isLoadingDonors } = useCollection<Donor & { archivedAt?: string }>(donorsQuery);

  // Filter active donors only
  const donors = React.useMemo(
    () => donorsRaw?.filter(d => !d.archivedAt && d.status !== 'inactive') || [],
    [donorsRaw]
  );

  // Step 1: Config state
  const [configData, setConfigData] = React.useState<ConfigData>({
    bankAccountId: '',
    collectionDate: '',
  });

  // Selected bank account
  const selectedAccount = React.useMemo(
    () => bankAccounts?.find(a => a.id === configData.bankAccountId),
    [bankAccounts, configData.bankAccountId]
  );

  // Step 2: Selection state
  const { eligible, excluded } = React.useMemo(() => {
    if (!donors) return { eligible: [], excluded: [] };
    return filterEligibleDonors(donors);
  }, [donors]);

  const [selectedDonorIds, setSelectedDonorIds] = React.useState<Set<string>>(new Set());

  // Initialize selection when eligible changes
  React.useEffect(() => {
    if (eligible.length > 0 && selectedDonorIds.size === 0) {
      setSelectedDonorIds(new Set(eligible.map(d => d.id)));
    }
  }, [eligible, selectedDonorIds.size]);

  // Selected donors with sequence type
  const selectedDonors = React.useMemo(() => {
    return eligible.filter(d => selectedDonorIds.has(d.id));
  }, [eligible, selectedDonorIds]);

  // Calculate totals
  const totalAmountCents = React.useMemo(() => {
    return selectedDonors.reduce((sum, d) => sum + (d.monthlyAmount ? Math.round(d.monthlyAmount * 100) : 0), 0);
  }, [selectedDonors]);

  // Build collection items
  const collectionItems = React.useMemo((): SepaCollectionItem[] => {
    return selectedDonors.map(donor => ({
      donorId: donor.id,
      donorName: donor.name,
      donorTaxId: donor.taxId || '',
      iban: donor.iban || '',
      amountCents: donor.monthlyAmount ? Math.round(donor.monthlyAmount * 100) : 0,
      umr: donor.sepaMandate?.umr || '',
      signatureDate: donor.sepaMandate?.signatureDate || '',
      sequenceType: determineSequenceType(donor),
      endToEndId: 'NOTPROVIDED',
    }));
  }, [selectedDonors]);

  // Group by sequence type for review
  const sequenceBreakdown = React.useMemo(() => {
    const breakdown: Record<SepaSequenceType, { count: number; totalCents: number }> = {
      FRST: { count: 0, totalCents: 0 },
      RCUR: { count: 0, totalCents: 0 },
      OOFF: { count: 0, totalCents: 0 },
      FNAL: { count: 0, totalCents: 0 },
    };
    for (const item of collectionItems) {
      breakdown[item.sequenceType].count++;
      breakdown[item.sequenceType].totalCents += item.amountCents;
    }
    return breakdown;
  }, [collectionItems]);

  // Validation
  const configValid = React.useMemo(() => {
    if (!configData.bankAccountId || !configData.collectionDate) return false;
    if (!selectedAccount?.creditorId) return false;
    return true;
  }, [configData, selectedAccount]);

  const selectionValid = React.useMemo(() => {
    return selectedDonorIds.size > 0;
  }, [selectedDonorIds.size]);

  // Navigation
  const currentStepIndex = STEPS.indexOf(currentStep);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    } else {
      router.push(`/${orgSlug}/dashboard/donants`);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'config':
        return configValid;
      case 'selection':
        return selectionValid;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  // Export handler
  const handleExport = async () => {
    if (!selectedAccount || !organization || !organizationId || !auth.currentUser) return;

    setIsExporting(true);

    try {
      const messageId = generateMessageId();

      const run: SepaCollectionRun = {
        id: '', // Will be set by Firestore
        status: 'exported',
        scheme: 'CORE',
        bankAccountId: configData.bankAccountId,
        creditorId: selectedAccount.creditorId || '',
        creditorName: organization.name,
        creditorIban: selectedAccount.iban || '',
        requestedCollectionDate: configData.collectionDate,
        items: collectionItems,
        totalAmountCents,
        totalCount: collectionItems.length,
        messageId,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid,
        exportedAt: new Date().toISOString(),
      };

      // Validate before generating
      const errors = validateCollectionRun(run);
      if (errors.length > 0) {
        toast({
          variant: 'destructive',
          title: t.sepaCollection.toasts.validationError,
          description: errors.map(e => e.message).join(', '),
        });
        setIsExporting(false);
        return;
      }

      // Generate XML
      const xml = generatePain008Xml(run);

      // Persist to Firestore
      const runsCollection = collection(firestore, 'organizations', organizationId, 'sepaCollectionRuns');

      // Build run data for persistence (without items array for Firestore)
      const runForDb = {
        type: 'SEPA_COLLECTION',
        scheme: 'CORE' as const,
        bankAccountId: configData.bankAccountId,
        collectionDate: configData.collectionDate,
        createdAt: run.createdAt,
        createdBy: run.createdBy,
        exportedAt: run.exportedAt,
        messageId,
        itemCount: collectionItems.length,
        totalCents: totalAmountCents,
        included: collectionItems.map(item => ({
          contactId: item.donorId,
          amountCents: item.amountCents,
          umr: item.umr,
          sequenceType: item.sequenceType,
        })),
        excluded: excluded.map(ex => ({
          contactId: ex.donor.id,
          reason: ex.reason,
        })),
      };

      addDocumentNonBlocking(runsCollection, runForDb);

      // Download XML file
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = configData.collectionDate.replace(/-/g, '');
      link.download = `sepa_cobrament_CORE_${orgSlug}_${dateStr}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t.sepaCollection.toasts.exported,
        description: `${collectionItems.length} cobraments · ${(totalAmountCents / 100).toFixed(2)} €`,
      });

      // Navigate back to donors
      router.push(`/${orgSlug}/dashboard/donants`);

    } catch (error) {
      console.error('Error exporting SEPA:', error);
      toast({
        variant: 'destructive',
        title: t.sepaCollection.toasts.error,
        description: error instanceof Error ? error.message : 'Error desconegut',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = isLoadingAccounts || isLoadingDonors;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight font-headline">
          {t.sepaCollection.title}
        </CardTitle>
        <CardDescription>
          {t.sepaCollection.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {STEPS.map((step, index) => {
              const isActive = step === currentStep;
              const isCompleted = index < currentStepIndex;
              const stepLabels = {
                config: t.sepaCollection.steps.config,
                selection: t.sepaCollection.steps.selection,
                review: t.sepaCollection.steps.review,
              };
              return (
                <React.Fragment key={step}>
                  {index > 0 && (
                    <div className={cn(
                      'h-0.5 w-12 transition-colors',
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )} />
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-primary/20 text-primary' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className={cn(
                      'text-xs',
                      isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>
                      {stepLabels[step]}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {currentStep === 'config' && (
            <StepConfig
              bankAccounts={bankAccounts || []}
              configData={configData}
              onChange={setConfigData}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'selection' && (
            <StepSelection
              eligible={eligible}
              excluded={excluded}
              selectedIds={selectedDonorIds}
              onSelectionChange={setSelectedDonorIds}
              totalAmountCents={totalAmountCents}
            />
          )}

          {currentStep === 'review' && selectedAccount && organization && (
            <StepReview
              collectionItems={collectionItems}
              sequenceBreakdown={sequenceBreakdown}
              totalAmountCents={totalAmountCents}
              collectionDate={configData.collectionDate}
              creditorId={selectedAccount.creditorId || ''}
              creditorName={organization.name}
              creditorIban={selectedAccount.iban || ''}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between border-t pt-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStepIndex === 0 ? t.common.cancel : t.common.back}
          </Button>

          {currentStep !== 'review' ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {t.common.next}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleExport} disabled={isExporting || !canProceed()}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportant...' : t.sepaCollection.review.export}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
