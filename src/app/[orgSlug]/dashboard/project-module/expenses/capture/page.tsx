// src/app/[orgSlug]/dashboard/project-module/expenses/capture/page.tsx
// Pàgina de captura ràpida de despeses de terreny (off-bank)
// Rol editor: veu només les seves; rol admin: veu totes

'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, where, orderBy, limit, getDocs, QueryDocumentSnapshot, DocumentData, startAfter } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import type { OffBankExpense } from '@/lib/project-module-types';
import { formatDateShort } from '@/lib/normalize';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Camera, AlertCircle, ArrowLeft, Circle, CheckCircle2, MoreVertical, FileText } from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileListItem } from '@/components/mobile/mobile-list-item';

import { OffBankExpenseModal } from '@/components/project-module/add-off-bank-expense-modal';

const PAGE_SIZE = 50;


// Formatejar import en EUR
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export default function CaptureExpensesPage() {
  const { firestore, user } = useFirebase();
  const { organizationId, userRole, firebaseUser } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  const { t, tr } = useTranslations();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // Textos i18n per captura
  const c = t.projectModule?.capture;

  // Estats
  const [expenses, setExpenses] = useState<OffBankExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filtre: mostrar només pendents de revisió (per defecte true)
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);

  // Rol de l'usuari (admin, user, viewer segons OrganizationRole)
  const isAdmin = userRole === 'admin';
  const isEditor = userRole === 'user'; // 'user' = editor (terminologia interna)
  const isViewer = userRole === 'viewer';

  // UID de l'usuari actual (per filtrar si és editor)
  const currentUid = firebaseUser?.uid ?? user?.uid ?? null;

  // Deep-link: obrir modal si ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1' && !isViewer) {
      setModalOpen(true);
    }
  }, [searchParams, isViewer]);

  // Carregar despeses off-bank
  const loadExpenses = React.useCallback(async (isLoadMore = false) => {
    if (!organizationId || !currentUid) return;

    try {
      if (!isLoadMore) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      const offBankRef = collection(
        firestore,
        'organizations',
        organizationId,
        'projectModule',
        '_',
        'offBankExpenses'
      );

      // Query base: ordenar per data desc
      // Si és editor, filtrar per createdBy
      let q;
      if (isAdmin) {
        // Admin veu tot
        q = query(
          offBankRef,
          orderBy('date', 'desc'),
          limit(PAGE_SIZE)
        );
      } else if (isEditor) {
        // Editor veu només les seves
        q = query(
          offBankRef,
          where('createdBy', '==', currentUid),
          orderBy('date', 'desc'),
          limit(PAGE_SIZE)
        );
      } else {
        // Viewer: no hauria d'arribar aquí, però per seguretat
        setExpenses([]);
        setIsLoading(false);
        return;
      }

      // Paginació
      if (isLoadMore && lastDoc) {
        if (isAdmin) {
          q = query(
            offBankRef,
            orderBy('date', 'desc'),
            startAfter(lastDoc),
            limit(PAGE_SIZE)
          );
        } else {
          q = query(
            offBankRef,
            where('createdBy', '==', currentUid),
            orderBy('date', 'desc'),
            startAfter(lastDoc),
            limit(PAGE_SIZE)
          );
        }
      }

      const snapshot = await getDocs(q);
      const newExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as OffBankExpense[];

      if (isLoadMore) {
        setExpenses(prev => [...prev, ...newExpenses]);
      } else {
        setExpenses(newExpenses);
      }

      setHasMore(snapshot.docs.length === PAGE_SIZE);
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

    } catch (err) {
      console.error('Error loading off-bank expenses:', err);
      setError(err instanceof Error ? err : new Error(tr('projectModule.capture.offlineError')));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [firestore, organizationId, currentUid, isAdmin, isEditor, lastDoc]);

  // Carregar al muntar
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Filtrar al client per needsReview
  const filteredExpenses = useMemo(() => {
    if (!showOnlyNeedsReview) return expenses;
    return expenses.filter(e => e.needsReview === true);
  }, [expenses, showOnlyNeedsReview]);

  // Comptadors
  const totalCount = expenses.length;
  const needsReviewCount = expenses.filter(e => e.needsReview === true).length;

  // Callback quan es crea/edita una despesa
  const handleSuccess = () => {
    // Recarregar llistat
    setLastDoc(null);
    setHasMore(true);
    loadExpenses();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{c?.loading ?? 'Carregant...'}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive font-semibold">{c?.errorLoadFailed ?? "No s'ha pogut carregar"}</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          <Button onClick={() => loadExpenses()} variant="outline">
            {c?.retry ?? 'Reintentar'}
          </Button>
        </div>
      </div>
    );
  }

  // Viewer: read-only sense CTA
  if (isViewer) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="font-semibold">{c?.restrictedTitle ?? 'Accés restringit'}</p>
          <p className="text-muted-foreground text-sm">
            {c?.restrictedBody ?? "Demana accés a l'administració de l'entitat."}
          </p>
          <Link href={buildUrl('/project-module/expenses')}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {c?.navBack ?? 'Tornar'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header - diferent per admin vs editor */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href={buildUrl('/project-module/expenses')}>
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                {c?.navBack ?? 'Tornar'}
              </Button>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold">
              {isAdmin
                ? (c?.titleAdmin ?? 'Captura (Terreny)')
                : (c?.titleEditor ?? 'Pujar comprovants')}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? (c?.subtitleAdmin ?? 'Pujades pendents de revisió per classificar i assignar.')
              : (c?.subtitleEditor ?? "Fes una foto i envia. L'oficina ho revisarà.")}
          </p>
        </div>

        {/* CTA principal - més prominent per editor (mòbil) */}
        <Button
          onClick={() => setModalOpen(true)}
          size="lg"
          className={isEditor ? 'w-full md:w-auto' : ''}
        >
          <Camera className="h-5 w-5 mr-2" />
          {isEditor
            ? (c?.ctaTakePhoto ?? 'Fer foto i enviar')
            : (c?.ctaNewExpense ?? 'Nova despesa')}
        </Button>
      </div>

      {/* Filtres i comptadors */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {c?.counterTotal ?? 'Total'}: {totalCount}
              </Badge>
              {needsReviewCount > 0 && (
                <Badge variant="secondary" className="text-sm bg-amber-100 text-amber-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {c?.counterPending ?? 'Pendents'}: {needsReviewCount}
                </Badge>
              )}
            </div>

            {/* Toggle simplificat: Pendents / Totes */}
            <div className="flex items-center gap-2">
              <Switch
                id="showOnlyNeedsReview"
                checked={showOnlyNeedsReview}
                onCheckedChange={setShowOnlyNeedsReview}
              />
              <Label htmlFor="showOnlyNeedsReview" className="text-sm cursor-pointer">
                {showOnlyNeedsReview
                  ? (c?.togglePending ?? 'Pendents')
                  : (c?.toggleAll ?? 'Totes')}
              </Label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              {showOnlyNeedsReview ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">
                    {isEditor
                      ? (c?.emptyNoPending ?? 'No tens pendents.')
                      : (c?.emptyNoPendingAdmin ?? 'No hi ha pendents de revisió')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowOnlyNeedsReview(false)}
                    className="text-primary text-sm mt-2 hover:underline"
                  >
                    {c?.linkViewAll ?? 'Veure totes'}
                  </button>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium">
                    {isEditor
                      ? (c?.emptyNoneYetTitle ?? 'Encara no has pujat cap comprovant')
                      : (c?.emptyNoExpenses ?? 'No hi ha despeses registrades')}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                    {isEditor
                      ? (c?.emptyNoneYetBody ?? "Prem 'Fer foto i enviar' quan tinguis un tiquet o factura.")
                      : (c?.emptyNoExpensesBody ?? 'Les despeses de terreny apareixeran aquí.')}
                  </p>
                  {isEditor && (
                    <Button onClick={() => setModalOpen(true)} className="mt-4">
                      <Camera className="h-4 w-4 mr-2" />
                      {c?.ctaTakePhoto ?? 'Fer foto i enviar'}
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {/* Secció "Les meves pujades" per editor */}
              {isEditor && (
                <div className="px-4 pt-3 pb-2 border-b">
                  <p className="text-sm font-medium text-muted-foreground">
                    {c?.sectionMyUploads ?? 'Les meves pujades'}
                  </p>
                </div>
              )}

              {isMobile ? (
                <div className="flex flex-col gap-2 p-3">
                  {filteredExpenses.map((expense) => {
                    const hasDocument = (expense.attachments && expense.attachments.length > 0) || !!expense.documentUrl;
                    const documentUrl = expense.attachments?.[0]?.url ?? expense.documentUrl;

                    return (
                      <MobileListItem
                        key={expense.id}
                        title={expense.concept || (c?.noNote ?? '(sense nota)')}
                        leadingIcon={
                          expense.needsReview ? (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )
                        }
                        badges={expense.categoryName ? [
                          <Badge key="cat" variant="outline" className="font-normal text-xs">
                            {expense.categoryName}
                          </Badge>
                        ] : undefined}
                        meta={[
                          { value: formatDateShort(expense.date) },
                          {
                            value: expense.amountEUR !== null
                              ? formatAmount(expense.amountEUR)
                              : <span className="text-amber-600 italic">Pendent</span>
                          },
                          ...(expense.originalCurrency && expense.originalCurrency !== 'EUR' && expense.originalAmount
                            ? [{ value: `${expense.originalAmount.toLocaleString('ca-ES')} ${expense.originalCurrency}` }]
                            : []),
                        ]}
                        actions={
                          hasDocument && documentUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(documentUrl, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-2"
                              title={c?.docOpen ?? 'Obrir comprovant'}
                            >
                              <FileText className="h-4 w-4 text-green-600" />
                            </button>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead>Concepte</TableHead>
                      <TableHead className="hidden md:table-cell">Categoria</TableHead>
                      <TableHead className="text-right">Import</TableHead>
                      <TableHead className="w-[60px] text-center">Doc.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => {
                      const hasDocument = (expense.attachments && expense.attachments.length > 0) || !!expense.documentUrl;
                      const documentUrl = expense.attachments?.[0]?.url ?? expense.documentUrl;

                      return (
                        <TableRow key={expense.id}>
                          {/* Indicador revisió amb tooltip */}
                          <TableCell className="text-center">
                            {expense.needsReview ? (
                              <span title={c?.statusPending ?? 'Pendent'}>
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              </span>
                            ) : (
                              <span title={c?.statusReviewed ?? 'Revisat'}>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </span>
                            )}
                          </TableCell>

                          {/* Data */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateShort(expense.date)}
                          </TableCell>

                          {/* Concepte */}
                          <TableCell className="max-w-[200px] truncate">
                            {expense.concept || <span className="text-muted-foreground">{c?.noNote ?? '(sense nota)'}</span>}
                          </TableCell>

                          {/* Categoria - hidden on mobile */}
                          <TableCell className="hidden md:table-cell">
                            {expense.categoryName ? (
                              <Badge variant="outline" className="font-normal">
                                {expense.categoryName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Import */}
                          <TableCell className="text-right font-mono">
                            {expense.amountEUR !== null ? (
                              formatAmount(expense.amountEUR)
                            ) : (
                              <span className="text-amber-600 italic text-xs">Pendent</span>
                            )}
                            {expense.originalCurrency && expense.originalCurrency !== 'EUR' && expense.originalAmount && (
                              <div className="text-xs text-muted-foreground">
                                {expense.originalAmount.toLocaleString('ca-ES')} {expense.originalCurrency}
                              </div>
                            )}
                          </TableCell>

                          {/* Document (punt verd) */}
                          <TableCell className="text-center">
                            {hasDocument && documentUrl ? (
                              <button
                                type="button"
                                onClick={() => window.open(documentUrl, '_blank', 'noopener,noreferrer')}
                                className="cursor-pointer hover:scale-110 transition-transform"
                                title={c?.docOpen ?? 'Obrir comprovant'}
                                aria-label={c?.docOpen ?? 'Obrir comprovant'}
                              >
                                <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500 inline-block" />
                              </button>
                            ) : (
                              <span title={c?.docNone ?? 'Sense comprovant'}>
                                <Circle className="h-2.5 w-2.5 text-muted-foreground/30 inline-block" />
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Botó carregar més */}
              {hasMore && (
                <div className="flex justify-center py-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => loadExpenses(true)}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {c?.loading ?? 'Carregant...'}
                      </>
                    ) : (
                      c?.loadMore ?? 'Carregar més'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de creació */}
      <OffBankExpenseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
        organizationId={organizationId ?? ''}
        quickMode={true}
      />
    </div>
  );
}
