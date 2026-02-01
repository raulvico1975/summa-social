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
// AlertDialog ja no s'utilitza - l'API arxiva directe si count==0

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
import { collection, doc } from 'firebase/firestore';
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
  const [isReassignOpen, setIsReassignOpen] = React.useState(false);
  const [isFunderDialogOpen, setIsFunderDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [projectToArchive, setProjectToArchive] = React.useState<Project | null>(null);
  const [affectedTransactionsCount, setAffectedTransactionsCount] = React.useState<number | null>(null);
  const [isCountingTransactions, setIsCountingTransactions] = React.useState(false);
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
  // API-FIRST: La UI crida sempre l'API per arxivar.
  // L'API decideix si té moviments (i retorna activeCount) o arxiva directe.
  // Això evita problemes de permisos amb queries Firestore client.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reset complet de l'estat d'arxivat quan es cancel·la o tanca el modal.
   * Evita dead-lock d'estat UI.
   */
  const resetArchiveFlow = React.useCallback(() => {
    setIsReassignOpen(false);
    setProjectToArchive(null);
    setAffectedTransactionsCount(null);
    setIsCountingTransactions(false);
  }, []);

  const handleArchiveRequest = async (project: Project) => {
    if (!organizationId || !user) return;
    setProjectToArchive(project);
    setAffectedTransactionsCount(null);
    setIsCountingTransactions(true);

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
          fromProjectId: project.id,
          // NO enviem toProjectId → l'API decidirà si cal reassignar
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Arxivat directe (no tenia moviments actius)
        toast({
          title: t.projects?.projectArchivedToast ?? 'Eix arxivat',
          description: t.projects?.projectArchivedToastDescription?.(project.name) ?? `L'eix "${project.name}" ha estat arxivat.`,
        });
        setProjectToArchive(null);
      } else if (result.code === 'HAS_ACTIVE_TRANSACTIONS') {
        // Té moviments actius → obrir modal de reassignació
        setAffectedTransactionsCount(result.activeCount || 0);
        setIsReassignOpen(true);
      } else {
        // Error genèric
        toast({
          variant: 'destructive',
          title: t.projects?.archiveError ?? 'Error en arxivar',
          description: result.error || 'Error desconegut',
        });
        setProjectToArchive(null);
      }
    } catch (error) {
      console.error('Error arxivant eix:', error);
      toast({
        variant: 'destructive',
        title: t.projects?.archiveError ?? 'Error en arxivar',
        description: error instanceof Error ? error.message : 'Error desconegut',
      });
      setProjectToArchive(null);
    } finally {
      setIsCountingTransactions(false);
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

    {/* Modal de reassignació (amb moviments) */}
    {/* NOTA: Ja no hi ha AlertDialog de confirmació simple.
        L'API arxiva directe si count==0, o retorna HAS_ACTIVE_TRANSACTIONS si count>0. */}
    {/* IMPORTANT: NO condicionar a projectToArchive per evitar desmuntatge prematur
        que causa dead-lock d'estat. El modal sempre existeix però amb open={false}. */}
    <ReassignModal
      open={isReassignOpen && projectToArchive !== null}
      onOpenChange={(open) => {
        if (!open) {
          resetArchiveFlow();
        } else {
          setIsReassignOpen(true);
        }
      }}
      type="project"
      sourceItem={projectToArchive ? {
        id: projectToArchive.id,
        name: projectToArchive.name,
      } : { id: '', name: '' }}
      targetItems={projectToArchive ? activeProjects
        .filter(p => p.id !== projectToArchive.id)
        .map(p => ({
          id: p.id,
          name: p.name,
        })) : []
      }
      affectedCount={affectedTransactionsCount || 0}
      onConfirm={handleReassignConfirm}
    />

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
