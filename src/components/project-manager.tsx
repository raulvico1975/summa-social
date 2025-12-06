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
import { PlusCircle, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Briefcase } from 'lucide-react';
import type { Project, Emisor, Transaction } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { StatCard } from './stat-card';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { normalizeProject } from '@/lib/normalize';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};


export function ProjectManager() {
  const { firestore } = useFirebase();
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
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [formData, setFormData] = React.useState<Omit<Project, 'id'>>({ name: '', funderId: null });
  const { toast } = useToast();
  
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
  
  const handleDeleteRequest = (project: Project) => {
    setProjectToDelete(project);
    setIsAlertOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (projectToDelete && projectsCollection) {
      deleteDocumentNonBlocking(doc(projectsCollection, projectToDelete.id));
      toast({
        title: t.projects.projectDeleted,
        description: t.projects.projectDeletedDescription(projectToDelete.name),
      });
    }
    setIsAlertOpen(false);
    setProjectToDelete(null);
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
        
        {(!projects || projects.length === 0) ? (
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
                {projects.map(project => {
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
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDeleteRequest(project)}
                                            >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <StatCard 
                                        title={t.projects.totalFunded}
                                        value={formatCurrency(balance.funded)}
                                        icon={TrendingUp}
                                        />
                                    <StatCard 
                                        title={t.projects.totalSent}
                                        value={formatCurrency(balance.sent)}
                                        icon={TrendingDown}
                                        />
                                    <StatCard 
                                        title={t.projects.expensesInSpain}
                                        value={formatCurrency(balance.expenses)}
                                        icon={Briefcase}
                                        />
                                    <StatCard 
                                        title={t.projects.pendingBalance}
                                        value={formatCurrency(remaining)}
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
            <Select value={formData.funderId || ''} onValueChange={(value) => handleSelectChange(value === 'null' ? null : value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t.projects.selectFunder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">{t.common.none}</SelectItem>
                {emissors?.filter(e => e.type === 'donor').map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.projects.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.projects.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
