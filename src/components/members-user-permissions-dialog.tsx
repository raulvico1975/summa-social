'use client';

import * as React from 'react';
import type { OrganizationMember } from '@/lib/data';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  applyOverrides,
  getProjectCapability,
  getRoleDefaults,
  sanitizePermissionList,
  sanitizeUserGrants,
  type PermissionKey,
} from '@/lib/permissions';

interface MembersUserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
}

const SECTION_TOGGLES: Array<{ key: PermissionKey; label: string }> = [
  { key: 'sections.moviments', label: 'Moviments' },
  { key: 'sections.projectes', label: 'Projectes' },
  { key: 'sections.informes', label: 'Informes' },
  { key: 'sections.donants', label: 'Donants' },
  { key: 'sections.proveidors', label: 'Proveidors' },
  { key: 'sections.treballadors', label: 'Treballadors' },
  { key: 'sections.configuracio', label: 'Configuracio' },
];

const CRITICAL_ACTION_TOGGLES: Array<{ key: PermissionKey; label: string }> = [
  { key: 'moviments.read', label: 'moviments.read' },
  { key: 'moviments.importarExtractes', label: 'moviments.importarExtractes' },
  { key: 'moviments.editar', label: 'moviments.editar' },
  { key: 'informes.exportar', label: 'informes.exportar' },
  { key: 'fiscal.model182.generar', label: 'fiscal.model182.generar' },
  { key: 'fiscal.model347.generar', label: 'fiscal.model347.generar' },
  { key: 'fiscal.certificats.generar', label: 'fiscal.certificats.generar' },
];

export function MembersUserPermissionsDialog({
  open,
  onOpenChange,
  member,
}: MembersUserPermissionsDialogProps) {
  const { organizationId } = useCurrentOrganization();
  const { user } = useFirebase();
  const { toast } = useToast();

  const [denied, setDenied] = React.useState<Set<PermissionKey>>(new Set());
  const [grants, setGrants] = React.useState<Set<PermissionKey>>(new Set());
  const [isSaving, setIsSaving] = React.useState(false);

  const roleDefaults = React.useMemo(() => getRoleDefaults('user'), []);

  React.useEffect(() => {
    if (!open || !member) return;
    const deniedPermissions = sanitizePermissionList(member.userOverrides?.deny);
    const grantedPermissions = sanitizeUserGrants(member.userGrants);
    setDenied(new Set(deniedPermissions));
    setGrants(new Set(grantedPermissions));
  }, [open, member]);

  const effectivePermissions = React.useMemo(
    () => applyOverrides(roleDefaults, { deny: Array.from(denied) }, Array.from(grants)),
    [roleDefaults, denied, grants]
  );

  const projectCapability = React.useMemo(
    () => getProjectCapability(effectivePermissions),
    [effectivePermissions]
  );

  const togglePermission = React.useCallback((permission: PermissionKey, enabled: boolean) => {
    setDenied((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  }, []);

  const handleProjectCapabilityChange = React.useCallback((value: 'manage' | 'expenseInput') => {
    setDenied((prev) => {
      const next = new Set(prev);
      if (value === 'manage') {
        next.delete('projectes.manage');
        next.add('projectes.expenseInput');
      } else {
        next.add('projectes.manage');
        next.delete('projectes.expenseInput');
      }
      return next;
    });

    setGrants((prev) => {
      const next = new Set(prev);
      if (value === 'manage') {
        next.delete('projectes.expenseInput');
      } else {
        next.add('projectes.expenseInput');
      }
      return next;
    });
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!organizationId || !member || !user) return;

    setIsSaving(true);
    try {
      const deniedList = Array.from(denied).sort();
      const grantsList = Array.from(grants).sort();

      const idToken = await user.getIdToken();
      const response = await fetch('/api/members/user-permissions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId: organizationId,
          userId: member.userId,
          userOverrides: { deny: deniedList },
          userGrants: grantsList,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'No s han pogut desar els permisos.');
      }

      toast({
        title: 'Permisos actualitzats',
        description: `S'han desat els permisos de ${member.displayName || member.email}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error actualitzant permisos d usuari:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s han pogut desar els permisos.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [denied, grants, member, onOpenChange, organizationId, toast, user]);

  if (!member || member.role !== 'user') {
    return null;
  }

  const projectCapabilityValue = projectCapability === 'expenseInput' ? 'expenseInput' : 'manage';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Permisos d usuari</DialogTitle>
          <DialogDescription>
            Configura seccions, accions critiques i capacitat de Projectes per a {member.displayName || member.email}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Seccions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SECTION_TOGGLES.map((section) => (
                <div key={section.key} className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor={`section-${section.key}`} className="cursor-pointer">{section.label}</Label>
                  <Switch
                    id={`section-${section.key}`}
                    checked={effectivePermissions[section.key]}
                    onCheckedChange={(checked) => togglePermission(section.key, checked === true)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Accions critiques</h3>
            <div className="grid gap-3">
              {CRITICAL_ACTION_TOGGLES.map((action) => (
                <div key={action.key} className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor={`action-${action.key}`} className="cursor-pointer font-mono text-xs">{action.label}</Label>
                  <Switch
                    id={`action-${action.key}`}
                    checked={effectivePermissions[action.key]}
                    onCheckedChange={(checked) => togglePermission(action.key, checked === true)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Projectes</h3>
            <RadioGroup
              value={projectCapabilityValue}
              onValueChange={(value) => handleProjectCapabilityChange(value as 'manage' | 'expenseInput')}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="manage" id="projects-manage" />
                <Label htmlFor="projects-manage" className="cursor-pointer">projectes.manage</Label>
              </div>
              <div className="flex items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="expenseInput" id="projects-expense-input" />
                <Label htmlFor="projects-expense-input" className="cursor-pointer">projectes.expenseInput</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel lar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Desant...' : 'Desar permisos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
