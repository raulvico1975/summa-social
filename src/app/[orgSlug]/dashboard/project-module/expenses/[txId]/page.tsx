// src/app/[orgSlug]/dashboard/project-module/expenses/[txId]/page.tsx
// Detall d'una despesa amb assignació a projectes

'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useExpenseDetail, useProjects, useSaveExpenseLink } from '@/hooks/use-project-module';
import { useOrgUrl } from '@/hooks/organization-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Building2,
  Tag,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { AssignmentEditor } from '@/components/project-module/assignment-editor';
import { formatDateDMY } from '@/lib/normalize';
import type { ExpenseAssignment } from '@/lib/project-module-types';

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const txId = params.txId as string;
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();

  const { expense, link, isLoading, error, refresh } = useExpenseDetail(txId);
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects(true);
  const { save, remove, isSaving } = useSaveExpenseLink();

  const [isEditing, setIsEditing] = React.useState(false);
  const [hasAutoOpened, setHasAutoOpened] = React.useState(false);

  // Obrir editor automàticament si la despesa no està completament assignada
  React.useEffect(() => {
    if (!isLoading && expense && !hasAutoOpened) {
      const assignedAmt = link
        ? link.assignments.reduce((sum, a) => sum + Math.abs(a.amountEUR), 0)
        : 0;
      const totalAmt = Math.abs(expense.amountEUR);
      const fullyAssigned = (totalAmt - assignedAmt) <= 0.01;

      if (!fullyAssigned) {
        setIsEditing(true);
        setHasAutoOpened(true);
      }
    }
  }, [isLoading, expense, link, hasAutoOpened]);

  const handleSave = async (assignments: ExpenseAssignment[], note: string | null) => {
    try {
      await save(txId, assignments, note);
      await refresh();
      setIsEditing(false);
      toast({
        title: 'Assignació desada',
        description: 'La despesa s\'ha assignat correctament.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desant assignació',
      });
    }
  };

  const handleRemove = async () => {
    if (!confirm('Segur que vols eliminar l\'assignació?')) return;

    try {
      await remove(txId);
      await refresh();
      toast({
        title: 'Assignació eliminada',
        description: 'La despesa ja no està assignada a cap projecte.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error eliminant assignació',
      });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Error carregant despesa</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button onClick={() => router.back()} variant="outline">
          Tornar
        </Button>
      </div>
    );
  }

  if (isLoading || !expense) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignedAmount = link
    ? link.assignments.reduce((sum, a) => sum + Math.abs(a.amountEUR), 0)
    : 0;
  const totalAmount = Math.abs(expense.amountEUR);
  const remainingAmount = totalAmount - assignedAmount;
  const isFullyAssigned = remainingAmount <= 0.01;

  return (
    <div className="space-y-6">
      {/* Header amb navegació */}
      <div className="flex items-center gap-4">
        <Link href={buildUrl('/dashboard/project-module/expenses')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Detall de despesa</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informació de la despesa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informació de la despesa
            </CardTitle>
            <CardDescription>
              Informació sincronitzada automàticament
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data
              </span>
              <span className="font-medium">{formatDateDMY(expense.date)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Import</span>
              <span className="font-mono font-bold text-lg text-red-600">
                {formatAmount(expense.amountEUR)}
              </span>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="text-muted-foreground text-sm">Descripció</span>
              <p className="text-sm">{expense.description || '-'}</p>
            </div>

            {expense.categoryName && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{expense.categoryName}</Badge>
              </div>
            )}

            {expense.counterpartyName && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{expense.counterpartyName}</span>
                {expense.counterpartyType && (
                  <Badge variant="outline" className="text-xs">
                    {expense.counterpartyType}
                  </Badge>
                )}
              </div>
            )}

            {expense.documents.length > 0 && (
              <div className="space-y-2">
                <span className="text-muted-foreground text-sm">Documents</span>
                {expense.documents.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.fileUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {doc.name || 'Document'}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignació a projectes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assignació a projectes</CardTitle>
                <CardDescription>
                  Vincula aquesta despesa a un o més projectes
                </CardDescription>
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  {link && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRemove}
                      disabled={isSaving}
                      title="Eliminar assignació"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    title={link ? 'Editar assignació' : 'Assignar a projecte'}
                  >
                    {link ? (
                      <Edit className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <AssignmentEditor
                projects={projects}
                projectsLoading={projectsLoading}
                projectsError={projectsError}
                currentAssignments={link?.assignments ?? []}
                currentNote={link?.note ?? null}
                totalAmount={totalAmount}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
                isSaving={isSaving}
                createProjectUrl={buildUrl('/dashboard/project-module/projects/new')}
              />
            ) : link && link.assignments.length > 0 ? (
              <div className="space-y-4">
                {/* Pendent d'assignar (si no complet) */}
                {!isFullyAssigned && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-yellow-800 font-medium">Pendent d'assignar</span>
                    <span className="font-mono font-medium text-yellow-700">
                      {formatAmount(-remainingAmount)}
                    </span>
                  </div>
                )}

                {/* Assignacions existents */}
                {link.assignments.map((assignment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{assignment.projectName}</p>
                    </div>
                    <span className="font-mono font-medium text-red-600">
                      {formatAmount(assignment.amountEUR)}
                    </span>
                  </div>
                ))}

                <Separator />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total assignat</span>
                  <span className="font-mono font-medium">
                    {formatAmount(-assignedAmount)}
                  </span>
                </div>

                {isFullyAssigned && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600 font-medium">Completament assignada</span>
                  </div>
                )}

                {link.note && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-sm">Nota</span>
                      <p className="text-sm">{link.note}</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aquesta despesa no està assignada a cap projecte.</p>
                <p className="text-sm mt-1">
                  Fes clic al botó + per vincular-la.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
