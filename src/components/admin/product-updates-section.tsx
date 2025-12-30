'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Loader2,
  Upload,
  Megaphone,
  EyeOff,
  Check,
  Pencil,
  ExternalLink,
  FileJson,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus
// ─────────────────────────────────────────────────────────────────────────────

type DraftItem = {
  id: string;
  title: string;
  description: string;
  link: string | null;
  evidence?: string[];
  status: 'draft' | 'published' | 'discarded';
  createdAt?: string;
};

type PublishedUpdate = {
  id: string;
  title: string;
  description: string;
  link: string | null;
  publishedAt: Date;
  isActive?: boolean; // soft delete: false = despublicat
};

type DraftsImport = {
  generatedAt: string;
  range: string;
  drafts: Array<{
    id: string;
    title: string;
    description: string;
    link: string | null;
    evidence?: string[];
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProductUpdatesSection() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Estat
  const [isImporting, setIsImporting] = React.useState(false);
  const [editingDraft, setEditingDraft] = React.useState<DraftItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editLink, setEditLink] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState<string | null>(null);
  const [isDiscarding, setIsDiscarding] = React.useState<string | null>(null);

  // Col·leccions
  const draftsQuery = useMemoFirebase(
    () => query(collection(firestore, 'productUpdateDrafts'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  // Només mostrar publicades actives (isActive !== false)
  const publishedQuery = useMemoFirebase(
    () => query(
      collection(firestore, 'productUpdates'),
      where('isActive', '!=', false),
      orderBy('isActive'),
      orderBy('publishedAt', 'desc')
    ),
    [firestore]
  );

  const { data: allDrafts, isLoading: isLoadingDrafts } = useCollection<DraftItem>(draftsQuery);
  const { data: published, isLoading: isLoadingPublished } = useCollection<PublishedUpdate>(publishedQuery);

  // Filtrar esborranys actius (no publicats ni descartats)
  const activeDrafts = React.useMemo(() => {
    if (!allDrafts) return [];
    return allDrafts.filter(d => d.status === 'draft');
  }, [allDrafts]);

  // Handler importar JSON
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as DraftsImport;

      // Validar estructura
      if (!data.drafts || !Array.isArray(data.drafts)) {
        throw new Error('Format JSON invàlid: falta array "drafts"');
      }

      // Obtenir IDs existents per evitar duplicats
      const existingSnap = await getDocs(collection(firestore, 'productUpdateDrafts'));
      const existingIds = new Set(existingSnap.docs.map(d => d.id));

      // Inserir nous drafts
      const batch = writeBatch(firestore);
      let insertedCount = 0;
      let skippedCount = 0;

      for (const draft of data.drafts) {
        // Validar camps requerits
        if (!draft.id || !draft.title || !draft.description) {
          console.warn('Draft invàlid, saltant:', draft);
          skippedCount++;
          continue;
        }

        // Saltar si ja existeix
        if (existingIds.has(draft.id)) {
          skippedCount++;
          continue;
        }

        // Validar longitud
        if (draft.title.length > 60) {
          console.warn(`Títol massa llarg (${draft.title.length} chars), truncant:`, draft.id);
          draft.title = draft.title.slice(0, 60);
        }
        if (draft.description.length > 140) {
          console.warn(`Descripció massa llarga (${draft.description.length} chars), truncant:`, draft.id);
          draft.description = draft.description.slice(0, 140);
        }

        const docRef = doc(firestore, 'productUpdateDrafts', draft.id);
        batch.set(docRef, {
          id: draft.id,
          title: draft.title,
          description: draft.description,
          link: draft.link || null,
          evidence: draft.evidence || [],
          status: 'draft',
          createdAt: new Date().toISOString(),
        });
        insertedCount++;
      }

      if (insertedCount > 0) {
        await batch.commit();
      }

      toast({
        title: 'Importació completada',
        description: `${insertedCount} esborranys importats${skippedCount > 0 ? `, ${skippedCount} saltats (duplicats o invàlids)` : ''}.`,
      });
    } catch (error) {
      console.error('Error importar JSON:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No s\'ha pogut importar el fitxer.',
      });
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Handler obrir editar
  const handleEditDraft = (draft: DraftItem) => {
    setEditingDraft(draft);
    setEditTitle(draft.title);
    setEditDescription(draft.description);
    setEditLink(draft.link || '');
    setIsEditDialogOpen(true);
  };

  // Handler guardar edició
  const handleSaveEdit = async () => {
    if (!editingDraft) return;

    // Validar
    if (!editTitle.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El títol és obligatori.' });
      return;
    }
    if (editTitle.length > 60) {
      toast({ variant: 'destructive', title: 'Error', description: 'El títol ha de tenir màxim 60 caràcters.' });
      return;
    }
    if (!editDescription.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'La descripció és obligatòria.' });
      return;
    }
    if (editDescription.length > 140) {
      toast({ variant: 'destructive', title: 'Error', description: 'La descripció ha de tenir màxim 140 caràcters.' });
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'productUpdateDrafts', editingDraft.id), {
        title: editTitle.trim(),
        description: editDescription.trim(),
        link: editLink.trim() || null,
      });

      toast({ title: 'Esborrany actualitzat' });
      setIsEditDialogOpen(false);
      setEditingDraft(null);
    } catch (error) {
      console.error('Error guardar esborrany:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handler publicar
  const handlePublish = async (draft: DraftItem) => {
    setIsPublishing(draft.id);
    try {
      // Crear a productUpdates amb isActive: true
      const updateId = `update-${Date.now()}`;
      await setDoc(doc(firestore, 'productUpdates', updateId), {
        id: updateId,
        title: draft.title,
        description: draft.description,
        link: draft.link,
        publishedAt: serverTimestamp(),
        isActive: true,
      });

      // Marcar draft com publicat
      await updateDoc(doc(firestore, 'productUpdateDrafts', draft.id), {
        status: 'published',
      });

      toast({
        title: 'Novetat publicada',
        description: 'Els usuaris la veuran a la campaneta de novetats.',
      });
    } catch (error) {
      console.error('Error publicar:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut publicar.' });
    } finally {
      setIsPublishing(null);
    }
  };

  // Handler descartar
  const handleDiscard = async (draft: DraftItem) => {
    setIsDiscarding(draft.id);
    try {
      await updateDoc(doc(firestore, 'productUpdateDrafts', draft.id), {
        status: 'discarded',
      });
      toast({ title: 'Esborrany descartat' });
    } catch (error) {
      console.error('Error descartar:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut descartar.' });
    } finally {
      setIsDiscarding(null);
    }
  };

  // Handler despublicar (soft delete)
  const [isUnpublishing, setIsUnpublishing] = React.useState<string | null>(null);

  const handleUnpublish = async (update: PublishedUpdate) => {
    setIsUnpublishing(update.id);
    try {
      await updateDoc(doc(firestore, 'productUpdates', update.id), {
        isActive: false,
      });
      toast({ title: 'Novetat despublicada', description: 'Els usuaris ja no la veuran.' });
    } catch (error) {
      console.error('Error despublicar:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut despublicar.' });
    } finally {
      setIsUnpublishing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" />
              Novetats del producte
            </CardTitle>
            <CardDescription>
              Gestiona les novetats que veuran els usuaris
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="import-json" className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={isImporting}>
                <span>
                  {isImporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Importar esborranys
                </span>
              </Button>
            </Label>
            <input
              id="import-json"
              type="file"
              accept=".json"
              className="sr-only"
              onChange={handleImportJson}
              disabled={isImporting}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="drafts">
          <TabsList className="mb-4">
            <TabsTrigger value="drafts">
              Esborranys
              {activeDrafts.length > 0 && (
                <Badge variant="secondary" className="ml-2">{activeDrafts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="published">
              Publicades
              {published && published.length > 0 && (
                <Badge variant="outline" className="ml-2">{published.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Esborranys */}
          <TabsContent value="drafts">
            {isLoadingDrafts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregant...
              </div>
            ) : activeDrafts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileJson className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cap esborrany pendent.</p>
                <p className="text-xs mt-1">Executa <code className="bg-muted px-1 rounded">npm run updates:drafts</code> i importa el JSON.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Títol</TableHead>
                    <TableHead>Descripció</TableHead>
                    <TableHead className="w-[180px]">Accions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDrafts.map((draft) => (
                    <TableRow key={draft.id}>
                      <TableCell className="font-medium">{draft.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {draft.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDraft(draft)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePublish(draft)}
                            disabled={isPublishing === draft.id}
                            title="Publicar"
                          >
                            {isPublishing === draft.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDiscard(draft)}
                            disabled={isDiscarding === draft.id}
                            className="text-destructive hover:text-destructive"
                            title="Descartar"
                          >
                            {isDiscarding === draft.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Tab Publicades */}
          <TabsContent value="published">
            {isLoadingPublished ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregant...
              </div>
            ) : !published || published.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cap novetat publicada encara.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Títol</TableHead>
                    <TableHead>Descripció</TableHead>
                    <TableHead>Publicada</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {published.map((update) => (
                    <TableRow key={update.id}>
                      <TableCell className="font-medium">{update.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {update.description}
                        {update.link && (
                          <a
                            href={update.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline ml-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {update.publishedAt instanceof Date
                          ? update.publishedAt.toLocaleDateString('ca-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnpublish(update)}
                          disabled={isUnpublishing === update.id}
                          className="text-muted-foreground hover:text-foreground"
                          title="Despublicar"
                        >
                          {isUnpublishing === update.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog editar esborrany */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar esborrany</DialogTitle>
            <DialogDescription>
              Ajusta el títol i la descripció abans de publicar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Títol <span className="text-xs text-muted-foreground">(màx 60 caràcters)</span>
              </Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={60}
                placeholder="Títol curt i descriptiu"
              />
              <p className="text-xs text-muted-foreground text-right">{editTitle.length}/60</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">
                Descripció <span className="text-xs text-muted-foreground">(màx 140 caràcters)</span>
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={140}
                placeholder="Descripció breu de la novetat"
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{editDescription.length}/140</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-link">
                Enllaç <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="edit-link"
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                placeholder="/dashboard/movimientos o URL completa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel·lar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
