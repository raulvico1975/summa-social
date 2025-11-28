
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


const PROJECTS_STORAGE_KEY = 'summa-social-projects';
const EMISORS_STORAGE_KEY = 'summa-social-emissors';
const TRANSACTIONS_STORAGE_KEY = 'summa-social-transactions';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};


export function ProjectManager({ initialProjects, initialEmissors, initialTransactions }: { initialProjects: Project[], initialEmissors: Emisor[], initialTransactions: Transaction[] }) {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects);
  const [emissors, setEmissors] = React.useState<Emisor[]>(initialEmissors);
  const [transactions, setTransactions] = React.useState<Transaction[]>(initialTransactions);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [formData, setFormData] = React.useState<Omit<Project, 'id'>>({ name: '', funderId: null });
  const { toast } = useToast();
  
  React.useEffect(() => {
    try {
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjects) setProjects(JSON.parse(storedProjects));
      
      const storedEmissors = localStorage.getItem(EMISORS_STORAGE_KEY);
      if (storedEmissors) setEmissors(JSON.parse(storedEmissors));

      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (storedTransactions) setTransactions(JSON.parse(storedTransactions));

    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
    }
  }, []);

  const emisorMap = React.useMemo(() => 
    emissors.reduce((acc, emisor) => {
      acc[emisor.id] = emisor.name;
      return acc;
    }, {} as Record<string, string>), 
  [emissors]);

  const projectBalances = React.useMemo(() => {
    const balances: Record<string, { funded: number; sent: number; expenses: number }> = {};
    projects.forEach(p => {
        balances[p.id] = { funded: 0, sent: 0, expenses: 0 };
    });
    transactions.forEach(tx => {
        if (tx.projectId) {
            if (tx.amount > 0) {
                balances[tx.projectId].funded += tx.amount;
            } else {
                 if (tx.category === 'Transferencias a terreno o socias') {
                    balances[tx.projectId].sent += Math.abs(tx.amount);
                } else {
                    balances[tx.projectId].expenses += Math.abs(tx.amount);
                }
            }
        }
    });
    return balances;
  }, [projects, transactions]);

  const updateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(newProjects));
    } catch (error) {
      console.error("Failed to save projects to localStorage", error);
    }
  };

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
    if (projectToDelete) {
      updateProjects(projects.filter((p) => p.id !== projectToDelete.id));
      toast({
        title: 'Projecte Eliminat',
        description: `El projecte "${projectToDelete.name}" ha estat eliminat.`,
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
    if (!formData.name) {
       toast({ variant: 'destructive', title: 'Error', description: 'El nom del projecte no pot estar buit.' });
       return;
    }

    if (editingProject) {
      // Update
      updateProjects(projects.map((p) => p.id === editingProject.id ? { ...p, ...formData } : p));
      toast({ title: 'Projecte Actualitzat', description: `El projecte "${formData.name}" ha estat actualitzat.` });
    } else {
      // Create
      const newProject: Project = {
        id: `proj_${new Date().getTime()}`,
        ...formData
      };
      updateProjects([...projects, newProject]);
      toast({ title: 'Projecte Creat', description: `El projecte "${formData.name}" ha estat creat.` });
    }
    handleOpenChange(false);
  }

  const dialogTitle = editingProject ? 'Editar Projecte' : 'Añadir Nuevo Projecte';
  const dialogDescription = editingProject ? 'Edita los detalles del teu projecte.' : 'Crea un nuevo projecte per fer el seguiment dels fons.';

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <div className='flex justify-end mb-6'>
            <DialogTrigger asChild>
                <Button size="sm" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Projecte
                </Button>
            </DialogTrigger>
        </div>
        
        {projects.length === 0 ? (
            <Card>
                <CardHeader>
                    <CardTitle>No hi ha projectes</CardTitle>
                    <CardDescription>Crea el teu primer projecte per començar a fer el seguiment de fons finalistes.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear el teu Primer Projecte
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
                                            Finançador: {project.funderId && emisorMap[project.funderId] ? emisorMap[project.funderId] : 'No assignat'}
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
                                        title="Total Finançat"
                                        value={formatCurrency(balance.funded)}
                                        icon={TrendingUp}
                                        />
                                    <StatCard 
                                        title="Total Enviat a Terreny"
                                        value={formatCurrency(balance.sent)}
                                        icon={TrendingDown}
                                        />
                                    <StatCard 
                                        title="Despeses de Gestió"
                                        value={formatCurrency(balance.expenses)}
                                        icon={Briefcase}
                                        />
                                    <StatCard 
                                        title="Saldo Pendent"
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
              Nom
            </Label>
            <Input id="name" value={formData.name} onChange={handleFormChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Finançador
            </Label>
            <Select value={formData.funderId || ''} onValueChange={(value) => handleSelectChange(value === 'null' ? null : value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona un finançador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">(Cap)</SelectItem>
                {emissors.filter(e => e.type === 'donor').map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave}>Guardar Projecte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el projecte permanentemente. Los moviments associats no seran eliminats, però perdran l'associació.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
