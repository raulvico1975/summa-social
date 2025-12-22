// src/components/project-module/balance-project-modal.tsx
// Modal "Quadrar projecte" - Vista partida-cèntrica per justificació econòmica

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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  FileText,
  Building2,
  ArrowRight,
  ArrowDown,
  Undo2,
  Check,
  Loader2,
  Info,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  FileWarning,
  FolderOpen,
  Sparkles,
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
import {
  scoreExpenseForLine,
  findBestCombinations,
  type ScoredExpense,
  type SuggestionProposal,
} from '@/lib/project-module-suggestions';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS LOCALS
// ═══════════════════════════════════════════════════════════════════════════

interface SimulatedMove {
  txId: string;
  fromBudgetLineId: string | null;
  toBudgetLineId: string | null; // null = "Sense partida" (dins el projecte)
  amountEUR: number;
  action: 'add' | 'move' | 'remove' | 'unassign_line' | 'partial_unassign_line';
  // 'unassign_line' = treure tota la despesa de la partida → queda "Sense partida" però dins projecte
  // 'partial_unassign_line' = treure part de la despesa de la partida → split: part queda a la partida, part va a "Sense partida"
  originalAssignmentAmount?: number; // per saber l'import original quan és parcial (només partial_unassign_line)
}

interface BudgetLineDiagnostic {
  line: BudgetLine;
  budgeted: number;
  executed: number;
  simulated: number;
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
  currentAssignmentAmount: number; // Import assignat a la partida actual (valor absolut)
  matchScore: number;
  hasDocument: boolean;
}

interface ExpandSearchOptions {
  includeBankExpenses: boolean;
  includeOtherProjects: boolean;
  includeWithoutDocument: boolean;
  showAll: boolean;
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

function formatDateDMY(dateStr: string): string {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
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

function calculateMatchScore(expense: UnifiedExpense, line: BudgetLine): number {
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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface BalanceProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guidedMode?: boolean;
  project: Project;
  budgetLines: BudgetLine[];
  expenseLinks: ExpenseLink[];
  allExpenses: UnifiedExpenseWithLink[];
  onSuccess: () => void;
}

export function BalanceProjectModal({
  open,
  onOpenChange,
  guidedMode = false,
  project,
  budgetLines,
  expenseLinks,
  allExpenses,
  onSuccess,
}: BalanceProjectModalProps) {
  const { toast } = useToast();
  const { save: saveExpenseLink, isSaving } = useSaveExpenseLink();

  // Estat del mode guiat (activat si la prop és true, però pot desactivar-se internament)
  const [guidedModeActive, setGuidedModeActive] = React.useState(guidedMode);

  // Sincronitzar amb la prop quan s'obre
  React.useEffect(() => {
    if (open) {
      setGuidedModeActive(guidedMode);
    }
  }, [open, guidedMode]);

  // Estat de simulació
  const [simulatedMoves, setSimulatedMoves] = React.useState<SimulatedMove[]>([]);
  const [selectedLineId, setSelectedLineId] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);

  // Estat del bloc "Opcions per quadrar"
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandOptions, setExpandOptions] = React.useState<ExpandSearchOptions>({
    includeBankExpenses: false,
    includeOtherProjects: false,
    includeWithoutDocument: false,
    showAll: false,
  });
  const [expandSectionOpen, setExpandSectionOpen] = React.useState(false);

  // Estat per edició parcial (Mode Excés)
  const [partialEditTxId, setPartialEditTxId] = React.useState<string | null>(null);
  const [partialEditAmount, setPartialEditAmount] = React.useState('');

  // Reset quan s'obre
  React.useEffect(() => {
    if (open) {
      setSimulatedMoves([]);
      setSelectedLineId(null);
      setSearchQuery('');
      setExpandOptions({
        includeBankExpenses: false,
        includeOtherProjects: false,
        includeWithoutDocument: false,
        showAll: false,
      });
      setExpandSectionOpen(false);
      setPartialEditTxId(null);
      setPartialEditAmount('');
    }
  }, [open]);

  // Reset opcions cerca quan canvia la partida seleccionada
  React.useEffect(() => {
    setSearchQuery('');
    setExpandOptions({
      includeBankExpenses: false,
      includeOtherProjects: false,
      includeWithoutDocument: false,
      showAll: false,
    });
    setExpandSectionOpen(false);
    setPartialEditTxId(null);
    setPartialEditAmount('');
  }, [selectedLineId]);

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
      // Sumar al destí (si no és "remove")
      if (move.toBudgetLineId) {
        const currentDest = impact.get(move.toBudgetLineId) ?? 0;
        impact.set(move.toBudgetLineId, currentDest + move.amountEUR);
      }
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

  // Diagnòstic de la partida seleccionada
  const selectedDiag = React.useMemo(() => {
    if (!selectedLineId) return null;
    return diagnostics.find(d => d.line.id === selectedLineId) ?? null;
  }, [selectedLineId, diagnostics]);

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

  // Despeses candidates (base)
  const allCandidates = React.useMemo((): CandidateExpense[] => {
    const projectStart = project.startDate;
    const projectEnd = project.endDate;

    return allExpenses
      .filter(item => {
        const exp = item.expense;
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

        // Calcular score de matching amb la partida seleccionada
        let matchScore = 0;
        if (selectedLineId) {
          const selectedLine = budgetLines.find(l => l.id === selectedLineId);
          if (selectedLine) {
            matchScore = calculateMatchScore(exp, selectedLine);
          }
        }

        // Determinar si té document
        const hasDocument = !!exp.documentUrl || exp.source === 'bank'; // bank sempre té traçabilitat

        return {
          expense: exp,
          link,
          assignedToThisProject: !!thisProjectAssignment,
          assignedToOtherProject: otherProjectAssignment?.projectName ?? null,
          currentBudgetLineId: thisProjectAssignment?.budgetLineId ?? null,
          currentBudgetLineName: thisProjectAssignment?.budgetLineName ?? null,
          currentAssignmentAmount: thisProjectAssignment ? Math.abs(thisProjectAssignment.amountEUR) : 0,
          matchScore,
          hasDocument,
        };
      });
  }, [allExpenses, project, budgetLines, selectedLineId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLUCIONS SIMPLES DINS MARGE (per sobreexecució)
  // Criteri: treure una despesa completa deixa la partida dins del marge permès
  // ═══════════════════════════════════════════════════════════════════════════

  interface SimpleRemovalSolution {
    expense: CandidateExpense;
    resultingExecuted: number;
    resultingDeviationPct: number;
    resultingDifferenceEUR: number;
  }

  const simpleRemovalSolutions = React.useMemo((): SimpleRemovalSolution[] => {
    if (!selectedDiag || selectedDiag.difference <= 0) return [];

    const allowedDeviation = project.allowedDeviationPct ?? 10;
    const budgeted = selectedDiag.budgeted;

    // Obtenir despeses assignades a aquesta partida
    const expensesInLine = allCandidates.filter(c =>
      c.assignedToThisProject &&
      c.currentBudgetLineId === selectedLineId &&
      !simulatedMoves.some(m => m.txId === c.expense.txId)
    );

    const solutions: SimpleRemovalSolution[] = [];

    for (const candidate of expensesInLine) {
      const expenseAmount = candidate.currentAssignmentAmount;
      const resultingExecuted = selectedDiag.simulated - expenseAmount;
      const resultingDifference = resultingExecuted - budgeted;
      const resultingDeviationPct = budgeted > 0
        ? (resultingDifference / budgeted) * 100
        : 0;

      // Si la desviació resultant està dins del marge permès
      if (Math.abs(resultingDeviationPct) <= allowedDeviation) {
        solutions.push({
          expense: candidate,
          resultingExecuted,
          resultingDeviationPct,
          resultingDifferenceEUR: resultingDifference,
        });
      }
    }

    // Ordenar per menor desviació absoluta resultant
    return solutions.sort((a, b) =>
      Math.abs(a.resultingDeviationPct) - Math.abs(b.resultingDeviationPct)
    );
  }, [selectedDiag, selectedLineId, allCandidates, simulatedMoves, project.allowedDeviationPct]);

  // Nivell de fallback aplicat (per mostrar missatge a l'usuari)
  const [fallbackLevel, setFallbackLevel] = React.useState<1 | 2 | 3>(1);

  // Candidates filtrades per la partida seleccionada
  // IMPORTANT: Per sobreexecució, mostra sempre les despeses de la partida
  // Per infraexecució, aplica fallback progressiu si no hi ha bones opcions
  const candidatesForSelectedLine = React.useMemo(() => {
    if (!selectedLineId || !selectedDiag) return [];

    const isUnderSpend = selectedDiag.difference < 0; // falta executar
    const isOverSpend = selectedDiag.difference > 0; // excés

    let filtered = allCandidates;
    let currentFallbackLevel: 1 | 2 | 3 = 1;

    // Per SOBREEXECUCIÓ: mostrar despeses assignades a AQUESTA partida
    // Sempre, sense fallback - són les que hi ha
    if (isOverSpend) {
      filtered = filtered.filter(c => {
        return c.assignedToThisProject && c.currentBudgetLineId === selectedLineId;
      });
    }

    // Per INFRAEXECUCIÓ: aplicar fallback progressiu
    if (isUnderSpend && !expandOptions.showAll) {
      // Excloure les ja assignades a aquest projecte (ja estan comptades)
      const basePool = filtered.filter(c => !c.assignedToThisProject);

      // Nivell 1: Criteri estricte (offBank + no altres projectes)
      const nivel1 = basePool.filter(c => {
        if (c.assignedToOtherProject && !expandOptions.includeOtherProjects) return false;
        if (!expandOptions.includeBankExpenses && c.expense.source === 'bank') return false;
        return true;
      });

      // Si Nivell 1 té resultats, usar-los
      if (nivel1.length > 0) {
        filtered = nivel1;
        currentFallbackLevel = 1;
      } else {
        // Nivell 2: Relaxar - incloure despeses bancàries
        const nivel2 = basePool.filter(c => {
          if (c.assignedToOtherProject && !expandOptions.includeOtherProjects) return false;
          return true;
        });

        if (nivel2.length > 0) {
          filtered = nivel2;
          currentFallbackLevel = 2;
        } else {
          // Nivell 3: Totes les despeses del període (incloent altres projectes)
          filtered = basePool;
          currentFallbackLevel = 3;
        }
      }
    }

    // Actualitzar estat del nivell de fallback (fora del memo, via useEffect)
    // No podem fer setFallbackLevel aquí perquè estem dins un memo
    // Ho fem amb un efecte secundari
    setTimeout(() => setFallbackLevel(currentFallbackLevel), 0);

    // Filtrar per text de cerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const searchText = [
          c.expense.description,
          c.expense.counterpartyName,
          c.expense.categoryName,
        ].filter(Boolean).join(' ').toLowerCase();
        return searchText.includes(query);
      });
    }

    // Ordenar per score + proximitat a l'import necessari
    const neededAmount = Math.abs(selectedDiag.difference);
    filtered = filtered.sort((a, b) => {
      // Primer per score (les que tenen document i no estan en altres projectes pugen)
      const scoreA = a.matchScore - (a.hasDocument ? 0 : 2) - (a.assignedToOtherProject ? 3 : 0);
      const scoreB = b.matchScore - (b.hasDocument ? 0 : 2) - (b.assignedToOtherProject ? 3 : 0);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      // Després per proximitat a l'import necessari
      const diffA = Math.abs(Math.abs(a.expense.amountEUR) - neededAmount);
      const diffB = Math.abs(Math.abs(b.expense.amountEUR) - neededAmount);
      return diffA - diffB;
    });

    return filtered;
  }, [selectedLineId, selectedDiag, allCandidates, searchQuery, expandOptions]);

  // Comptar quantes n'hi hauria amb opcions relaxades
  const expandedCounts = React.useMemo(() => {
    if (!selectedLineId || !selectedDiag || selectedDiag.difference >= 0) return null;

    const baseFiltered = allCandidates.filter(c => !c.assignedToThisProject);

    const withBank = baseFiltered.filter(c => c.expense.source === 'bank' && !c.assignedToOtherProject).length;
    const fromOtherProjects = baseFiltered.filter(c => !!c.assignedToOtherProject).length;
    const withoutDoc = baseFiltered.filter(c => !c.hasDocument && !c.assignedToOtherProject).length;
    const total = baseFiltered.length;

    return { withBank, fromOtherProjects, withoutDoc, total };
  }, [selectedLineId, selectedDiag, allCandidates]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPOSTES AUTOMÀTIQUES (només per infraexecució)
  // ═══════════════════════════════════════════════════════════════════════════

  const suggestionProposals = React.useMemo((): SuggestionProposal[] => {
    // Només per infraexecució
    if (!selectedLineId || !selectedDiag || selectedDiag.difference >= 0) return [];

    const deficit = Math.abs(selectedDiag.difference);
    const toleranceEUR = Math.max(2, deficit * 0.02);
    const selectedLine = budgetLines.find(l => l.id === selectedLineId);
    if (!selectedLine) return [];

    // Construir pool de despeses candidates amb score
    const scoredPool: ScoredExpense[] = candidatesForSelectedLine
      .filter(c => !simulatedMoves.some(m => m.txId === c.expense.txId)) // Excloure ja simulades
      .map(c => ({
        expense: c.expense,
        score: scoreExpenseForLine(c.expense, selectedLine, {
          deficit,
          hasDocument: c.hasDocument,
          assignedToOtherProject: !!c.assignedToOtherProject,
        }),
        hasDocument: c.hasDocument,
        assignedToOtherProject: c.assignedToOtherProject,
      }));

    // Trobar millors combinacions
    return findBestCombinations(scoredPool, deficit, toleranceEUR);
  }, [selectedLineId, selectedDiag, budgetLines, candidatesForSelectedLine, simulatedMoves]);

  // Handler per simular una proposta sencera
  const simulateProposal = (proposal: SuggestionProposal) => {
    trackUX('balance.simulateProposal', {
      proposalId: proposal.id,
      expenseCount: proposal.expenses.length,
      sumEUR: proposal.sumEUR,
      label: proposal.label,
    });

    for (const scored of proposal.expenses) {
      const candidate = allCandidates.find(c => c.expense.txId === scored.expense.txId);
      addSimulatedMove(
        scored.expense.txId,
        candidate?.currentBudgetLineId ?? null,
        selectedLineId,
        Math.abs(scored.expense.amountEUR),
        candidate?.assignedToThisProject ? 'move' : 'add'
      );
    }
  };

  // Afegir moviment simulat
  const addSimulatedMove = (
    txId: string,
    fromBudgetLineId: string | null,
    toBudgetLineId: string | null,
    amountEUR: number,
    action: SimulatedMove['action'],
    originalAssignmentAmount?: number
  ) => {
    trackUX('balance.simulateMove', { txId, fromBudgetLineId, toBudgetLineId, amountEUR, action });

    setSimulatedMoves(prev => {
      // Si ja hi ha un moviment per aquest txId, substituir-lo
      const existing = prev.findIndex(m => m.txId === txId);
      const newMove: SimulatedMove = {
        txId,
        fromBudgetLineId,
        toBudgetLineId,
        amountEUR,
        action,
        ...(originalAssignmentAmount !== undefined && { originalAssignmentAmount }),
      };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newMove;
        return updated;
      }
      return [...prev, newMove];
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
        const existingLink = expenseLinks.find(l => l.id === move.txId);
        let newAssignments: ExpenseAssignment[];

        if (move.action === 'remove') {
          // Treure l'assignació d'aquest projecte completament
          if (existingLink) {
            newAssignments = existingLink.assignments.filter(a => a.projectId !== project.id);
          } else {
            continue; // No hi ha res a treure
          }
        } else if (move.action === 'unassign_line') {
          // Treure de la partida però mantenir al projecte (→ "Sense partida")
          if (existingLink) {
            newAssignments = existingLink.assignments.map(a => {
              if (a.projectId === project.id && a.budgetLineId === move.fromBudgetLineId) {
                return {
                  ...a,
                  budgetLineId: null,
                  budgetLineName: null,
                };
              }
              return a;
            });
          } else {
            continue;
          }
        } else if (move.action === 'partial_unassign_line') {
          // Split: part queda a la partida, part va a "Sense partida"
          if (existingLink && move.originalAssignmentAmount) {
            const remainingInLine = move.originalAssignmentAmount - move.amountEUR;
            newAssignments = [];

            for (const a of existingLink.assignments) {
              if (a.projectId === project.id && a.budgetLineId === move.fromBudgetLineId) {
                // Assignació que queda a la partida (amb import reduït)
                if (remainingInLine > 0.01) {
                  newAssignments.push({
                    ...a,
                    amountEUR: -Math.abs(remainingInLine),
                  });
                }
                // Nova assignació "Sense partida"
                newAssignments.push({
                  projectId: project.id,
                  projectName: project.name,
                  amountEUR: -Math.abs(move.amountEUR),
                  budgetLineId: null,
                  budgetLineName: null,
                });
              } else {
                newAssignments.push(a);
              }
            }
          } else {
            continue;
          }
        } else if (existingLink) {
          // Modificar assignació existent (add/move)
          const hasThisProject = existingLink.assignments.some(a => a.projectId === project.id);

          if (hasThisProject) {
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
          } else {
            // Afegir nova assignació a aquest projecte
            const newLine = budgetLines.find(l => l.id === move.toBudgetLineId);
            newAssignments = [
              ...existingLink.assignments,
              {
                projectId: project.id,
                projectName: project.name,
                amountEUR: -Math.abs(move.amountEUR),
                budgetLineId: move.toBudgetLineId,
                budgetLineName: newLine?.name ?? null,
              },
            ];
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

        // Si no queden assignacions, esborrar el link (o no crear-lo)
        if (newAssignments.length === 0) {
          // El hook save amb array buit hauria d'esborrar, però per seguretat
          // no fem res si no tenim assignacions
          continue;
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

  // Handler per tancar el bloc d'opcions
  const handleCloseOptions = () => {
    setSelectedLineId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col" guidedMode={guidedModeActive}>
        {/* Banner mode guiat */}
        {guidedModeActive && (
          <div className="flex items-center justify-between px-3 py-2 -mx-6 -mt-6 mb-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-b border-purple-200/50">
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Justificació assistida</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100/50"
              onClick={() => setGuidedModeActive(false)}
            >
              Desactivar guia
            </Button>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>Quadrar justificació del projecte</DialogTitle>
          <DialogDescription>
            Revisió de desviacions i proposta de moviments abans de justificar
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="diagnostic" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="diagnostic">
                Diagnòstic
                {summary.outOfDeviation > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {summary.outOfDeviation}
                  </Badge>
                )}
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
                      <CardDescription>Desviació permesa</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        ±{project.allowedDeviationPct ?? 10}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Taula diagnòstic */}
                <div className="border rounded-md overflow-hidden">
                  <ScrollArea className={selectedLineId ? 'h-[180px]' : 'h-[280px]'}>
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
                            <TableCell>
                              {diag.status === 'ok' ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              ) : diag.status === 'overSpend' ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Excés
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Falta
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant={selectedLineId === diag.line.id ? 'secondary' : 'ghost'}
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
                </div>

                {/* Bloc "Opcions per quadrar la partida" */}
                {selectedLineId && selectedDiag && (
                  <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          Opcions per quadrar: {selectedDiag.line.name}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={handleCloseOptions}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        {selectedDiag.difference < 0 ? (
                          <span className="text-amber-700">
                            <TrendingDown className="h-4 w-4 inline mr-1" />
                            Et falten <strong>{formatAmount(Math.abs(selectedDiag.difference))}</strong> per arribar al pressupost d'aquesta partida.
                          </span>
                        ) : (
                          <span className="text-red-700">
                            <TrendingUp className="h-4 w-4 inline mr-1" />
                            Tens un excés de <strong>{formatAmount(selectedDiag.difference)}</strong> en aquesta partida.
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden p-0">
                      <ScrollArea className="h-full px-6 pb-6">
                        <div className="flex flex-col gap-3">
                      {/* BLOC SOLUCIÓ RECOMANADA (només sobreexecució amb solució dins marge) */}
                      {selectedDiag.difference > 0 && simpleRemovalSolutions.length > 0 && (
                        <div className="border rounded-lg bg-gradient-to-r from-green-50/50 to-emerald-50/50 p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">Solució recomanada (mínima intervenció)</span>
                          </div>

                          <div className="p-3 rounded-md border border-green-300 bg-white">
                            {(() => {
                              const best = simpleRemovalSolutions[0];
                              const exp = best.expense.expense;
                              return (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700">
                                    Si treus la despesa de{' '}
                                    <strong className="font-mono">{formatAmount(best.expense.currentAssignmentAmount)}</strong>
                                    {exp.counterpartyName && (
                                      <span className="text-muted-foreground"> ({exp.counterpartyName})</span>
                                    )}
                                    , la partida queda amb una desviació de{' '}
                                    <strong className="font-mono">
                                      {formatAmount(Math.abs(best.resultingDifferenceEUR))}
                                    </strong>{' '}
                                    ({formatPercent(Math.abs(best.resultingDeviationPct))}),
                                    dins del marge permès.
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        trackUX('balance.simpleRemoval', {
                                          txId: exp.txId,
                                          amount: best.expense.currentAssignmentAmount,
                                          resultingDeviation: best.resultingDeviationPct,
                                        });
                                        addSimulatedMove(
                                          exp.txId,
                                          selectedLineId,
                                          null,
                                          best.expense.currentAssignmentAmount,
                                          'unassign_line'
                                        );
                                      }}
                                    >
                                      <ArrowDown className="h-3 w-3 mr-1" />
                                      Treure aquesta despesa
                                    </Button>
                                    {simpleRemovalSolutions.length > 1 && (
                                      <span className="text-xs text-muted-foreground">
                                        (+{simpleRemovalSolutions.length - 1} alternatives)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Separador visual (sobreexecució amb solució) */}
                      {selectedDiag.difference > 0 && simpleRemovalSolutions.length > 0 && candidatesForSelectedLine.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t" />
                          <span className="text-xs text-muted-foreground">o ajusta manualment</span>
                          <div className="flex-1 border-t" />
                        </div>
                      )}

                      {/* BLOC PROPOSTES AUTOMÀTIQUES (només infraexecució) */}
                      {selectedDiag.difference < 0 && suggestionProposals.length > 0 && (
                        <div className="border rounded-lg bg-gradient-to-r from-violet-50/50 to-purple-50/50 p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Propostes automàtiques</span>
                            <Badge variant="secondary" className="text-xs">
                              {suggestionProposals.length}
                            </Badge>
                          </div>

                          <div className="grid gap-2">
                            {suggestionProposals.slice(0, 3).map((proposal) => (
                              <div
                                key={proposal.id}
                                className={`p-2 rounded-md border bg-white ${
                                  proposal.label === 'perfect'
                                    ? 'border-green-300 bg-green-50/50'
                                    : proposal.label === 'close'
                                    ? 'border-blue-200'
                                    : 'border-gray-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {proposal.label === 'perfect' && (
                                        <Badge className="bg-green-600 text-xs">Exacte</Badge>
                                      )}
                                      {proposal.label === 'close' && (
                                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Proper</Badge>
                                      )}
                                      {proposal.label === 'approx' && (
                                        <Badge variant="outline" className="text-xs">Aproximat</Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {proposal.expenses.length} despesa{proposal.expenses.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-mono font-medium">{formatAmount(proposal.sumEUR)}</span>
                                      {proposal.deltaEUR > 0.01 && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                          (dif. {formatAmount(proposal.deltaEUR)})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 truncate">
                                      {proposal.expenses.map(e =>
                                        e.expense.counterpartyName ?? e.expense.description ?? 'Despesa'
                                      ).join(', ')}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={proposal.label === 'perfect' ? 'default' : 'outline'}
                                    className="shrink-0"
                                    onClick={() => simulateProposal(proposal)}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    Simular
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {suggestionProposals.length > 3 && (
                            <p className="text-xs text-center text-muted-foreground">
                              +{suggestionProposals.length - 3} propostes més disponibles
                            </p>
                          )}
                        </div>
                      )}

                      {/* Separador visual */}
                      {selectedDiag.difference < 0 && suggestionProposals.length > 0 && candidatesForSelectedLine.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t" />
                          <span className="text-xs text-muted-foreground">o selecciona manualment</span>
                          <div className="flex-1 border-t" />
                        </div>
                      )}

                      {/* Barra de cerca */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cercar per descripció, proveïdor o categoria..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Indicador de fallback aplicat (només infraexecució) */}
                      {selectedDiag.difference < 0 && fallbackLevel > 1 && candidatesForSelectedLine.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                          <Info className="h-4 w-4 shrink-0" />
                          <span>
                            {fallbackLevel === 2
                              ? "S'han inclòs despeses bancàries perquè no hi havia prou despeses de terreny."
                              : "S'han inclòs totes les despeses del període perquè no hi havia prou opcions amb criteri estricte."}
                          </span>
                        </div>
                      )}

                      {/* Llista de candidates */}
                      <ScrollArea className="flex-1 min-h-[120px] border rounded-md">
                        {candidatesForSelectedLine.length === 0 ? (
                          <div className="p-6 text-center">
                            <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            {selectedDiag.difference > 0 ? (
                              <>
                                <p className="text-sm text-muted-foreground mb-2">
                                  No hi ha despeses assignades a aquesta partida.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Revisa si les despeses estan assignades a altres partides o sense partida dins el projecte.
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground mb-2">
                                  No hem trobat despeses disponibles per afegir a aquesta partida.
                                </p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Pot ser que totes les despeses del període ja estiguin assignades a altres projectes o partides.
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExpandSectionOpen(true)}
                                >
                                  Ampliar la cerca
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 space-y-2">
                            {candidatesForSelectedLine.slice(0, 10).map(candidate => {
                              const isSimulated = simulatedMoves.some(m => m.txId === candidate.expense.txId);
                              const simulatedMove = simulatedMoves.find(m => m.txId === candidate.expense.txId);
                              const isOverSpendMode = selectedDiag.difference > 0;
                              const isEditingPartial = partialEditTxId === candidate.expense.txId;
                              const excessAmount = selectedDiag.difference; // Import d'excés pendent
                              const canPartialRemove = isOverSpendMode && candidate.currentAssignmentAmount > excessAmount;

                              return (
                                <div
                                  key={candidate.expense.txId}
                                  className={`p-2 border rounded-md hover:bg-muted ${isSimulated ? 'bg-blue-50 border-blue-200' : ''}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        {candidate.expense.source === 'offBank' ? (
                                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                        ) : (
                                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                        )}
                                        <span className="text-sm font-medium truncate">
                                          {candidate.expense.counterpartyName ?? candidate.expense.description ?? 'Sense descripció'}
                                        </span>
                                        {!candidate.hasDocument && (
                                          <span title="Sense document">
                                            <FileWarning className="h-3 w-3 text-amber-500 shrink-0" />
                                          </span>
                                        )}
                                        {candidate.assignedToOtherProject && (
                                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                                            {candidate.assignedToOtherProject}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground flex gap-2">
                                        <span>{formatDateDMY(candidate.expense.date)}</span>
                                        <span>·</span>
                                        <span className="font-mono">{formatAmount(candidate.currentAssignmentAmount)}</span>
                                        {candidate.expense.categoryName && (
                                          <>
                                            <span>·</span>
                                            <span>{candidate.expense.categoryName}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="shrink-0 ml-2 flex gap-1">
                                      {isSimulated ? (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => removeSimulatedMove(candidate.expense.txId)}
                                        >
                                          <Undo2 className="h-4 w-4 mr-1" />
                                          Desfer
                                        </Button>
                                      ) : selectedDiag.difference < 0 ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => addSimulatedMove(
                                            candidate.expense.txId,
                                            candidate.currentBudgetLineId,
                                            selectedLineId,
                                            Math.abs(candidate.expense.amountEUR),
                                            candidate.assignedToThisProject ? 'move' : 'add'
                                          )}
                                        >
                                          <ArrowRight className="h-4 w-4 mr-1" />
                                          Simular aquí
                                        </Button>
                                      ) : (
                                        <>
                                          {/* Mode Excés: Treure de la partida */}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-amber-600 hover:text-amber-700"
                                            onClick={() => addSimulatedMove(
                                              candidate.expense.txId,
                                              selectedLineId,
                                              null, // null = "Sense partida" però dins projecte
                                              candidate.currentAssignmentAmount,
                                              'unassign_line'
                                            )}
                                            title="Treure tota la despesa de la partida (quedarà 'Sense partida' dins el projecte)"
                                          >
                                            <ArrowDown className="h-4 w-4 mr-1" />
                                            Treure tot
                                          </Button>
                                          {/* Botó per mostrar edició parcial - secundari amb microcopy */}
                                          {canPartialRemove && !isEditingPartial && (
                                            <div className="flex flex-col items-end gap-0.5">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                  setPartialEditTxId(candidate.expense.txId);
                                                  // Només pre-omplir amb l'excés si NO hi ha solució simple dins marge
                                                  setPartialEditAmount(
                                                    simpleRemovalSolutions.length === 0
                                                      ? excessAmount.toFixed(2)
                                                      : ''
                                                  );
                                                }}
                                                title="Ajust fi per quadrar exactament"
                                              >
                                                Parcial...
                                              </Button>
                                              <span className="text-[10px] text-muted-foreground/70">
                                                (només si cal quadrar exactament)
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* UI per edició parcial (Mode Excés) */}
                                  {isEditingPartial && isOverSpendMode && (
                                    <div className="mt-2 pt-2 border-t flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Treure:</span>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={candidate.currentAssignmentAmount.toFixed(2)}
                                        value={partialEditAmount}
                                        onChange={(e) => setPartialEditAmount(e.target.value)}
                                        className="w-24 h-7 text-xs font-mono text-right"
                                      />
                                      <span className="text-xs text-muted-foreground">€</span>
                                      {/* Botó ràpid "= Excés" només si NO hi ha solucions simples dins marge */}
                                      {simpleRemovalSolutions.length === 0 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs text-green-600 hover:text-green-700"
                                          onClick={() => {
                                            setPartialEditAmount(excessAmount.toFixed(2));
                                          }}
                                          title={`Treure exactament ${formatAmount(excessAmount)} per quadrar`}
                                        >
                                          = Excés ({formatAmount(excessAmount)})
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                          const amount = parseFloat(partialEditAmount);
                                          if (amount > 0 && amount <= candidate.currentAssignmentAmount) {
                                            addSimulatedMove(
                                              candidate.expense.txId,
                                              selectedLineId,
                                              null,
                                              amount,
                                              'partial_unassign_line',
                                              candidate.currentAssignmentAmount
                                            );
                                            setPartialEditTxId(null);
                                            setPartialEditAmount('');
                                          }
                                        }}
                                        disabled={
                                          !partialEditAmount ||
                                          parseFloat(partialEditAmount) <= 0 ||
                                          parseFloat(partialEditAmount) > candidate.currentAssignmentAmount
                                        }
                                      >
                                        Aplicar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                          setPartialEditTxId(null);
                                          setPartialEditAmount('');
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}

                                  {/* Mostrar info de simulació parcial */}
                                  {simulatedMove?.action === 'partial_unassign_line' && (
                                    <div className="mt-1 text-xs text-blue-600">
                                      Treure {formatAmount(simulatedMove.amountEUR)} → Sense partida
                                      {simulatedMove.originalAssignmentAmount && (
                                        <span className="text-muted-foreground ml-1">
                                          (quedarà {formatAmount(simulatedMove.originalAssignmentAmount - simulatedMove.amountEUR)} a la partida)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {candidatesForSelectedLine.length > 10 && (
                              <p className="text-xs text-center text-muted-foreground py-2">
                                Mostrant 10 de {candidatesForSelectedLine.length} resultats. Utilitza la cerca per refinar.
                              </p>
                            )}
                          </div>
                        )}
                      </ScrollArea>

                      {/* Bloc "Ampliar cerca" */}
                      {selectedDiag.difference < 0 && (
                        <div className="border rounded-md">
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-3 h-auto"
                            onClick={() => setExpandSectionOpen(!expandSectionOpen)}
                          >
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Search className="h-4 w-4" />
                              No et serveix? Ampliar cerca
                            </span>
                            {expandSectionOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>

                          {expandSectionOpen && (
                            <div className="px-3 pb-3 space-y-3">
                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  id="includeBankExpenses"
                                  checked={expandOptions.includeBankExpenses}
                                  onCheckedChange={(checked) => setExpandOptions(prev => ({
                                    ...prev,
                                    includeBankExpenses: !!checked,
                                  }))}
                                />
                                <div className="grid gap-0.5 leading-none">
                                  <Label htmlFor="includeBankExpenses" className="text-sm cursor-pointer">
                                    Incloure despeses de la Seu (bancàries)
                                    {expandedCounts && (
                                      <Badge variant="secondary" className="ml-2 text-xs">{expandedCounts.withBank}</Badge>
                                    )}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">Moviments bancaris amb traçabilitat.</p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  id="includeOtherProjects"
                                  checked={expandOptions.includeOtherProjects}
                                  onCheckedChange={(checked) => setExpandOptions(prev => ({
                                    ...prev,
                                    includeOtherProjects: !!checked,
                                  }))}
                                />
                                <div className="grid gap-0.5 leading-none">
                                  <Label htmlFor="includeOtherProjects" className="text-sm cursor-pointer">
                                    Incloure despeses d'altres projectes
                                    {expandedCounts && (
                                      <Badge variant="secondary" className="ml-2 text-xs">{expandedCounts.fromOtherProjects}</Badge>
                                    )}
                                  </Label>
                                  <p className="text-xs text-amber-600">
                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    Això pot desquadrar l'altre projecte.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  id="includeWithoutDocument"
                                  checked={expandOptions.includeWithoutDocument}
                                  onCheckedChange={(checked) => setExpandOptions(prev => ({
                                    ...prev,
                                    includeWithoutDocument: !!checked,
                                  }))}
                                />
                                <div className="grid gap-0.5 leading-none">
                                  <Label htmlFor="includeWithoutDocument" className="text-sm cursor-pointer">
                                    Incloure despeses sense document
                                    {expandedCounts && (
                                      <Badge variant="secondary" className="ml-2 text-xs">{expandedCounts.withoutDoc}</Badge>
                                    )}
                                  </Label>
                                  <p className="text-xs text-amber-600">
                                    <FileWarning className="h-3 w-3 inline mr-1" />
                                    Potser no serà justificable si el finançador demana comprovant.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  id="showAll"
                                  checked={expandOptions.showAll}
                                  onCheckedChange={(checked) => setExpandOptions(prev => ({
                                    ...prev,
                                    showAll: !!checked,
                                  }))}
                                />
                                <div className="grid gap-0.5 leading-none">
                                  <Label htmlFor="showAll" className="text-sm cursor-pointer">
                                    Veure totes les despeses del període
                                    {expandedCounts && (
                                      <Badge variant="secondary" className="ml-2 text-xs">{expandedCounts.total}</Badge>
                                    )}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">Mostrar totes sense restriccions.</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* TAB: Simulació */}
            <TabsContent value="simulation" className="flex-1 overflow-hidden mt-4">
              {simulatedMoves.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Info className="h-12 w-12 mb-4 opacity-50" />
                  <p>No hi ha moviments simulats.</p>
                  <p className="text-sm">Selecciona una partida i afegeix despeses.</p>
                </div>
              ) : (
                <div className="space-y-4 h-full flex flex-col">
                  <ScrollArea className="flex-1 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Despesa</TableHead>
                          <TableHead>Acció</TableHead>
                          <TableHead>Origen</TableHead>
                          <TableHead>Destí</TableHead>
                          <TableHead className="text-right">Import</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulatedMoves.map(move => {
                          const candidate = allCandidates.find(c => c.expense.txId === move.txId);
                          const expense = candidate?.expense;
                          const fromLine = budgetLines.find(l => l.id === move.fromBudgetLineId);
                          const toLine = budgetLines.find(l => l.id === move.toBudgetLineId);

                          return (
                            <TableRow key={move.txId}>
                              <TableCell>
                                <div className="text-sm">
                                  {expense?.counterpartyName ?? expense?.description ?? move.txId}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {expense?.date && formatDateDMY(expense.date)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {move.action === 'add' && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700">Afegir</Badge>
                                )}
                                {move.action === 'move' && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">Moure</Badge>
                                )}
                                {move.action === 'remove' && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700">Treure del projecte</Badge>
                                )}
                                {move.action === 'unassign_line' && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700">Treure de partida</Badge>
                                )}
                                {move.action === 'partial_unassign_line' && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700">Split parcial</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {fromLine ? (
                                  <span className="text-sm">{fromLine.name}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {toLine ? (
                                  <span className="text-sm font-medium">{toLine.name}</span>
                                ) : move.toBudgetLineId === null && (move.action === 'unassign_line' || move.action === 'partial_unassign_line') ? (
                                  <span className="text-sm italic text-amber-600">Sense partida</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
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
