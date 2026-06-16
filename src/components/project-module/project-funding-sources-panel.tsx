'use client';

import * as React from 'react';
import { Archive, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/i18n';
import type {
  ProjectFundingSource,
  ProjectFundingSourceFormData,
  ProjectFundingSourceType,
} from '@/lib/project-module-types';

const sourceTypes: ProjectFundingSourceType[] = ['public', 'private', 'own_funds', 'local_partner', 'other'];

function formatAmount(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

export function ProjectFundingSourcesPanel({
  fundingSources,
  isSaving,
  canEdit,
  onSave,
  onArchive,
}: {
  fundingSources: ProjectFundingSource[];
  isSaving: boolean;
  canEdit: boolean;
  onSave: (data: ProjectFundingSourceFormData, sourceId?: string) => Promise<void>;
  onArchive: (sourceId: string) => Promise<void>;
}) {
  const { tr } = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProjectFundingSource | null>(null);

  const activeSources = fundingSources.filter((source) => source.archivedAt === null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{tr('projectModule.multiFunding.sourcesTitle')}</CardTitle>
          <CardDescription>{tr('projectModule.multiFunding.sourcesDescription')}</CardDescription>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            {tr('projectModule.multiFunding.addSource')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {activeSources.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr('projectModule.multiFunding.noSources')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr('projectModule.multiFunding.sourceName')}</TableHead>
                <TableHead>{tr('projectModule.multiFunding.sourceType')}</TableHead>
                <TableHead className="text-right">{tr('projectModule.multiFunding.approvedAmount')}</TableHead>
                <TableHead className="text-right">{tr('projectModule.multiFunding.receivedAmount')}</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeSources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>{tr(`projectModule.multiFunding.sourceTypes.${source.type}`)}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(source.approvedAmountEUR)}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(source.receivedAmountEUR)}</TableCell>
                  <TableCell>
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(source); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onArchive(source.id)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <FundingSourceDialog
        open={open}
        onOpenChange={setOpen}
        source={editing}
        isSaving={isSaving}
        onSave={async (data) => {
          await onSave(data, editing?.id);
          setOpen(false);
          setEditing(null);
        }}
      />
    </Card>
  );
}

function FundingSourceDialog({
  open,
  onOpenChange,
  source,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ProjectFundingSource | null;
  isSaving: boolean;
  onSave: (data: ProjectFundingSourceFormData) => Promise<void>;
}) {
  const { tr } = useTranslations();
  const [form, setForm] = React.useState<ProjectFundingSourceFormData>({
    name: '',
    type: 'public',
    approvedAmountEUR: '',
    receivedAmountEUR: '',
    notes: '',
    order: '0',
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      name: source?.name ?? '',
      type: source?.type ?? 'public',
      approvedAmountEUR: source?.approvedAmountEUR?.toString() ?? '',
      receivedAmountEUR: source?.receivedAmountEUR?.toString() ?? '',
      notes: source?.notes ?? '',
      order: source?.order?.toString() ?? '0',
    });
  }, [open, source]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{source ? tr('projectModule.multiFunding.editSource') : tr('projectModule.multiFunding.addSource')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tr('projectModule.multiFunding.sourceName')}</Label>
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{tr('projectModule.multiFunding.sourceType')}</Label>
            <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as ProjectFundingSourceType }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>{tr(`projectModule.multiFunding.sourceTypes.${type}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{tr('projectModule.multiFunding.approvedAmount')}</Label>
              <Input inputMode="decimal" value={form.approvedAmountEUR} onChange={(event) => setForm((prev) => ({ ...prev, approvedAmountEUR: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{tr('projectModule.multiFunding.receivedAmount')}</Label>
              <Input inputMode="decimal" value={form.receivedAmountEUR} onChange={(event) => setForm((prev) => ({ ...prev, receivedAmountEUR: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tr('projectModule.multiFunding.order')}</Label>
            <Input type="number" min="0" value={form.order} onChange={(event) => setForm((prev) => ({ ...prev, order: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{tr('projectModule.multiFunding.notes')}</Label>
            <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>{tr('common.cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={isSaving || !form.name.trim()}>{tr('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
