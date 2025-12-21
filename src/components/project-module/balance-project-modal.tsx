// src/components/project-module/balance-project-modal.tsx
// Modal "Quadrar projecte" - Simulació de justificació econòmica

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  FileText,
  Building2,
  ArrowRight,
  Undo2,
  Check,
  Loader2,
  Info,
} from 'lucide-react';
import { useSaveExpenseLink } from '@/hooks/use-project-module';
import { useToast } from '@/hooks/use-toast';
import { trackUX } from '@/lib/ux/trackUX';
import type {
  Project,
  BudgetLine,
  ExpenseLink,
  UnifiedExpense,
  UnifiedExpenseWithLink,
  ExpenseAssignment,
} from '@/lib/project-module-types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS LOCALS
// ═══════════════════════════════════════════════════════════════════════════

interface SimulatedMove {
  txId: string;
  fromBudgetLineId: string | null;
  toBudgetLineId: string;
  amountEUR: number;
}

interface BudgetLineDiagnostic {
  line: BudgetLine;
  budgeted: number;
  executed: number;
  simulated: number; // execució després de simulacions
  difference: number;
  deviationPct: number;
  status: 'ok' | 'overSpend' | 'underSpend';
}

interface CandidateExpense {
  expense: UnifiedExpense;
  link: ExpenseLink | null;
  assignedToThisProject: boolean;
  assignedToOtherProject: string | null;
  currentBudgetLineId: string | null;
  currentBudgetLineName: string | null;
  matchScore: number;
  suggestedLineId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

// Grups heurístics per matching
const CATEGORY_GROUPS: Record<string, string[]> = {
  viatges: ['transport', 'vol', 'vols', 'dietes', 'dieta', 'allotjament', 'hotel', 'desplaçament', 'taxi', 'tren', 'avió', 'bitllet'],
  personal: ['nòmina', 'nòmines', 'salari', 'salaris', 'rrhh', 'sou', 'sous', 'seguretat social', 'ss'],
  serveis: ['consultoria', 'assessorament', 'assessoria', 'serveis', 'honoraris', 'professional'],
  material: ['subministrament', 'subministraments', 'fungible', 'material', 'oficina', 'papereria', 'impressió'],
  formacio: ['formació', 'curs', 'cursos', 'capacitació', 'taller', 'seminari'],
  comunicacio: ['comunicació', 'màrqueting', 'publicitat', 'difusió', 'xarxes', 'web'],
};

function calculateMatchScore(
  expense: UnifiedExpense,
  line: BudgetLine
): number {
  const searchTexts = [
    expense.categoryName?.toLowerCase() ?? '',
    expense.counterpartyName?.toLowerCase() ?? '',
    expense.description?.toLowerCase() ?? '',
  ].join(' ');

  const lineTexts = [
    line.name.toLowerCase(),
    line.code?.toLowerCase() ?? '',
  ].join(' ');

  let score = 0;

  // Coincidència directa de paraules
  const lineWords = lineTexts.split(/\s+/).filter(w => w.length > 2);
  for (const word of lineWords) {
    if (searchTexts.includes(word)) {
      score += 10;
    }
  }

  // Coincidència per grups heurístics
  for (const [group, keywords] of Object.entries(CATEGORY_GROUPS)) {
    const lineHasGroup = keywords.some(kw => lineTexts.includes(kw)) || lineTexts.includes(group);
    const expenseHasGroup = keywords.some(kw => searchTexts.includes(kw));

    if (lineHasGroup && expenseHasGroup) {
      score += 5;
    }
  }

  return score;
}

function findBestCombination(
  candidates: CandidateExpense[],
  targetAmount: number,
  maxItems: number = 5
): CandidateExpense[] {
  // Algoritme simple: ordenar per proximitat a l'import objectiu
  const available = candidates
    .filter(c => !c.assignedToOtherProject)
    .sort((a, b) => {
      const diffA = Math.abs(Math.abs(a.expense.amountEUR) - targetAmount);
      const diffB = Math.abs(Math.abs(b.expense.amountEUR) - targetAmount);
      return diffA - diffB;
    });

  if (available.length === 0) return [];

  // Intentar trobar combinació que s'aproximi
  const result: CandidateExpense[] = [];
  let currentSum = 0;

  for (const candidate of available) {
    if (result.length >= maxItems) break;

    const amount = Math.abs(candidate.expense.amountEUR);
    if (currentSum + amount <= targetAmount * 1.1) { // Permetre 10% d'excés
      result.push(candidate);
      currentSum += amount;
    }

    if (currentSum >= targetAmount * 0.95) break; // Prou a prop
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface BalanceProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  budgetLines: BudgetLine[];
  expenseLinks: ExpenseLink[];
  allExpenses: UnifiedExpenseWithLink[];
  onSuccess: () => void;
}

export function BalanceProjectModal({
  open,
  onOpenChange,
  project,
  budgetLines,
  expenseLinks,
  allExpenses,
  onSuccess,
}: BalanceProjectModalProps) {
  const { toast } = useToast();
  const { save: saveExpenseLink, isSaving } = useSaveExpenseLink();

  // Estat de simulació
  const [simulatedMoves, setSimulatedMoves] = React.useState<SimulatedMove[]>([]);
  const [selectedLineId, setSelectedLineId] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);

  // Reset quan s'obre
  React.useEffect(() => {
    if (open) {
      setSimulatedMoves([]);
      setSelectedLineId(null);
    }
  }, [open]);

  // Calcular execució real per partida
  const executionByLine = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const link of expenseLinks) {
      for (const assignment of link.assignments) {
        if (assignment.projectId === project.id && assignment.budgetLineId) {
          const current = map.get(assignment.budgetLineId) ?? 0;
          map.set(assignment.budgetLineId, current + Math.abs(assignment.amountEUR));
        }
      }
    }
    return map;
  }, [expenseLinks, project.id]);

  // Calcular impacte de simulacions per partida
  const simulationImpact = React.useMemo(() => {
    const impact = new Map<string, number>();

    for (const move of simulatedMoves) {
      // Restar de l'origen
      if (move.fromBudgetLineId) {
        const current = impact.get(move.fromBudgetLineId) ?? 0;
        impact.set(move.fromBudgetLineId, current - move.amountEUR);
      }
      // Sumar al destí
      const currentDest = impact.get(move.toBudgetLineId) ?? 0;
      impact.set(move.toBudgetLineId, currentDest + move.amountEUR);
    }

    return impact;
  }, [simulatedMoves]);

  // Diagnòstic per partida
  const diagnostics = React.useMemo((): BudgetLineDiagnostic[] => {
    const allowedDeviation = project.allowedDeviationPct ?? 10;

    return budgetLines.map(line => {
      const budgeted = line.budgetedAmountEUR;
      const executed = executionByLine.get(line.id) ?? 0;
      const simulatedDelta = simulationImpact.get(line.id) ?? 0;
      const simulated = executed + simulatedDelta;
      const difference = simulated - budgeted;
      const deviationPct = budgeted > 0 ? (difference / budgeted) * 100 : 0;

      let status: 'ok' | 'overSpend' | 'underSpend' = 'ok';
      if (deviationPct > allowedDeviation) {
        status = 'overSpend';
      } else if (deviationPct < -allowedDeviation) {
        status = 'underSpend';
      }

      return {
        line,
        budgeted,
        executed,
        simulated,
        difference,
        deviationPct,
        status,
      };
    }).sort((a, b) => {
      // Primer les que estan fora de desviació
      if (a.status !== 'ok' && b.status === 'ok') return -1;
      if (a.status === 'ok' && b.status !== 'ok') return 1;
      // Després per magnitud absoluta
      return Math.abs(b.difference) - Math.abs(a.difference);
    });
  }, [budgetLines, executionByLine, simulationImpact, project.allowedDeviationPct]);

  // Resum global
  const summary = React.useMemo(() => {
    const outOfDeviation = diagnostics.filter(d => d.status !== 'ok').length;
    const totalToRebalance = diagnostics
      .filter(d => d.status !== 'ok')
      .reduce((sum, d) => sum + Math.abs(d.difference), 0);

    return {
      outOfDeviation,
      total: diagnostics.length,
      totalToRebalance,
    };
  }, [diagnostics]);

  // Despeses candidates
  const candidates = React.useMemo((): CandidateExpense[] => {
    const projectStart = project.startDate;
    const projectEnd = project.endDate;

    return allExpenses
      .filter(item => {
        const exp = item.expense;

        // Ha de tenir import
        if (Math.abs(exp.amountEUR) === 0) return false;

        // Dins dates del projecte (si estan definides)
        if (projectStart && exp.date < projectStart) return false;
        if (projectEnd && exp.date > projectEnd) return false;

        return true;
      })
      .map(item => {
        const exp = item.expense;
        const link = item.link;

        // Trobar assignació a aquest projecte
        const thisProjectAssignment = link?.assignments.find(
          a => a.projectId === project.id
        );

        // Trobar assignació a altres projectes
        const otherProjectAssignment = link?.assignments.find(
          a => a.projectId !== project.id
        );

        // Calcular score de matching amb cada partida
        let bestScore = 0;
        let suggestedLineId: string | null = null;

        for (const line of budgetLines) {
          const score = calculateMatchScore(exp, line);
          if (score > bestScore) {
            bestScore = score;
            suggestedLineId = line.id;
          }
        }

        return {
          expense: exp,
          link,
          assignedToThisProject: !!thisProjectAssignment,
          assignedToOtherProject: otherProjectAssignment?.projectName ?? null,
          currentBudgetLineId: thisProjectAssignment?.budgetLineId ?? null,
          currentBudgetLineName: thisProjectAssignment?.budgetLineName ?? null,
          matchScore: bestScore,
          suggestedLineId,
        };
      })
      .sort((a, b) => {
        // Prioritzar: sense assignació > assignades a aquest projecte > altres
        if (!a.assignedToThisProject && !a.assignedToOtherProject && (b.assignedToThisProject || b.assignedToOtherProject)) return -1;
        if ((a.assignedToThisProject || a.assignedToOtherProject) && !b.assignedToThisProject && !b.assignedToOtherProject) return 1;
        // Després per match score
        return b.matchScore - a.matchScore;
      });
  }, [allExpenses, project, budgetLines]);

  // Candidates per a la partida seleccionada
  const candidatesForSelectedLine = React.useMemo(() => {
    if (!selectedLineId) return [];

    const selectedDiag = diagnostics.find(d => d.line.id === selectedLineId);
    if (!selectedDiag) return [];

    // Si la partida té dèficit, buscar despeses per cobrir-lo
    if (selectedDiag.difference < 0) {
      const needed = Math.abs(selectedDiag.difference);
      return findBestCombination(candidates, needed);
    }

    return candidates.slice(0, 10);
  }, [selectedLineId, diagnostics, candidates]);

  // Afegir moviment simulat
  const addSimulatedMove = (
    txId: string,
    fromBudgetLineId: string | null,
    toBudgetLineId: string,
    amountEUR: number
  ) => {
    trackUX('balance.simulateMove', { txId, fromBudgetLineId, toBudgetLineId, amountEUR });

    setSimulatedMoves(prev => {
      // Si ja hi ha un moviment per aquest txId, substituir-lo
      const existing = prev.findIndex(m => m.txId === txId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { txId, fromBudgetLineId, toBudgetLineId, amountEUR };
        return updated;
      }
      return [...prev, { txId, fromBudgetLineId, toBudgetLineId, amountEUR }];
    });
  };

  // Esborrar moviment simulat
  const removeSimulatedMove = (txId: string) => {
    trackUX('balance.removeMove', { txId });
    setSimulatedMoves(prev => prev.filter(m => m.txId !== txId));
  };

  // Netejar totes les simulacions
  const clearSimulations = () => {
    trackUX('balance.clearSimulations', { count: simulatedMoves.length });
    setSimulatedMoves([]);
  };

  // Aplicar canvis
  const applyChanges = async () => {
    if (simulatedMoves.length === 0) return;

    trackUX('balance.applyChanges.start', { moveCount: simulatedMoves.length });
    setIsApplying(true);

    try {
      for (const move of simulatedMoves) {
        // Trobar el link existent o crear-ne un de nou
        const existingLink = expenseLinks.find(l => l.id === move.txId);

        let newAssignments: ExpenseAssignment[];

        if (existingLink) {
          // Modificar assignació existent
          newAssignments = existingLink.assignments.map(a => {
            if (a.projectId === project.id) {
              const newLine = budgetLines.find(l => l.id === move.toBudgetLineId);
              return {
                ...a,
                budgetLineId: move.toBudgetLineId,
                budgetLineName: newLine?.name ?? null,
              };
            }
            return a;
          });

          // Si no hi ha assignació a aquest projecte, afegir-ne una
          if (!newAssignments.some(a => a.projectId === project.id)) {
            const newLine = budgetLines.find(l => l.id === move.toBudgetLineId);
            newAssignments.push({
              projectId: project.id,
              projectName: project.name,
              amountEUR: -Math.abs(move.amountEUR),
              budgetLineId: move.toBudgetLineId,
              budgetLineName: newLine?.name ?? null,
            });
          }
        } else {
          // Crear nova assignació
          const newLine = budgetLines.find(l => l.id === move.toBudgetLineId);
          newAssignments = [{
            projectId: project.id,
            projectName: project.name,
            amountEUR: -Math.abs(move.amountEUR),
            budgetLineId: move.toBudgetLineId,
            budgetLineName: newLine?.name ?? null,
          }];
        }

        await saveExpenseLink(move.txId, newAssignments, existingLink?.note ?? null);
      }

      trackUX('balance.applyChanges.success', { moveCount: simulatedMoves.length });

      toast({
        title: 'Canvis aplicats',
        description: `S'han aplicat ${simulatedMoves.length} moviments.`,
      });

      setSimulatedMoves([]);
      onSuccess();
      onOpenChange(false);

    } catch (err) {
      console.error('Error applying changes:', err);
      trackUX('balance.applyChanges.error', { message: err instanceof Error ? err.message : 'Error' });

      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error aplicant canvis',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quadrar justificació del projecte</DialogTitle>
          <DialogDescription>
            Revisió de desviacions i proposta de moviments abans de justificar
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="diagnostic" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="diagnostic">
                Diagnòstic
                {summary.outOfDeviation > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {summary.outOfDeviation}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="candidates">
                Despeses candidates
                <Badge variant="secondary" className="ml-2">
                  {candidates.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="simulation">
                Simulació
                {simulatedMoves.length > 0 && (
                  <Badge variant="default" className="ml-2">
                    {simulatedMoves.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB: Diagnòstic */}
            <TabsContent value="diagnostic" className="flex-1 overflow-hidden mt-4">
              <div className="space-y-4 h-full flex flex-col">
                {/* Resum global */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Partides fora de desviació</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {summary.outOfDeviation} / {summary.total}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Import a reequilibrar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {formatAmount(summary.totalToRebalance)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Despeses candidates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {candidates.filter(c => !c.assignedToOtherProject).length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Taula diagnòstic */}
                <ScrollArea className="flex-1 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partida</TableHead>
                        <TableHead className="text-right">Pressupostat</TableHead>
                        <TableHead className="text-right">Executat</TableHead>
                        {simulatedMoves.length > 0 && (
                          <TableHead className="text-right">Simulat</TableHead>
                        )}
                        <TableHead className="text-right">Diferència</TableHead>
                        <TableHead className="text-right">Desviació</TableHead>
                        <TableHead>Estat</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diagnostics.map(diag => (
                        <TableRow
                          key={diag.line.id}
                          className={selectedLineId === diag.line.id ? 'bg-muted' : ''}
                        >
                          <TableCell>
                            <div>
                              <span className="font-medium">{diag.line.name}</span>
                              {diag.line.code && (
                                <span className="text-muted-foreground text-xs ml-2">
                                  {diag.line.code}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(diag.budgeted)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(diag.executed)}
                          </TableCell>
                          {simulatedMoves.length > 0 && (
                            <TableCell className="text-right font-mono">
                              {diag.simulated !== diag.executed ? (
                                <span className="text-blue-600 font-medium">
                                  {formatAmount(diag.simulated)}
                                </span>
                              ) : (
                                formatAmount(diag.simulated)
                              )}
                            </TableCell>
                          )}
                          <TableCell className={`text-right font-mono ${diag.difference > 0 ? 'text-red-600' : diag.difference < 0 ? 'text-amber-600' : ''}`}>
                            {diag.difference > 0 ? '+' : ''}{formatAmount(diag.difference)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatPercent(diag.deviationPct)}
                          </TableCell>
                          <TableCell>
                            {diag.status === 'ok' ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            ) : diag.status === 'overSpend' ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Sobreexecució
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Infraexecució
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLineId(
                                selectedLineId === diag.line.id ? null : diag.line.id
                              )}
                            >
                              {selectedLineId === diag.line.id ? 'Tancar' : 'Veure opcions'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Suggeriments per partida seleccionada */}
                {selectedLineId && candidatesForSelectedLine.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Despeses suggerides per aquesta partida
                      </CardTitle>
                      <CardDescription>
                        {(() => {
                          const diag = diagnostics.find(d => d.line.id === selectedLineId);
                          if (!diag) return '';
                          if (diag.difference < 0) {
                            return `Et falten ${formatAmount(Math.abs(diag.difference))}`;
                          }
                          return `Tens ${formatAmount(diag.difference)} d'excés`;
                        })()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {candidatesForSelectedLine.map(candidate => (
                          <div
                            key={candidate.expense.txId}
                            className="flex items-center justify-between p-2 border rounded-md hover:bg-muted"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {candidate.expense.source === 'offBank' ? (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium">
                                  {candidate.expense.counterpartyName ?? candidate.expense.description ?? 'Sense descripció'}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {candidate.expense.date} · {formatAmount(Math.abs(candidate.expense.amountEUR))}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addSimulatedMove(
                                candidate.expense.txId,
                                candidate.currentBudgetLineId,
                                selectedLineId,
                                Math.abs(candidate.expense.amountEUR)
                              )}
                              disabled={simulatedMoves.some(m => m.txId === candidate.expense.txId)}
                            >
                              {simulatedMoves.some(m => m.txId === candidate.expense.txId) ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Afegit
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Simular
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* TAB: Despeses candidates */}
            <TabsContent value="candidates" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[400px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origen</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descripció</TableHead>
                      <TableHead className="text-right">Import</TableHead>
                      <TableHead>Estat actual</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map(candidate => (
                      <TableRow key={candidate.expense.txId}>
                        <TableCell>
                          {candidate.expense.source === 'offBank' ? (
                            <Badge variant="outline">
                              <FileText className="h-3 w-3 mr-1" />
                              Terreny
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Building2 className="h-3 w-3 mr-1" />
                              Seu
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {candidate.expense.date}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {candidate.expense.counterpartyName ?? candidate.expense.description ?? '-'}
                          </div>
                          {candidate.expense.categoryName && (
                            <div className="text-xs text-muted-foreground">
                              {candidate.expense.categoryName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(Math.abs(candidate.expense.amountEUR))}
                        </TableCell>
                        <TableCell>
                          {candidate.assignedToOtherProject ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {candidate.assignedToOtherProject}
                            </Badge>
                          ) : candidate.assignedToThisProject ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Info className="h-3 w-3 mr-1" />
                              {candidate.currentBudgetLineName ?? 'Sense partida'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Sense projecte
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {selectedLineId && !candidate.assignedToOtherProject && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addSimulatedMove(
                                candidate.expense.txId,
                                candidate.currentBudgetLineId,
                                selectedLineId,
                                Math.abs(candidate.expense.amountEUR)
                              )}
                              disabled={simulatedMoves.some(m => m.txId === candidate.expense.txId)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {!selectedLineId && (
                <div className="mt-4 p-4 border rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
                  <Info className="h-5 w-5 mx-auto mb-2" />
                  Selecciona una partida a la pestanya "Diagnòstic" per poder assignar despeses.
                </div>
              )}
            </TabsContent>

            {/* TAB: Simulació */}
            <TabsContent value="simulation" className="flex-1 overflow-hidden mt-4">
              {simulatedMoves.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Info className="h-12 w-12 mb-4 opacity-50" />
                  <p>No hi ha moviments simulats.</p>
                  <p className="text-sm">Selecciona despeses a les pestanyes anteriors.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[300px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Despesa</TableHead>
                          <TableHead>Origen</TableHead>
                          <TableHead>Destí</TableHead>
                          <TableHead className="text-right">Import</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulatedMoves.map(move => {
                          const expense = candidates.find(c => c.expense.txId === move.txId)?.expense;
                          const fromLine = budgetLines.find(l => l.id === move.fromBudgetLineId);
                          const toLine = budgetLines.find(l => l.id === move.toBudgetLineId);

                          return (
                            <TableRow key={move.txId}>
                              <TableCell>
                                <div className="text-sm">
                                  {expense?.counterpartyName ?? expense?.description ?? move.txId}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {expense?.date}
                                </div>
                              </TableCell>
                              <TableCell>
                                {fromLine ? (
                                  <Badge variant="outline">{fromLine.name}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">{toLine?.name ?? move.toBudgetLineId}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatAmount(move.amountEUR)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSimulatedMove(move.txId)}
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                    <div>
                      <p className="font-medium">Resum de la simulació</p>
                      <p className="text-sm text-muted-foreground">
                        {simulatedMoves.length} moviment{simulatedMoves.length !== 1 ? 's' : ''} ·
                        Total: {formatAmount(simulatedMoves.reduce((sum, m) => sum + m.amountEUR, 0))}
                      </p>
                    </div>
                    <Button variant="outline" onClick={clearSimulations}>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Esborrar tot
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tancar
          </Button>
          <Button
            onClick={applyChanges}
            disabled={simulatedMoves.length === 0 || isApplying || isSaving}
          >
            {isApplying || isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicant...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Aplicar {simulatedMoves.length} canvi{simulatedMoves.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
