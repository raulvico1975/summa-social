// src/components/project-module/project-form.tsx
// Formulari per crear/editar projectes

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSaveProject } from '@/hooks/use-project-module';
import { useOrgUrl } from '@/hooks/organization-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/i18n';
import type { Project, ProjectFormData } from '@/lib/project-module-types';

interface ProjectFormProps {
  project?: Project | null;
  mode: 'create' | 'edit';
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();
  const { save, isSaving } = useSaveProject();

  const [formData, setFormData] = React.useState<ProjectFormData>({
    name: project?.name ?? '',
    code: project?.code ?? '',
    status: project?.status ?? 'active',
    budgetEUR: project?.budgetEUR?.toString() ?? '',
    startDate: project?.startDate ?? '',
    endDate: project?.endDate ?? '',
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof ProjectFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProjectFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nom és obligatori';
    }

    if (formData.budgetEUR && isNaN(parseFloat(formData.budgetEUR))) {
      newErrors.budgetEUR = 'El pressupost ha de ser un número';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'La data de fi ha de ser posterior a la d\'inici';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await save(formData, project?.id);
      toast({
        title: mode === 'create' ? 'Projecte creat' : 'Projecte actualitzat',
        description: `El projecte "${formData.name}" s'ha desat correctament.`,
      });
      router.push(buildUrl('/dashboard/project-module/projects'));
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desant projecte',
      });
    }
  };

  const handleChange = (field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header amb navegació */}
      <div className="flex items-center gap-4">
        <Link href={buildUrl('/dashboard/project-module/projects')}>
          <Button type="button" variant="ghost" size="icon" title={t.projectModule?.backToProjects ?? 'Tornar a projectes'}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {mode === 'create' ? 'Nou projecte' : 'Editar projecte'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Crea un projecte per assignar-hi despeses'
              : 'Modifica les dades del projecte'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informació del projecte</CardTitle>
          <CardDescription>
            Camps obligatoris marcats amb *
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom del projecte *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nom del projecte"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Codi */}
          <div className="space-y-2">
            <Label htmlFor="code">Codi intern</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="Ex: PROJ-001"
              className="font-mono"
            />
          </div>

          {/* Estat */}
          <div className="space-y-2">
            <Label htmlFor="status">Estat</Label>
            <Select
              value={formData.status}
              onValueChange={(val) => handleChange('status', val as 'active' | 'closed')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actiu</SelectItem>
                <SelectItem value="closed">Tancat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pressupost */}
          <div className="space-y-2">
            <Label htmlFor="budgetEUR">Pressupost (EUR)</Label>
            <Input
              id="budgetEUR"
              type="number"
              step="0.01"
              min="0"
              value={formData.budgetEUR}
              onChange={(e) => handleChange('budgetEUR', e.target.value)}
              placeholder="0.00"
              className={`font-mono ${errors.budgetEUR ? 'border-destructive' : ''}`}
            />
            {errors.budgetEUR && (
              <p className="text-sm text-destructive">{errors.budgetEUR}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data d'inici</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de fi</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className={errors.endDate ? 'border-destructive' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accions */}
      <div className="flex justify-end gap-2">
        <Link href={buildUrl('/dashboard/project-module/projects')}>
          <Button type="button" variant="outline">
            Cancel·lar
          </Button>
        </Link>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Desant...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? 'Crear projecte' : 'Desar canvis'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
