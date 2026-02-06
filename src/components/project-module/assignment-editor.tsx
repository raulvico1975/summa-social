// src/components/project-module/assignment-editor.tsx
// Editor d'assignació de despeses a projectes

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, AlertCircle, Check, X, FolderPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/i18n';
import { useProjectBudgetLines } from '@/hooks/use-project-module';
import type { Project, ExpenseAssignment, BudgetLine } from '@/lib/project-module-types';

interface AssignmentEditorProps {
  projects: Project[];
  projectsLoading: boolean;
  projectsError?: Error | null;
  currentAssignments: ExpenseAssignment[];
  currentNote: string | null;
  totalAmount: number; // valor absolut de la despesa (EUR)
  onSave: (assignments: ExpenseAssignment[], note: string | null) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  createProjectUrl?: string;
  // Mode FX: distribució per percentatge sobre originalAmount
  fxMode?: boolean;
  originalAmount?: number; // import en moneda local (positiu)
  originalCurrency?: string; // ex: "XOF"
  expenseFxRate?: number | null; // TC manual de la despesa (prioritat absoluta)
  resolveProjectTC?: (projectId: string) => Promise<number | null>;
}

interface AssignmentRow {
  id: string;
  projectId: string;
  projectName: string;
  amountStr: string; // EUR en mode normal, % en mode FX
  budgetLineId: string | null;
  budgetLineName: string | null;
}

// Component per selector de partida que carrega les lines del projecte
function BudgetLineSelector({
  projectId,
  value,
  onChange,
}: {
  projectId: string;
  value: string | null;
  onChange: (lineId: string | null, lineName: string | null) => void;
}) {
  const { t } = useTranslations();
  const { budgetLines, isLoading } = useProjectBudgetLines(projectId);

  if (!projectId) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  if (budgetLines.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {t.projectModule?.noBudgetLines ?? '(sense pressupost)'}
      </span>
    );
  }

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(val) => {
        if (val === '__none__') {
          onChange(null, null);
        } else {
          const line = budgetLines.find((l) => l.id === val);
          onChange(val, line?.name ?? null);
        }
      }}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={t.projectModule?.selectBudgetLine ?? 'Partida...'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          {t.projectModule?.unassignedLine ?? 'Sense partida'}
        </SelectItem>
        {budgetLines.map((line) => (
          <SelectItem key={line.id} value={line.id}>
            {line.code ? `${line.code} - ` : ''}{line.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function generateRowId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function AssignmentEditor({
  projects,
  projectsLoading,
  projectsError,
  currentAssignments,
  currentNote,
  totalAmount,
  onSave,
  onCancel,
  isSaving,
  createProjectUrl,
  fxMode,
  originalAmount,
  originalCurrency,
  expenseFxRate,
  resolveProjectTC,
}: AssignmentEditorProps) {
  const { t } = useTranslations();

  // Inicialitzar amb les assignacions actuals o una fila buida
  const [rows, setRows] = React.useState<AssignmentRow[]>(() => {
    if (currentAssignments.length > 0) {
      return currentAssignments.map((a) => ({
        id: generateRowId(),
        projectId: a.projectId,
        projectName: a.projectName,
        amountStr: fxMode
          ? (a.localPct != null ? a.localPct.toString() : '0')
          : Math.abs(a.amountEUR).toFixed(2),
        budgetLineId: a.budgetLineId ?? null,
        budgetLineName: a.budgetLineName ?? null,
      }));
    }
    return [
      {
        id: generateRowId(),
        projectId: '',
        projectName: '',
        amountStr: fxMode ? '100' : totalAmount.toFixed(2),
        budgetLineId: null,
        budgetLineName: null,
      },
    ];
  });

  const [note, setNote] = React.useState(currentNote ?? '');
  const [fxSaveError, setFxSaveError] = React.useState<string | null>(null);

  // Calcular totals
  const assignedTotal = rows.reduce((sum, row) => {
    const val = parseFloat(row.amountStr) || 0;
    return sum + val;
  }, 0);

  // En mode FX: total = 100%, remaining = 100 - assignat
  // En mode normal: total = totalAmount, remaining = totalAmount - assignat
  const effectiveTotal = fxMode ? 100 : totalAmount;
  const remaining = effectiveTotal - assignedTotal;

  // Validació
  const isValid = rows.length === 0 || rows.every((r) => r.projectId && parseFloat(r.amountStr) > 0);
  const isBalanced = fxMode ? Math.abs(remaining) <= 0.01 : Math.abs(remaining) <= 0.01;
  const isOverLimit = fxMode && assignedTotal > 100.01;

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: generateRowId(),
        projectId: '',
        projectName: '',
        amountStr: fxMode
          ? (remaining > 0 ? remaining.toFixed(0) : '0')
          : (remaining > 0 ? remaining.toFixed(2) : '0.00'),
        budgetLineId: null,
        budgetLineName: null,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: 'projectId' | 'amountStr', value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        if (field === 'projectId') {
          const project = projects.find((p) => p.id === value);
          return {
            ...row,
            projectId: value,
            projectName: project?.name ?? '',
            // Reset budget line quan canvia el projecte
            budgetLineId: null,
            budgetLineName: null,
          };
        }

        return { ...row, [field]: value };
      })
    );
    setFxSaveError(null);
  };

  const updateBudgetLine = (id: string, budgetLineId: string | null, budgetLineName: string | null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return { ...row, budgetLineId, budgetLineName };
      })
    );
  };

  const handleSave = async () => {
    if (!isValid) return;

    // Mode FX: computar EUR per cada fila
    if (fxMode && originalAmount && originalAmount > 0) {
      // Guardrail: no permetre > 100%
      const totalPct = rows.reduce((s, r) => s + (parseFloat(r.amountStr) || 0), 0);
      if (totalPct > 100.01) {
        setFxSaveError(t.projectModule?.fxPctOver100 ?? 'El total de percentatges no pot superar 100%');
        return;
      }

      const assignments: ExpenseAssignment[] = [];

      for (const row of rows) {
        const pct = parseFloat(row.amountStr);
        if (isNaN(pct) || pct <= 0) continue; // ignora files amb % <= 0

        const localPerRow = originalAmount * (pct / 100);

        // TC: prioritat manual per despesa, després projecte
        let tc: number | null = null;
        if (expenseFxRate != null && expenseFxRate > 0) {
          tc = expenseFxRate;
        } else if (resolveProjectTC) {
          tc = await resolveProjectTC(row.projectId);
        }

        if (tc === null) {
          const projectName = row.projectName || row.projectId;
          setFxSaveError(
            t.projectModule?.fxNoTcForProject
              ?? `El projecte "${projectName}" no té TC configurat. Afegeix transferències FX al pressupost.`
          );
          return;
        }

        assignments.push({
          projectId: row.projectId,
          projectName: row.projectName,
          amountEUR: -Math.abs(localPerRow * tc),
          budgetLineId: row.budgetLineId,
          budgetLineName: row.budgetLineName,
          localPct: pct,
        });
      }

      await onSave(assignments, note.trim() || null);
      return;
    }

    // Mode normal (EUR)
    const assignments: ExpenseAssignment[] = rows.map((row) => ({
      projectId: row.projectId,
      projectName: row.projectName,
      amountEUR: -Math.abs(parseFloat(row.amountStr)), // sempre negatiu
      budgetLineId: row.budgetLineId,
      budgetLineName: row.budgetLineName,
    }));

    await onSave(assignments, note.trim() || null);
  };

  if (projectsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (projectsError) {
    const isIndexError = projectsError.message?.toLowerCase().includes('index');
    return (
      <div className="text-center py-6">
        <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
        <p className="text-destructive font-medium">
          {isIndexError
            ? 'Falta un índex de Firestore per carregar projectes.'
            : 'Error carregant projectes'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isIndexError
            ? "Contacta amb l'administrador."
            : projectsError.message}
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel·lar
          </Button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-6">
        <FolderPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No hi ha projectes actius.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Crea un projecte primer per poder assignar despeses.
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel·lar
          </Button>
          {createProjectUrl && (
            <Link href={createProjectUrl}>
              <Button>
                <FolderPlus className="h-4 w-4 mr-2" />
                Crear projecte
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Missatge si no hi ha files */}
      {rows.length === 0 && (
        <div className="p-4 border border-dashed rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Sense assignacions. La despesa quedarà desvinculada de qualsevol projecte.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Afegir assignació
          </Button>
        </div>
      )}

      {/* Files d'assignació */}
      {rows.map((row, index) => (
        <div key={row.id} className="space-y-2 pb-3 border-b last:border-b-0">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              {index === 0 && <Label className="text-xs">Projecte</Label>}
              <Select
                value={row.projectId}
                onValueChange={(val) => updateRow(row.id, 'projectId', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona projecte..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {project.code && (
                        <span className="text-muted-foreground ml-2">({project.code})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32 space-y-1">
              {index === 0 && (
                <Label className="text-xs">
                  {fxMode
                    ? (t.projectModule?.fxPercentLabel ?? '%')
                    : 'Import (€)'}
                </Label>
              )}
              <Input
                type="number"
                step={fxMode ? '1' : '0.01'}
                min="0"
                max={fxMode ? '100' : undefined}
                value={row.amountStr}
                onChange={(e) => updateRow(row.id, 'amountStr', e.target.value)}
                className="text-right font-mono"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(row.id)}
              className="shrink-0"
              title={t.projectModule?.removeRow ?? 'Eliminar fila'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Selector de partida (opcional) */}
          {row.projectId && (
            <div className="ml-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Partida:</span>
              <div className="w-48">
                <BudgetLineSelector
                  projectId={row.projectId}
                  value={row.budgetLineId}
                  onChange={(lineId, lineName) => updateBudgetLine(row.id, lineId, lineName)}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Afegir fila (només si ja hi ha files) */}
      {rows.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Afegir projecte
        </Button>
      )}

      {/* Resum (només si hi ha files) */}
      {rows.length > 0 && (
        <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
          {fxMode ? (
            // Mode FX: mostrar percentatges
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t.projectModule?.fxTotalOriginal
                    ? t.projectModule.fxTotalOriginal.replace('{currency}', originalCurrency ?? '')
                    : `Total (${originalCurrency ?? ''})`}
                </span>
                <span className="font-mono">
                  {originalAmount?.toLocaleString('ca-ES')} {originalCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t.projectModule?.fxPctAssigned ?? '% assignat'}
                </span>
                <span className="font-mono">{assignedTotal.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{t.projectModule?.fxPctPending ?? '% pendent'}</span>
                <span className={`font-mono ${
                  isOverLimit ? 'text-red-600' : isBalanced ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {remaining.toFixed(0)}%
                </span>
              </div>
              {isOverLimit && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t.projectModule?.fxPctOver100 ?? 'El total de percentatges no pot superar 100%'}
                </p>
              )}
              {!isOverLimit && !isBalanced && remaining > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t.projectModule?.fxPctPending ?? 'Queda percentatge sense imputar'}
                </p>
              )}
            </>
          ) : (
            // Mode normal: mostrar EUR
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total despesa</span>
                <span className="font-mono">{totalAmount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assignat</span>
                <span className="font-mono">{assignedTotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Pendent</span>
                <span className={`font-mono ${isBalanced ? 'text-green-600' : 'text-yellow-600'}`}>
                  {remaining.toFixed(2)} €
                </span>
              </div>
              {!isBalanced && (
                <p className="text-xs text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Els imports no quadren amb el total de la despesa
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Error FX */}
      {fxSaveError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {fxSaveError}
        </p>
      )}

      {/* Nota */}
      <div className="space-y-1">
        <Label className="text-xs">{t.balance.noteLabel}</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.balance.notePlaceholder}
          rows={2}
        />
      </div>

      {/* Accions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" />
          Cancel·lar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || isSaving || isOverLimit}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          {isSaving ? 'Desant...' : rows.length === 0 ? 'Eliminar vinculació' : 'Desar assignació'}
        </Button>
      </div>
    </div>
  );
}
