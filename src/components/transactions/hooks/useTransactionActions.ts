'use client';

import * as React from 'react';
import { doc, CollectionReference, type Firestore, writeBatch, deleteField, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import { pendingDocumentsCollection } from '@/lib/pending-documents/refs';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { useAppLog } from '@/hooks/use-app-log';
import type { Transaction, AnyContact, ContactType } from '@/lib/data';
import { buildDocumentFilename } from '@/lib/build-document-filename';
import { handleTransactionDelete, isFiscallyRelevantTransaction } from '@/lib/fiscal/softDeleteTransaction';

// =============================================================================
// TYPES
// =============================================================================

interface EditFormData {
  description: string;
  amount: string;
  note: string;
  contactId: string | null;
  projectId: string | null;
}

interface NewContactFormData {
  name: string;
  taxId: string;
  zipCode: string;
  city: string;
  province: string;
}

interface UseTransactionActionsParams {
  transactionsCollection: CollectionReference | null;
  contactsCollection: CollectionReference | null;
  organizationId: string | null;
  storage: FirebaseStorage;
  transactions: Transaction[] | null;
  availableContacts: AnyContact[] | null;
  firestore?: Firestore | null;
  userId?: string | null;
}

interface UseTransactionActionsReturn {
  // ─────────────────────────────────────────────────────────────────────────
  // NOTE SETTER (for InlineNoteEditor component)
  // ─────────────────────────────────────────────────────────────────────────
  handleSetNote: (txId: string, note: string) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTY SETTERS
  // ─────────────────────────────────────────────────────────────────────────
  handleSetCategory: (txId: string, newCategory: string) => void;
  handleSetContact: (txId: string, newContactId: string | null, contactType?: ContactType) => void;
  handleSetProject: (txId: string, newProjectId: string | null) => void;

  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENT UPLOAD / DELETE
  // ─────────────────────────────────────────────────────────────────────────
  docLoadingStates: Record<string, boolean>;
  handleAttachDocument: (transactionId: string) => void;
  handleDeleteDocument: (transactionId: string) => void;
  isDeleteDocDialogOpen: boolean;
  transactionToDeleteDoc: Transaction | null;
  handleDeleteDocClick: (transaction: Transaction) => void;
  handleDeleteDocConfirm: () => void;
  handleCloseDeleteDocDialog: () => void;

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT DIALOG (state managed by EditTransactionDialog component)
  // ─────────────────────────────────────────────────────────────────────────
  isEditDialogOpen: boolean;
  editingTransaction: Transaction | null;
  handleEditClick: (transaction: Transaction) => void;
  handleSaveEdit: (formData: EditFormData) => void;
  handleCloseEditDialog: () => void;

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE DIALOG
  // ─────────────────────────────────────────────────────────────────────────
  isDeleteDialogOpen: boolean;
  transactionToDelete: Transaction | null;
  handleDeleteClick: (transaction: Transaction) => void;
  handleDeleteConfirm: () => void;
  handleCloseDeleteDialog: () => void;

  // ─────────────────────────────────────────────────────────────────────────
  // NEW CONTACT DIALOG (state managed by NewContactDialog component)
  // ─────────────────────────────────────────────────────────────────────────
  isNewContactDialogOpen: boolean;
  newContactType: 'donor' | 'supplier';
  handleOpenNewContactDialog: (txId: string, type: 'donor' | 'supplier') => void;
  handleSaveNewContact: (formData: NewContactFormData) => void;
  handleCloseNewContactDialog: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Reverteix tots els PendingDocuments conciliats amb una transacció a 'confirmed'.
 * Retorna el nombre de documents revertits (0 si no n'hi ha cap).
 */
async function unmatchPendingDocuments(
  firestore: Firestore,
  orgId: string,
  txId: string
): Promise<number> {
  const q = query(
    pendingDocumentsCollection(firestore, orgId),
    where('matchedTransactionId', '==', txId),
    where('status', '==', 'matched')
  );

  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const batch = writeBatch(firestore);
  for (const docSnap of snap.docs) {
    batch.update(docSnap.ref, {
      status: 'confirmed',
      matchedTransactionId: deleteField(),
    });
  }

  await batch.commit();
  return snap.size;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTransactionActions({
  transactionsCollection,
  contactsCollection,
  organizationId,
  storage,
  transactions,
  availableContacts,
  firestore,
  userId,
}: UseTransactionActionsParams): UseTransactionActionsReturn {
  const { toast } = useToast();
  const { t } = useTranslations();
  const { log } = useAppLog();

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Document Upload / Delete
  // ─────────────────────────────────────────────────────────────────────────
  const [docLoadingStates, setDocLoadingStates] = React.useState<Record<string, boolean>>({});
  const [isDeleteDocDialogOpen, setIsDeleteDocDialogOpen] = React.useState(false);
  const [transactionToDeleteDoc, setTransactionToDeleteDoc] = React.useState<Transaction | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Edit Dialog
  // ─────────────────────────────────────────────────────────────────────────
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: Delete Dialog
  // ─────────────────────────────────────────────────────────────────────────
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STATE: New Contact Dialog
  // ─────────────────────────────────────────────────────────────────────────
  const [isNewContactDialogOpen, setIsNewContactDialogOpen] = React.useState(false);
  const [newContactType, setNewContactType] = React.useState<'donor' | 'supplier'>('donor');
  const [newContactTransactionId, setNewContactTransactionId] = React.useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE SETTER (for InlineNoteEditor component)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSetNote = React.useCallback((txId: string, note: string) => {
    if (!transactionsCollection) return;
    updateDocumentNonBlocking(doc(transactionsCollection, txId), { note: note || null });
  }, [transactionsCollection]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY SETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSetCategory = React.useCallback((txId: string, newCategory: string) => {
    if (!transactionsCollection) return;
    updateDocumentNonBlocking(doc(transactionsCollection, txId), { category: newCategory });
  }, [transactionsCollection]);

  const handleSetContact = React.useCallback((txId: string, newContactId: string | null, contactType?: ContactType) => {
    if (!transactionsCollection) return;

    const updates: Record<string, unknown> = {
      contactId: newContactId,
      contactType: newContactId ? contactType : null,
    };

    // Auto-assign default category if contact has one and transaction doesn't
    if (newContactId) {
      const contact = availableContacts?.find(c => c.id === newContactId);
      const tx = transactions?.find(t => t.id === txId);
      if (contact?.defaultCategoryId && !tx?.category) {
        updates.category = contact.defaultCategoryId;
      }
    }

    updateDocumentNonBlocking(doc(transactionsCollection, txId), updates);
  }, [transactionsCollection, availableContacts, transactions]);

  const handleSetProject = React.useCallback((txId: string, newProjectId: string | null) => {
    if (!transactionsCollection) return;
    updateDocumentNonBlocking(doc(transactionsCollection, txId), { projectId: newProjectId });
  }, [transactionsCollection]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAttachDocument = React.useCallback((transactionId: string) => {
    log(`[${transactionId}] Iniciando la subida de documento.`);
    if (!organizationId || !transactionsCollection) {
      const errorMsg = t.movements.table.organizationNotIdentified;
      log(errorMsg);
      toast({ variant: 'destructive', title: t.common.error, description: errorMsg });
      return;
    }
    log(`Organització identificada: ${organizationId}`);

    // Delay per permetre que el dropdown menu es tanqui correctament abans d'obrir el file picker.
    // Sense aquest delay, el DropdownMenu de Radix UI pot quedar en un estat inconsistent
    // que bloqueja tota la interfície.
    setTimeout(() => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'application/pdf,image/*,.doc,.docx,.xls,.xlsx';
      fileInput.style.display = 'none';

      fileInput.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
          log(`[${transactionId}] Selección de archivo cancelada.`);
          if (fileInput.parentElement) {
            document.body.removeChild(fileInput);
          }
          return;
        }
        log(`[${transactionId}] Archivo seleccionado: ${file.name} (Tamaño: ${file.size} bytes)`);

        setDocLoadingStates(prev => ({ ...prev, [transactionId]: true }));

        // Construir nom de fitxer estandarditzat
        const tx = transactions?.find(t => t.id === transactionId) ?? null;
        const dateISO = tx?.date ?? new Date().toISOString().split('T')[0];
        const concept = (tx?.note?.trim() || tx?.description?.trim() || 'moviment');
        const finalName = buildDocumentFilename({ dateISO, concept, originalName: file.name });

        toast({ title: t.movements.table.uploadingDocument, description: `Adjuntant "${finalName}"...` });

        const storagePath = `organizations/${organizationId}/documents/${transactionId}/${finalName}`;
        log(`[${transactionId}] Ruta de subida en Storage: ${storagePath}`);
        const storageRef = ref(storage, storagePath);

        try {
          log(`[${transactionId}] Iniciando 'uploadBytes'...`);
          const uploadResult = await uploadBytes(storageRef, file);

          log(`[${transactionId}] 'uploadBytes' completado con éxito.`);
          const downloadURL = await getDownloadURL(uploadResult.ref);
          log(`[${transactionId}] URL de descarga obtenida: ${downloadURL}`);

          updateDocumentNonBlocking(doc(transactionsCollection, transactionId), { document: downloadURL });

          toast({ title: t.movements.table.uploadSuccess, description: t.movements.table.documentUploadedSuccessfully });
          log(`[${transactionId}] ¡Éxito! Subida completada.`);
        } catch (error: unknown) {
          console.error('FIREBASE_UPLOAD_ERROR_DIAGNOSTIC', error);
          const firebaseError = error as { code?: string; message?: string };
          const errorCode = firebaseError.code || 'UNKNOWN_CODE';
          const errorMessage = firebaseError.message || 'Error desconocido.';
          log(`[${transactionId}] ERROR en la subida: ${errorCode} - ${errorMessage}`);

          let description = t.movements.table.unexpectedError(errorCode);
          if (errorCode === 'storage/unauthorized' || errorCode === 'storage/object-not-found') {
            description = t.movements.table.firebasePermissionDenied;
          } else if (errorCode === 'storage/canceled') {
            description = t.movements.table.uploadCancelled;
          }
          toast({ variant: 'destructive', title: t.movements.table.uploadError, description, duration: 9000 });
        } finally {
          log(`[${transactionId}] Finalizando proceso de subida.`);
          setDocLoadingStates(prev => ({ ...prev, [transactionId]: false }));
          if (fileInput.parentElement) {
            document.body.removeChild(fileInput);
          }
        }
      };

      document.body.appendChild(fileInput);
      fileInput.click();
    }, 100);
  }, [organizationId, transactionsCollection, storage, toast, t, log]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleDeleteDocClick = React.useCallback((transaction: Transaction) => {
    setTransactionToDeleteDoc(transaction);
    setIsDeleteDocDialogOpen(true);
  }, []);

  const handleDeleteDocConfirm = React.useCallback(async () => {
    if (!transactionToDeleteDoc || !transactionsCollection || !organizationId) {
      setIsDeleteDocDialogOpen(false);
      setTransactionToDeleteDoc(null);
      return;
    }

    const transactionId = transactionToDeleteDoc.id;
    const documentUrl = transactionToDeleteDoc.document;

    setDocLoadingStates(prev => ({ ...prev, [transactionId]: true }));
    log(`[${transactionId}] Iniciant eliminació de document...`);

    // ── GUARDRAIL: bloquejar si el document prové d'un pendent conciliat ──
    if (firestore && organizationId && transactionId) {
      const pdQuery = query(
        pendingDocumentsCollection(firestore, organizationId),
        where('matchedTransactionId', '==', transactionId),
        where('status', '==', 'matched'),
        limit(1)
      );

      const pdSnap = await getDocs(pdQuery);
      if (!pdSnap.empty) {
        toast({
          variant: 'destructive',
          title: t.pendingDocs.toasts.deleteDocBlockedTitle,
          description: t.pendingDocs.toasts.deleteDocBlockedDesc,
        });
        setDocLoadingStates(prev => ({ ...prev, [transactionId]: false }));
        setIsDeleteDocDialogOpen(false);
        setTransactionToDeleteDoc(null);
        return;
      }
    }

    try {
      // Intentar eliminar el fitxer de Storage si tenim la URL
      if (documentUrl) {
        try {
          // Extreure el path del Storage des de la URL de download
          const storageRef = ref(storage, documentUrl);
          await deleteObject(storageRef);
          log(`[${transactionId}] Fitxer eliminat de Storage.`);
        } catch (storageError: unknown) {
          // Si el fitxer no existeix o hi ha error, continuem igualment
          const firebaseError = storageError as { code?: string };
          if (firebaseError.code !== 'storage/object-not-found') {
            console.warn('Error eliminant fitxer de Storage:', storageError);
            log(`[${transactionId}] Avís: No s'ha pogut eliminar el fitxer de Storage.`);
          }
        }
      }

      // Actualitzar Firestore per treure la referència al document
      updateDocumentNonBlocking(doc(transactionsCollection, transactionId), { document: null });

      toast({ title: t.movements.table.documentDeleted });
      log(`[${transactionId}] Document eliminat correctament.`);
    } catch (error: unknown) {
      console.error('Error eliminant document:', error);
      const firebaseError = error as { message?: string };
      toast({
        variant: 'destructive',
        title: t.movements.table.uploadError,
        description: firebaseError.message || t.common.error,
      });
      log(`[${transactionId}] ERROR eliminant document.`);
    } finally {
      setDocLoadingStates(prev => ({ ...prev, [transactionId]: false }));
      setIsDeleteDocDialogOpen(false);
      setTransactionToDeleteDoc(null);
    }
  }, [transactionToDeleteDoc, transactionsCollection, organizationId, storage, toast, t, log]);

  const handleCloseDeleteDocDialog = React.useCallback(() => {
    setIsDeleteDocDialogOpen(false);
    setTransactionToDeleteDoc(null);
  }, []);

  const handleDeleteDocument = React.useCallback((transactionId: string) => {
    const transaction = transactions?.find(tx => tx.id === transactionId);
    if (transaction) {
      handleDeleteDocClick(transaction);
    }
  }, [transactions, handleDeleteDocClick]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT DIALOG
  // ═══════════════════════════════════════════════════════════════════════════

  const handleEditClick = React.useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveEdit = React.useCallback((formData: EditFormData) => {
    if (!editingTransaction || !transactionsCollection) return;

    const selectedContact = formData.contactId
      ? availableContacts?.find(c => c.id === formData.contactId)
      : null;

    updateDocumentNonBlocking(doc(transactionsCollection, editingTransaction.id), {
      description: formData.description,
      amount: parseFloat(formData.amount),
      note: formData.note || null,
      contactId: formData.contactId,
      contactType: selectedContact?.type || null,
      projectId: formData.projectId,
    });

    toast({ title: t.movements.table.transactionUpdated });
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  }, [editingTransaction, transactionsCollection, availableContacts, toast, t]);

  const handleCloseEditDialog = React.useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingTransaction(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE DIALOG
  // ═══════════════════════════════════════════════════════════════════════════

  const handleDeleteClick = React.useCallback((transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!transactionToDelete || !transactionsCollection) {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
      return;
    }

    // ── AUTO-UNMATCH: revertir pending documents conciliats ──
    let unmatchedCount = 0;
    if (firestore && organizationId) {
      try {
        unmatchedCount = await unmatchPendingDocuments(
          firestore,
          organizationId,
          transactionToDelete.id
        );
      } catch (error) {
        console.error('[handleDeleteConfirm] Error unmatching pending documents:', error);
        toast({
          variant: 'destructive',
          title: t.pendingDocs.toasts.autoUnmatchErrorTitle,
          description: t.pendingDocs.toasts.autoUnmatchErrorDesc,
        });
        setIsDeleteDialogOpen(false);
        setTransactionToDelete(null);
        return; // NO eliminar la transacció si falla l'unmatch
      }
    }

    // Soft-delete per transaccions fiscals (returns, remittance IN, stripe donations amb contactId)
    if (firestore && organizationId && userId && isFiscallyRelevantTransaction(transactionToDelete)) {
      try {
        await handleTransactionDelete(transactionToDelete, {
          firestore,
          orgId: organizationId,
          userId,
          reason: 'user_delete',
        });
        // Missatge específic per soft-delete
        toast({
          title: 'Transacció arxivada',
          description: 'La transacció fiscal ha estat arxivada (no eliminada).',
        });
      } catch (error) {
        console.error('[handleDeleteConfirm] Error archiving transaction:', error);
        toast({
          variant: 'destructive',
          title: t.common.error,
          description: (error as Error).message || 'Error arxivant la transacció',
        });
      }
    } else {
      // Delete normal per transaccions no fiscals
      deleteDocumentNonBlocking(doc(transactionsCollection, transactionToDelete.id));
      toast({ title: t.movements.table.transactionDeleted });
    }

    // Toast informatiu si s'ha desfet alguna conciliació
    if (unmatchedCount > 0) {
      toast({
        title: t.pendingDocs.toasts.autoUnmatchTitle,
        description: t.pendingDocs.toasts.autoUnmatchDesc,
      });
    }

    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }, [transactionToDelete, transactionsCollection, firestore, organizationId, userId, toast, t]);

  const handleCloseDeleteDialog = React.useCallback(() => {
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW CONTACT DIALOG
  // ═══════════════════════════════════════════════════════════════════════════

  const handleOpenNewContactDialog = React.useCallback((txId: string, type: 'donor' | 'supplier') => {
    setNewContactTransactionId(txId);
    setNewContactType(type);
    setIsNewContactDialogOpen(true);
  }, []);

  const handleSaveNewContact = React.useCallback((formData: NewContactFormData) => {
    // Only name is required
    if (!formData.name) {
      toast({ variant: 'destructive', title: t.common.error, description: t.donors.errorNameRequired });
      return;
    }

    if (!contactsCollection || !transactionsCollection) return;

    // Warning if taxId or zipCode is missing for donors
    const hasIncompleteData = newContactType === 'donor' && (!formData.taxId || !formData.zipCode);

    const now = new Date().toISOString();
    const newContactData = {
      type: newContactType,
      name: formData.name,
      taxId: formData.taxId || null,
      zipCode: formData.zipCode || null,
      city: formData.city || null,
      province: formData.province || null,
      createdAt: now,
      ...(newContactType === 'donor' && {
        donorType: 'individual',
        membershipType: 'one-time',
      }),
    };

    addDocumentNonBlocking(contactsCollection, newContactData)
      .then(docRef => {
        if (docRef && newContactTransactionId) {
          handleSetContact(newContactTransactionId, docRef.id, newContactType);
        }
      });

    const typeLabel = newContactType === 'donor' ? t.donors.title.slice(0, -1) : t.suppliers.title.slice(0, -1);

    // Show creation toast
    toast({ title: t.movements.table.contactCreatedSuccess(typeLabel, formData.name).split('.')[0] });

    // Show warning if taxId or zipCode is missing
    if (hasIncompleteData) {
      setTimeout(() => {
        toast({
          title: t.donors.incompleteDataWarning,
          description: t.donors.incompleteDataWarningDescription,
        });
      }, 500);
    }

    setIsNewContactDialogOpen(false);
    setNewContactTransactionId(null);
  }, [
    newContactType,
    newContactTransactionId,
    contactsCollection,
    transactionsCollection,
    handleSetContact,
    toast,
    t,
  ]);

  const handleCloseNewContactDialog = React.useCallback(() => {
    setIsNewContactDialogOpen(false);
    setNewContactTransactionId(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Note Setter
    handleSetNote,

    // Property Setters
    handleSetCategory,
    handleSetContact,
    handleSetProject,

    // Document Upload / Delete
    docLoadingStates,
    handleAttachDocument,
    handleDeleteDocument,
    isDeleteDocDialogOpen,
    transactionToDeleteDoc,
    handleDeleteDocClick,
    handleDeleteDocConfirm,
    handleCloseDeleteDocDialog,

    // Edit Dialog
    isEditDialogOpen,
    editingTransaction,
    handleEditClick,
    handleSaveEdit,
    handleCloseEditDialog,

    // Delete Dialog
    isDeleteDialogOpen,
    transactionToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    handleCloseDeleteDialog,

    // New Contact Dialog
    isNewContactDialogOpen,
    newContactType,
    handleOpenNewContactDialog,
    handleSaveNewContact,
    handleCloseNewContactDialog,
  };
}
