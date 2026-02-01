'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Edit, Archive, TrendingUp, TrendingDown, DollarSign, Briefcase } from 'lucide-react';
import type { Project, Emisor, Transaction } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { StatCard } from './stat-card';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { ReassignModal } from './reassign-modal';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { normalizeProject, formatCurrencyEU } from '@/lib/normalize';


export function ProjectManager() {
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const MISSION_TRANSFER_CATEGORY_KEY = 'missionTransfers';

  // ═══════════════════════════════════════════════════════════════════════════
  // CANVI: Ara les col·leccions apunten a organizations/{orgId}/...
  // ═══════════════════════════════════════════════════════════════════════════
  const projectsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'projects') : null,
    [firestore, organizationId]
  );
  const emissorsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'emissors') : null,
    [firestore, organizationId]
  );
  const transactionsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );

  const { data: projects } = useCollection<Project>(projectsCollection);
  const { data: emissors } = useCollection<Emisor>(emissorsCollection);
  const { data: transactions } = useCollection<Transaction>(transactionsCollection);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isReassignOpen, setIsReassignOpen] = React.useState(false);
  const [isFunderDialogOpen, setIsFunderDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [projectToArchive, setProjectToArchive] = React.useState<Project | null>(null);
  const [affectedTransactionsCount, setAffectedTransactionsCount] = React.useState<number | null>(null);
  const [isCountingTransactions, setIsCountingTransactions] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [formData, setFormData] = React.useState<Omit<Project, 'id'>>({ name: '', funderId: null });
  const [newFunderName, setNewFunderName] = React.useState('');
  const { toast } = useToast();

  // Filtrar projects actius (no arxivats)
  const activeProjects = React.useMemo(() =>
    projects?.filter((p) => !p.archivedAt) || [],
    [projects]
  );
  
  const emisorMap = React.useMemo(() => 
    emissors?.reduce((acc, emisor) => {
      acc[emisor.id] = emisor.name;
      return acc;
    }, {} as Record<string, string>) || {}, 
  [emissors]);

  const projectBalances = React.useMemo(() => {
    if (!projects || !transactions) return {};
    const balances: Record<string, { funded: number; sent: number; expenses: number }> = {};
    projects.forEach(p => {
        balances[p.id] = { funded: 0, sent: 0, expenses: 0 };
    });
    transactions.forEach(tx => {
        if (tx.projectId && balances[tx.projectId]) {
            if (tx.amount > 0) {
                balances[tx.projectId].funded += tx.amount;
            } else {
                 if (tx.category === MISSION_TRANSFER_CATEGORY_KEY) {
                    balances[tx.projectId].sent += Math.abs(tx.amount);
                } else {
                    balances[tx.projectId].expenses += Math.abs(tx.amount);
                }
            }
        }
    });
    return balances;
  }, [projects, transactions, MISSION_TRANSFER_CATEGORY_KEY]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({ name: project.name, funderId: project.funderId });
    setIsDialogOpen(true);
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ARXIVAT (v1.35): Flux amb reassignació via API
  // ═══════════════════════════════════════════════════════════════════════════

  const handleArchiveRequest = async (project: Project) => {
    if (!organizationId) return;
    setProjectToArchive(project);
    setAffectedTransactionsCount(null);
    setIsCountingTransactions(true);

    try {
      // Comptar moviments actius amb aquest projectId
      // NOTA: No podem usar where('archivedAt', '==', null) perquè Firestore
      // no troba documents on el camp no existeix (dades legacy sense archivedAt)
      const transactionsRef = collection(firestore, 'organizations', organizationId, 'transactions');
      const q = query(
        transactionsRef,
        where('projectId', '==', project.id)
      );
      const snapshot = await getDocs(q);
      // Filtrar actives a codi (archivedAt == null o undefined/absent)
      const count = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.archivedAt == null; // Cobreix null i undefined
      }).length;
      setAffectedTransactionsCount(count);

      if (count > 0) {
        // Hi ha moviments actius → obrir modal de reassignació
        setIsReassignOpen(true);
      } else {
        // No hi ha moviments → confirmació simple per arxivar
        setIsAlertOpen(true);
      }
    } catch (error) {
      console.error('Error comptant transaccions:', error);
      setAffectedTransactionsCount(0);
      setIsAlertOpen(true);
    } finally {
      setIsCountingTransactions(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!projectToArchive || !user) return;

    setIsArchiving(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/projects/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: organizationId,
          fromProjectId: projectToArchive.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: t.projects?.projectArchivedToast ?? 'Eix arxivat',
          description: t.projects?.projectArchivedToastDescription?.(projectToArchive.name) ?? `L'eix "${projectToArchive.name}" ha estat arxivat.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: t.projects?.archiveError ?? 'Error en arxivar',
          description: result.error || 'Error desconegut',
        });
      }
    } catch (error) {
      console.error('Error arxivant eix:', error);
      toast({
        variant: 'destructive',
        title: t.projects?.archiveError ?? 'Error en arxivar',
        description: error instanceof Error ? error.message : 'Error desconegut',
      });
    } finally {
      setIsArchiving(false);
      setIsAlertOpen(false);
      setProjectToArchive(null);
    }
  };

  const handleReassignConfirm = async (toProjectId: string): Promise<{ success: boolean; error?: string }> => {
    if (!projectToArchive || !user) {
      return { success: false, error: 'No hi ha eix seleccionat' };
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/projects/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: organizationId,
          fromProjectId: projectToArchive.id,
          toProjectId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: t.projects?.projectArchivedToast ?? 'Eix arxivat',
          description: `${result.reassignedCount ?? 0} moviments reassignats. "${projectToArchive.name}" arxivat.`,
        });
        setProjectToArchive(null);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Error desconegut' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconegut' };
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProject(null);
      setFormData({ name: '', funderId: null });
    }
  }
  
  const handleAddNew = () => {
    setEditingProject(null);
    setFormData({ name: '', funderId: null });
    setIsDialogOpen(true);
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  }

  const handleSelectChange = (value: string | null) => {
    setFormData({ ...formData, funderId: value });
  }
  
 const handleSave = () => {
    if (!formData.name.trim()) {
       toast({ variant: 'destructive', title: t.common.error, description: t.projects.errorNameEmpty });
       return;
    }

    if (!projectsCollection) {
      toast({ variant: 'destructive', title: t.common.error, description: t.common.dbConnectionError });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NORMALITZACIÓ: Aplicar format consistent abans de guardar
    // ═══════════════════════════════════════════════════════════════════════
    const normalized = normalizeProject(formData);

    if (editingProject) {
      // Update
      setDocumentNonBlocking(doc(projectsCollection, editingProject.id), normalized, { merge: true });
      toast({ title: t.projects.projectUpdated, description: t.projects.projectUpdatedDescription(normalized.name) });
    } else {
      // Create
      addDocumentNonBlocking(projectsCollection, normalized);
      toast({ title: t.projects.projectCreated, description: t.projects.projectCreatedDescription(normalized.name) });
    }
    handleOpenChange(false);
  }

  const handleCreateFunder = () => {
    if (!newFunderName.trim()) {
      toast({ variant: 'destructive', title: t.common.error, description: t.common.error });
      return;
    }

    if (!emissorsCollection) {
      toast({ variant: 'destructive', title: t.common.error, description: t.common.dbConnectionError });
      return;
    }

    const newFunder: Omit<Emisor, 'id'> = {
      name: newFunderName.trim(),
      taxId: '',
      zipCode: '',
      type: 'donor',
    };

    const docRef = doc(emissorsCollection);
    addDocumentNonBlocking(emissorsCollection, { ...newFunder, id: docRef.id });

    // Assignar automàticament el nou finançador al projecte
    setFormData({ ...formData, funderId: docRef.id });

    toast({
      description: t.projects.funderCreated(newFunderName.trim()),
    });

    setNewFunderName('');
    setIsFunderDialogOpen(false);
  }

  const dialogTitle = editingProject ? t.projects.edit : t.projects.addTitle;
  const dialogDescription = editingProject ? t.projects.editDescription : t.projects.addDescription;

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <div className='flex justify-end mb-6'>
            <DialogTrigger asChild>
                <Button size="sm" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.projects.add}
                </Button>
            </DialogTrigger>
        </div>
        
        {/* Mostrar només eixos actius (no arxivats) */}
        {activeProjects.length === 0 ? (
            <Card>
                <CardHeader>
                    <CardTitle>{t.projects.noProjectsTitle}</CardTitle>
                    <CardDescription>{t.projects.noProjectsDescription}</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t.projects.createFirst}
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <div className="grid gap-6">
                {activeProjects.map(project => {
                    const balance = projectBalances[project.id] || { funded: 0, sent: 0, expenses: 0 };
                    const remaining = balance.funded - balance.sent - balance.expenses;

                    return (
                        <Card key={project.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{project.name}</CardTitle>
                                        <CardDescription>
                                            {t.projects.funder}: {project.funderId && emisorMap[project.funderId] ? emisorMap[project.funderId] : t.projects.notAssigned}
                                        </CardDescription>
                                    </div>
                                    <div>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-amber-500 hover:text-amber-600"
                                            onClick={() => handleArchiveRequest(project)}
                                            title="Arxivar"
                                            >
                                            <Archive className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <StatCard
                                        title={t.projects.totalFunded}
                                        value={formatCurrencyEU(balance.funded)}
                                        icon={TrendingUp}
                                        />
                                    <StatCard
                                        title={t.projects.totalSent}
                                        value={formatCurrencyEU(balance.sent)}
                                        icon={TrendingDown}
                                        />
                                    <StatCard
                                        title={t.projects.expensesInSpain}
                                        value={formatCurrencyEU(balance.expenses)}
                                        icon={Briefcase}
                                        />
                                    <StatCard
                                        title={t.projects.pendingBalance}
                                        value={formatCurrencyEU(remaining)}
                                        icon={DollarSign}
                                        />
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        )}
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {t.projects.name}
            </Label>
            <Input id="name" value={formData.name} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t.projects.funder}
            </Label>
            <div className="col-span-3 space-y-2">
              <Select value={formData.funderId || ''} onValueChange={(value) => handleSelectChange(value === 'null' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.projects.selectFunder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">{t.common.none}</SelectItem>
                  {emissors?.filter(e => e.type === 'donor').map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsFunderDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.projects.createFunder}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button onClick={handleSave}>{t.projects.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de confirmació per arxivar (sense moviments) */}
    <AlertDialog open={isAlertOpen} onOpenChange={(open) => {
      setIsAlertOpen(open);
      if (!open) {
        setProjectToArchive(null);
        setAffectedTransactionsCount(null);
      }
    }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.projects?.archiveProjectTitle ?? "Arxivar eix"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{t.projects?.archiveProjectDescription ?? "Aquest eix no té moviments actius. Es pot arxivar directament."}</p>
                {projectToArchive && (
                  <p className="text-sm font-medium">{projectToArchive.name}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToArchive(null)} disabled={isArchiving}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={isArchiving || isCountingTransactions}>
              {isArchiving ? 'Arxivant...' : (t.projects?.archiveProjectConfirm ?? 'Arxivar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    {/* Modal de reassignació (amb moviments) */}
    {projectToArchive && (
      <ReassignModal
        open={isReassignOpen}
        onOpenChange={(open) => {
          setIsReassignOpen(open);
          if (!open) {
            setProjectToArchive(null);
            setAffectedTransactionsCount(null);
          }
        }}
        type="project"
        sourceItem={{
          id: projectToArchive.id,
          name: projectToArchive.name,
        }}
        targetItems={activeProjects
          .filter(p => p.id !== projectToArchive.id)
          .map(p => ({
            id: p.id,
            name: p.name,
          }))
        }
        affectedCount={affectedTransactionsCount || 0}
        onConfirm={handleReassignConfirm}
      />
    )}

      <Dialog open={isFunderDialogOpen} onOpenChange={setIsFunderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.projects.createFunderDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.projects.createFunderDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="funder-name">{t.projects.funderNameLabel}</Label>
              <Input
                id="funder-name"
                value={newFunderName}
                onChange={(e) => setNewFunderName(e.target.value)}
                placeholder={t.projects.funderNamePlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateFunder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.common.cancel}</Button>
            </DialogClose>
            <Button onClick={handleCreateFunder}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
