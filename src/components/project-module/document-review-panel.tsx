'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Download, FileSearch, Filter, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from '@/i18n';
import {
  buildReviewDocumentKey,
  buildDocumentReviewIncidentsCsv,
  isAllowedDocumentReviewStoragePath,
  isSupportedDocumentReviewContentType,
  type DocumentReviewDocument,
  type DocumentIncidentCode,
  type DocumentReviewRow,
  type DocumentReviewStatus,
} from '@/lib/document-review';
import type { OffBankAttachment } from '@/lib/project-module-types';
import { OffBankDocumentCompletionDialog } from './off-bank-document-completion-dialog';

const ALL_FILTER_VALUE = 'all';

function formatDate(value: string | null): string {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatAmount(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function filenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'projecte';
}

function statusDotClassName(status: DocumentReviewStatus): string {
  if (status === 'complete') return 'bg-emerald-500';
  if (status === 'missing') return 'bg-red-500';
  if (status === 'inconsistent') return 'bg-amber-500';
  return 'bg-sky-500';
}

function incidentSortValue(code: DocumentIncidentCode): string {
  return code;
}

function extensionFromDocumentName(name: string): string | null {
  const lastDot = name.lastIndexOf('.');
  if (lastDot < 0 || lastDot === name.length - 1) return null;
  return name.slice(lastDot + 1).toLowerCase();
}

function hasSupportedAiContentType(document: DocumentReviewDocument): boolean {
  const contentType = document.contentType?.split(';')[0]?.trim().toLowerCase();
  if (contentType) return isSupportedDocumentReviewContentType(contentType);

  const extension = extensionFromDocumentName(document.documentName);
  return extension != null && ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(extension);
}

export function DocumentReviewPanel({
  rows,
  isLoading,
  projectCode,
  organizationId = null,
  offBankAttachmentsByTxId,
  canCompleteOffBankDocuments = false,
  canOpenBankMovements = false,
  buildBankMovementHref,
  onDocumentsChanged,
  canAnalyzeDocuments = false,
  analyzingDocumentKeys,
  analyzedDocumentKeys,
  aiUnavailable = false,
  onAnalyzeDocument,
}: {
  rows: DocumentReviewRow[];
  isLoading: boolean;
  projectCode: string;
  organizationId?: string | null;
  offBankAttachmentsByTxId?: Map<string, OffBankAttachment[]>;
  canCompleteOffBankDocuments?: boolean;
  canOpenBankMovements?: boolean;
  buildBankMovementHref?: (row: DocumentReviewRow) => string;
  onDocumentsChanged?: () => void | Promise<void>;
  canAnalyzeDocuments?: boolean;
  analyzingDocumentKeys?: Set<string>;
  analyzedDocumentKeys?: Set<string>;
  aiUnavailable?: boolean;
  onAnalyzeDocument?: (row: DocumentReviewRow, document: DocumentReviewDocument) => void | Promise<void>;
}) {
  const { tr } = useTranslations();
  const [statusFilter, setStatusFilter] = React.useState<string>(ALL_FILTER_VALUE);
  const [incidentFilter, setIncidentFilter] = React.useState<string>(ALL_FILTER_VALUE);
  const [selectedOffBankRow, setSelectedOffBankRow] = React.useState<DocumentReviewRow | null>(null);

  const rowsWithIncidents = React.useMemo(
    () => rows.filter((row) => row.incidents.length > 0),
    [rows]
  );
  const rowsWithoutDocuments = React.useMemo(
    () => rows.filter((row) => row.incidents.some((incident) => incident.code === 'missing_document')).length,
    [rows]
  );
  const rowsWithReviewRisk = React.useMemo(
    () => rows.filter((row) => row.status === 'needs_review' || row.status === 'inconsistent').length,
    [rows]
  );
  const incidentCodes = React.useMemo(
    () => Array.from(new Set(rows.flatMap((row) => row.incidents.map((incident) => incident.code))))
      .sort((left, right) => incidentSortValue(left).localeCompare(incidentSortValue(right))),
    [rows]
  );
  const filteredRows = React.useMemo(
    () => rowsWithIncidents.filter((row) => {
      if (statusFilter !== ALL_FILTER_VALUE && row.status !== statusFilter) return false;
      if (incidentFilter !== ALL_FILTER_VALUE && !row.incidents.some((incident) => incident.code === incidentFilter)) return false;
      return true;
    }),
    [incidentFilter, rowsWithIncidents, statusFilter]
  );
  const hasFilters = statusFilter !== ALL_FILTER_VALUE || incidentFilter !== ALL_FILTER_VALUE;

  const handleDownloadCsv = React.useCallback(() => {
    const csv = buildDocumentReviewIncidentsCsv(rows);
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `revisio_documental_${filenamePart(projectCode)}_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [projectCode, rows]);

  function clearFilters() {
    setStatusFilter(ALL_FILTER_VALUE);
    setIncidentFilter(ALL_FILTER_VALUE);
  }

  function renderDocumentAnalysisButton(row: DocumentReviewRow, document: DocumentReviewDocument) {
    const documentKey = buildReviewDocumentKey(document);
    const isAnalyzing = analyzingDocumentKeys?.has(documentKey) ?? false;
    const isAnalyzed = analyzedDocumentKeys?.has(documentKey) ?? false;
    const hasAnalyzableStoragePath = Boolean(
      organizationId && document.storagePath && isAllowedDocumentReviewStoragePath(document.storagePath, organizationId)
    );
    const hasSupportedContentType = hasSupportedAiContentType(document);
    const canAnalyze = canAnalyzeDocuments && hasAnalyzableStoragePath && hasSupportedContentType && !aiUnavailable && Boolean(onAnalyzeDocument);
    const tooltip = !hasAnalyzableStoragePath
      ? tr('projectModule.documentReview.ai.noStoragePath')
      : !hasSupportedContentType
        ? tr('projectModule.documentReview.ai.unsupportedFormat')
        : aiUnavailable
          ? tr('projectModule.documentReview.ai.unavailableHint')
          : isAnalyzed
            ? tr('projectModule.documentReview.ai.analyzed')
            : tr('projectModule.documentReview.ai.analyzeDocument');

    return (
      <Tooltip key={`${document.id}-ai`}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            disabled={!canAnalyze || isAnalyzing}
            onClick={() => {
              void onAnalyzeDocument?.(row, document);
            }}
            aria-label={tooltip}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAnalyzed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{tr('projectModule.documentReview.title')}</CardTitle>
            </div>
            <CardDescription>{tr('projectModule.documentReview.description')}</CardDescription>
            {aiUnavailable && (
              <p className="text-xs text-muted-foreground">
                {tr('projectModule.documentReview.ai.unavailableHint')}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadCsv}
            disabled={isLoading || rows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {tr('projectModule.documentReview.downloadCsv')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{tr('projectModule.documentReview.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr('projectModule.documentReview.emptyRows')}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{tr('projectModule.documentReview.rowsReviewed')}</div>
                  <div className="text-xl font-semibold">{rows.length}</div>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{tr('projectModule.documentReview.rowsWithIncidents')}</div>
                  <div className="text-xl font-semibold">{rowsWithIncidents.length}</div>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{tr('projectModule.documentReview.rowsWithoutDocuments')}</div>
                  <div className="text-xl font-semibold">{rowsWithoutDocuments}</div>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{tr('projectModule.documentReview.rowsWithReviewRisk')}</div>
                  <div className="text-xl font-semibold">{rowsWithReviewRisk}</div>
                </div>
              </div>

              {rowsWithIncidents.length === 0 ? (
                <p className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  {tr('projectModule.documentReview.noIncidentRows')}
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">{tr('projectModule.documentReview.filters.status')}</div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full md:w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_FILTER_VALUE}>{tr('projectModule.documentReview.filters.allStatuses')}</SelectItem>
                            <SelectItem value="missing">{tr('projectModule.documentReview.status.missing')}</SelectItem>
                            <SelectItem value="inconsistent">{tr('projectModule.documentReview.status.inconsistent')}</SelectItem>
                            <SelectItem value="needs_review">{tr('projectModule.documentReview.status.needs_review')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">{tr('projectModule.documentReview.filters.incident')}</div>
                        <Select value={incidentFilter} onValueChange={setIncidentFilter}>
                          <SelectTrigger className="w-full md:w-[260px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_FILTER_VALUE}>{tr('projectModule.documentReview.filters.allIncidents')}</SelectItem>
                            {incidentCodes.map((code) => (
                              <SelectItem key={code} value={code}>
                                {tr(`projectModule.documentReview.incidents.${code}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {hasFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" />
                        {tr('projectModule.multiFunding.filters.clear')}
                      </Button>
                    )}
                  </div>

                  {filteredRows.length === 0 ? (
                    <p className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      <Filter className="mr-2 inline h-4 w-4" />
                      {tr('projectModule.documentReview.filters.noResults')}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tr('projectModule.documentReview.table.order')}</TableHead>
                            <TableHead>{tr('projectModule.status')}</TableHead>
                            <TableHead>{tr('projectModule.documentReview.table.expense')}</TableHead>
                            <TableHead>{tr('projectModule.documentReview.table.documents')}</TableHead>
                            <TableHead>{tr('projectModule.documentReview.table.incidents')}</TableHead>
                            <TableHead>{tr('projectModule.documentReview.table.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRows.map((row) => {
                            const movementHref = row.source === 'bank' ? buildBankMovementHref?.(row) : undefined;
                            return (
                              <TableRow key={`${row.order}-${row.txId}`}>
                                <TableCell className="font-mono text-sm">{row.order}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span
                                    className={`inline-block h-3 w-3 rounded-full ${statusDotClassName(row.status)}`}
                                    title={tr(`projectModule.documentReview.status.${row.status}`)}
                                    aria-label={tr(`projectModule.documentReview.status.${row.status}`)}
                                  />
                                </TableCell>
                                <TableCell className="min-w-[260px]">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">{row.concept || '-'}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(row.dateExpense)} · {row.counterpartyName || '-'} · {formatAmount(row.amountAssignedEUR)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {row.source === 'bank' ? tr('projectModule.sourceBank') : tr('projectModule.sourceOffBank')}
                                      {row.budgetLineName ? ` · ${row.budgetLineCode ? `${row.budgetLineCode} - ` : ''}${row.budgetLineName}` : ''}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="min-w-[220px]">
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">
                                      {tr('projectModule.documentReview.documentCount').replace('{count}', String(row.documents.length))}
                                    </div>
                                    {row.documents.length === 0 ? (
                                      <div className="text-sm text-muted-foreground">-</div>
                                    ) : (
                                      <div className="max-w-[300px] space-y-1">
                                        {row.documents.map((document) => (
                                          <div key={document.id} className="flex min-w-0 items-center gap-1">
                                            <span className="min-w-0 flex-1 truncate text-sm">
                                              {document.documentName}
                                            </span>
                                            {renderDocumentAnalysisButton(row, document)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="min-w-[260px]">
                                  <div className="flex flex-wrap gap-1">
                                    {row.incidents.map((incident, index) => (
                                      <Badge
                                        key={`${incident.code}-${incident.documentId ?? 'row'}-${index}`}
                                        variant={incident.severity === 'error' ? 'destructive' : 'secondary'}
                                      >
                                        {tr(`projectModule.documentReview.incidents.${incident.code}`)}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="min-w-[190px]">
                                  {row.source === 'offBank' ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedOffBankRow(row)}
                                      disabled={!canCompleteOffBankDocuments || !organizationId || !row.txId.startsWith('off_')}
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      {tr('projectModule.documentReview.actions.completeDocuments')}
                                    </Button>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground">
                                        {tr('projectModule.documentReview.actions.bankNotice')}
                                      </div>
                                      {canOpenBankMovements && movementHref ? (
                                        <Button asChild variant="outline" size="sm">
                                          <Link href={movementHref}>
                                            <ArrowUpRight className="mr-2 h-4 w-4" />
                                            {tr('projectModule.documentReview.actions.goToMovement')}
                                          </Link>
                                        </Button>
                                      ) : (
                                        <Button type="button" variant="outline" size="sm" disabled>
                                          <ArrowUpRight className="mr-2 h-4 w-4" />
                                          {tr('projectModule.documentReview.actions.noMovementAccess')}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <OffBankDocumentCompletionDialog
        open={selectedOffBankRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOffBankRow(null);
        }}
        organizationId={organizationId}
        row={selectedOffBankRow}
        attachments={selectedOffBankRow ? offBankAttachmentsByTxId?.get(selectedOffBankRow.txId) ?? [] : []}
        canEdit={canCompleteOffBankDocuments}
        onSaved={onDocumentsChanged ?? (() => {})}
      />
    </>
  );
}
