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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useFirebase, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CreateSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nom inicial per pre-omplir el camp (ex: text buscat al combobox) */
  initialName?: string;
  /** Callback quan es crea el proveïdor, rep l'ID del contacte creat */
  onCreated: (contactId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function CreateSupplierModal({
  open,
  onOpenChange,
  initialName = '',
  onCreated,
}: CreateSupplierModalProps) {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [name, setName] = React.useState('');
  const [taxId, setTaxId] = React.useState('');
  const [iban, setIban] = React.useState('');

  // Collection ref
  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setName(initialName);
      setTaxId('');
      setIban('');
    }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nom del proveïdor és obligatori.',
      });
      return;
    }

    if (!contactsCollection || !organizationId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut connectar amb la base de dades.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();

      const supplierData = {
        type: 'supplier' as const,
        roles: { supplier: true },
        name: name.trim(),
        taxId: taxId.trim() || '',
        zipCode: '',
        iban: iban.trim() || null,
        createdAt: now,
        updatedAt: now,
      };

      // addDocumentNonBlocking retorna una Promise amb el DocRef
      const docRef = await addDocumentNonBlocking(contactsCollection, supplierData);

      if (!docRef) {
        throw new Error('No s\'ha pogut crear el document');
      }

      toast({
        title: 'Proveïdor creat',
        description: `S'ha creat "${name.trim()}" correctament.`,
      });

      onCreated(docRef.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut crear el proveïdor.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nou proveïdor</DialogTitle>
            <DialogDescription>
              Crea un proveïdor ràpidament. Podràs completar les dades més tard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nom (obligatori) */}
            <div className="space-y-2">
              <Label htmlFor="supplier-name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="supplier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom del proveïdor"
                autoFocus
              />
            </div>

            {/* CIF/NIF (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="supplier-taxid">CIF/NIF</Label>
              <Input
                id="supplier-taxid"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                placeholder="B12345678"
              />
            </div>

            {/* IBAN (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="supplier-iban">IBAN</Label>
              <Input
                id="supplier-iban"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="ES12 3456 7890 1234 5678 9012"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel·lar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear proveïdor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
