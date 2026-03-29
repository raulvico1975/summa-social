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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Send, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import {
  type HelpFormState,
  EMPTY_HELP_FORM,
  extractHelpFormFromBundle,
  buildHelpPatch,
  applyHelpPatchToBundle,
  validateHelpForm,
} from '@/lib/help/help-editor';
import { REQUIRED_HELP_LOCALES, type HelpLocale } from '@/lib/help/help-audit';

type JsonMessages = Record<string, string>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeKey: string;
  onPublished?: () => void;
};

/**
 * Dialog per editar les ajudes contextuals d'un routeKey
 * Permet editar per idioma i publicar via Storage + versió
 */
export function HelpEditorDialog({ open, onOpenChange, routeKey, onPublished }: Props) {
  const { toast } = useToast();
  const { tr } = useTranslations();
  const [activeLocale, setActiveLocale] = React.useState<HelpLocale>('ca');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);

  // Bundles carregats des de Storage (un per idioma)
  const [bundles, setBundles] = React.useState<Record<HelpLocale, JsonMessages | null>>({
    ca: null,
    es: null,
    fr: null,
    pt: null,
  });

  // Formulari per cada idioma (estat local, no persistit fins a Guardar)
  const [forms, setForms] = React.useState<Record<HelpLocale, HelpFormState>>({
    ca: { ...EMPTY_HELP_FORM },
    es: { ...EMPTY_HELP_FORM },
    fr: { ...EMPTY_HELP_FORM },
    pt: { ...EMPTY_HELP_FORM },
  });

  // Errors de validació per cada idioma
  const [errors, setErrors] = React.useState<Record<HelpLocale, Partial<Record<keyof HelpFormState, string>>>>({
    ca: {},
    es: {},
    fr: {},
    pt: {},
  });

  // Carregar bundles des de Storage quan s'obre el dialog
  React.useEffect(() => {
    if (!open) return;

    const loadBundles = async () => {
      setIsLoading(true);
      const storage = getStorage();
      const newBundles: Record<HelpLocale, JsonMessages | null> = {
        ca: null,
        es: null,
        fr: null,
        pt: null,
      };
      const newForms: Record<HelpLocale, HelpFormState> = {
        ca: { ...EMPTY_HELP_FORM },
        es: { ...EMPTY_HELP_FORM },
        fr: { ...EMPTY_HELP_FORM },
        pt: { ...EMPTY_HELP_FORM },
      };

      for (const locale of REQUIRED_HELP_LOCALES) {
        try {
          const fileRef = ref(storage, `i18n/${locale}.json`);
          const url = await getDownloadURL(fileRef);
          const response = await fetch(url);
          if (!response.ok) throw new Error('Fetch failed');
          const data: JsonMessages = await response.json();
          newBundles[locale] = data;
          newForms[locale] = extractHelpFormFromBundle(data, routeKey);
        } catch (error) {
          console.error(`[HelpEditor] Error loading ${locale}:`, error);
          newBundles[locale] = {};
          newForms[locale] = { ...EMPTY_HELP_FORM };
        }
      }

      setBundles(newBundles);
      setForms(newForms);
      setErrors({ ca: {}, es: {}, fr: {}, pt: {} });
      setIsLoading(false);
    };

    loadBundles();
  }, [open, routeKey]);

  // Reset quan es tanca
  React.useEffect(() => {
    if (!open) {
      setActiveLocale('ca');
    }
  }, [open]);

  // Handler per canviar un camp del formulari
  const handleFieldChange = (field: keyof HelpFormState, value: string) => {
    setForms((prev) => ({
      ...prev,
      [activeLocale]: {
        ...prev[activeLocale],
        [field]: value,
      },
    }));
    // Netejar error del camp si existeix
    if (errors[activeLocale][field]) {
      setErrors((prev) => ({
        ...prev,
        [activeLocale]: {
          ...prev[activeLocale],
          [field]: undefined,
        },
      }));
    }
  };

  // Guardar: pujar només l'idioma actiu a Storage (sense publicar)
  const handleSave = async () => {
    const form = forms[activeLocale];
    const validation = validateHelpForm(form);

    if (!validation.isValid) {
      setErrors((prev) => ({
        ...prev,
        [activeLocale]: validation.errors,
      }));
      toast({
        variant: 'destructive',
        title: tr('admin.helpEditor.toast.invalidTitle', 'Formulari incomplet'),
        description: tr('admin.helpEditor.toast.invalidDescription', 'Omple els camps obligatoris (títol i introducció).'),
      });
      return;
    }

    setIsSaving(true);
    try {
      const bundle = bundles[activeLocale] ?? {};
      const patch = buildHelpPatch(routeKey, form);
      const updatedBundle = applyHelpPatchToBundle(bundle, routeKey, patch);

      const storage = getStorage();
      const fileRef = ref(storage, `i18n/${activeLocale}.json`);
      const jsonString = JSON.stringify(updatedBundle, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      await uploadBytes(fileRef, blob);

      // Actualitzar bundle local
      setBundles((prev) => ({
        ...prev,
        [activeLocale]: updatedBundle,
      }));

      toast({
        title: tr('admin.helpEditor.toast.savedTitle', 'Guardat a Storage'),
        description: tr('admin.helpEditor.toast.savedDescription', '{language} guardat. Recorda publicar per activar els canvis.').replace('{language}', languageLabels[activeLocale]),
      });
    } catch (error) {
      console.error('[HelpEditor] Save error:', error);
      toast({
        variant: 'destructive',
        title: tr('admin.helpEditor.toast.saveErrorTitle', 'Error guardant'),
        description: tr('admin.helpEditor.toast.saveErrorDescription', 'No s’ha pogut guardar. Verifica els permisos.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Publicar: guardar l'idioma actiu + incrementar versió
  const handlePublish = async () => {
    const form = forms[activeLocale];
    const validation = validateHelpForm(form);

    if (!validation.isValid) {
      setErrors((prev) => ({
        ...prev,
        [activeLocale]: validation.errors,
      }));
      toast({
        variant: 'destructive',
        title: tr('admin.helpEditor.toast.invalidTitle', 'Formulari incomplet'),
        description: tr('admin.helpEditor.toast.invalidDescription', 'Omple els camps obligatoris (títol i introducció).'),
      });
      return;
    }

    setIsPublishing(true);
    try {
      // 1. Guardar a Storage
      const bundle = bundles[activeLocale] ?? {};
      const patch = buildHelpPatch(routeKey, form);
      const updatedBundle = applyHelpPatchToBundle(bundle, routeKey, patch);

      const storage = getStorage();
      const fileRef = ref(storage, `i18n/${activeLocale}.json`);
      const jsonString = JSON.stringify(updatedBundle, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      await uploadBytes(fileRef, blob);

      // 2. Incrementar versió per invalidar cache
      const firestore = getFirestore();
      const i18nDocRef = doc(firestore, 'system', 'i18n');
      const currentDoc = await getDoc(i18nDocRef);
      const currentVer = currentDoc.exists() ? (currentDoc.data()?.version ?? 0) : 0;
      const newVersion = currentVer + 1;

      await setDoc(i18nDocRef, {
        version: newVersion,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Actualitzar bundle local
      setBundles((prev) => ({
        ...prev,
        [activeLocale]: updatedBundle,
      }));

      toast({
        title: tr('admin.helpEditor.toast.publishedTitle', 'Publicat'),
        description: tr('admin.helpEditor.toast.publishedDescription', '{language} publicat (v{version}). Els usuaris veuran els canvis.')
          .replace('{language}', languageLabels[activeLocale])
          .replace('{version}', String(newVersion)),
      });

      onPublished?.();
    } catch (error) {
      console.error('[HelpEditor] Publish error:', error);
      toast({
        variant: 'destructive',
        title: tr('admin.helpEditor.toast.publishErrorTitle', 'Error publicant'),
        description: tr('admin.helpEditor.toast.publishErrorDescription', 'No s’ha pogut publicar. Verifica els permisos.'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const currentForm = forms[activeLocale];
  const currentErrors = errors[activeLocale];
  const isProcessing = isSaving || isPublishing;
  const languageLabels: Record<HelpLocale, string> = {
    ca: tr('admin.helpEditor.languages.ca', 'Català'),
    es: tr('admin.helpEditor.languages.es', 'Español'),
    fr: tr('admin.helpEditor.languages.fr', 'Français'),
    pt: tr('admin.helpEditor.languages.pt', 'Português'),
  };
  const translatedErrors: Partial<Record<keyof HelpFormState, string>> = {
    title: currentErrors.title ? tr('admin.helpEditor.validation.titleRequired', 'El títol és obligatori') : undefined,
    intro: currentErrors.intro ? tr('admin.helpEditor.validation.introRequired', 'La introducció és obligatòria') : undefined,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tr('admin.helpEditor.dialogTitle', 'Editar ajuda:')} <code className="text-sm bg-muted px-2 py-0.5 rounded">{routeKey}</code>
          </DialogTitle>
          <DialogDescription>
            {tr('admin.helpEditor.dialogDescription', 'Edita el contingut de l’ajuda per cada idioma. Guarda per pujar a Storage i publica per activar els canvis.')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{tr('admin.helpEditor.loading', 'Carregant...')}</span>
          </div>
        ) : (
          <>
            <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as HelpLocale)}>
              <TabsList className="grid w-full grid-cols-4">
                {REQUIRED_HELP_LOCALES.map((locale) => (
                  <TabsTrigger key={locale} value={locale} className="text-xs">
                    {languageLabels[locale]}
                    {forms[locale].title.trim() && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        ✓
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeLocale} className="space-y-4 mt-4">
                {/* Camps obligatoris */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="title" className="flex items-center gap-1">
                      {tr('admin.helpEditor.fields.title', 'Títol')} <span className="text-muted-foreground">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={currentForm.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.title', 'Ex: Com gestionar moviments pendents')}
                      className={translatedErrors.title ? 'border-destructive' : ''}
                      disabled={isProcessing}
                    />
                    {translatedErrors.title && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {translatedErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="intro" className="flex items-center gap-1">
                      {tr('admin.helpEditor.fields.intro', 'Introducció')} <span className="text-muted-foreground">*</span>
                    </Label>
                    <Textarea
                      id="intro"
                      value={currentForm.intro}
                      onChange={(e) => handleFieldChange('intro', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.intro', 'Breu descripció de la funcionalitat...')}
                      rows={2}
                      className={translatedErrors.intro ? 'border-destructive' : ''}
                      disabled={isProcessing}
                    />
                    {translatedErrors.intro && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {translatedErrors.intro}
                      </p>
                    )}
                  </div>
                </div>

                {/* Camps opcionals - Arrays */}
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{tr('admin.helpEditor.optionalFields', 'Camps opcionals (1 línia = 1 element)')}</p>

                  <div>
                    <Label htmlFor="steps">{tr('admin.helpEditor.fields.steps', 'Passos')}</Label>
                    <Textarea
                      id="steps"
                      value={currentForm.steps}
                      onChange={(e) => handleFieldChange('steps', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.steps', 'Pas 1: Selecciona el moviment\nPas 2: Clica "Assignar"')}
                      rows={3}
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tips">{tr('admin.helpEditor.fields.tips', 'Consells')}</Label>
                    <Textarea
                      id="tips"
                      value={currentForm.tips}
                      onChange={(e) => handleFieldChange('tips', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.tips', 'Pots usar filtres per trobar moviments\nEls moviments assignats es marquen en verd')}
                      rows={2}
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="keywords">{tr('admin.helpEditor.fields.keywords', 'Paraules clau (per cerques)')}</Label>
                    <Input
                      id="keywords"
                      value={currentForm.keywords}
                      onChange={(e) => handleFieldChange('keywords', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.keywords', 'moviments, pendents, assignar, conciliar')}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{tr('admin.helpEditor.keywordsHint', 'Separa amb comes o salts de línia')}</p>
                  </div>
                </div>

                {/* Extra: Flow */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">{tr('admin.helpEditor.sections.flow', 'Extra: Flux de treball')}</p>
                  <div>
                    <Label htmlFor="extraFlowTitle">{tr('admin.helpEditor.fields.extraFlowTitle', 'Títol del flux')}</Label>
                    <Input
                      id="extraFlowTitle"
                      value={currentForm.extraFlowTitle}
                      onChange={(e) => handleFieldChange('extraFlowTitle', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.extraFlowTitle', 'Flux recomanat')}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="extraFlowItems">{tr('admin.helpEditor.fields.extraFlowItems', 'Passos del flux')}</Label>
                    <Textarea
                      id="extraFlowItems"
                      value={currentForm.extraFlowItems}
                      onChange={(e) => handleFieldChange('extraFlowItems', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.extraFlowItems', '1. Revisa pendents\n2. Assigna partida\n3. Valida')}
                      rows={2}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Extra: Pitfalls */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">{tr('admin.helpEditor.sections.pitfalls', 'Extra: Errors comuns')}</p>
                  <div>
                    <Label htmlFor="extraPitfallsTitle">{tr('admin.helpEditor.fields.extraPitfallsTitle', 'Títol')}</Label>
                    <Input
                      id="extraPitfallsTitle"
                      value={currentForm.extraPitfallsTitle}
                      onChange={(e) => handleFieldChange('extraPitfallsTitle', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.extraPitfallsTitle', 'Evita aquests errors')}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="extraPitfallsItems">{tr('admin.helpEditor.fields.extraPitfallsItems', 'Errors a evitar')}</Label>
                    <Textarea
                      id="extraPitfallsItems"
                      value={currentForm.extraPitfallsItems}
                      onChange={(e) => handleFieldChange('extraPitfallsItems', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.extraPitfallsItems', 'No assignis sense revisar l’import\nVerifica sempre la data')}
                      rows={2}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Extra: Manual i Video */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">{tr('admin.helpEditor.sections.resources', 'Extra: Recursos')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="extraManualLabel">{tr('admin.helpEditor.fields.extraManualLabel', 'Etiqueta manual')}</Label>
                      <Input
                        id="extraManualLabel"
                        value={currentForm.extraManualLabel}
                        onChange={(e) => handleFieldChange('extraManualLabel', e.target.value)}
                        placeholder={tr('admin.helpEditor.placeholders.extraManualLabel', 'Veure manual complet')}
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="extraVideoLabel">{tr('admin.helpEditor.fields.extraVideoLabel', 'Etiqueta vídeo')}</Label>
                      <Input
                        id="extraVideoLabel"
                        value={currentForm.extraVideoLabel}
                        onChange={(e) => handleFieldChange('extraVideoLabel', e.target.value)}
                        placeholder={tr('admin.helpEditor.placeholders.extraVideoLabel', 'Veure vídeo tutorial')}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="extraVideoNote">{tr('admin.helpEditor.fields.extraVideoNote', 'Nota del vídeo')}</Label>
                    <Input
                      id="extraVideoNote"
                      value={currentForm.extraVideoNote}
                      onChange={(e) => handleFieldChange('extraVideoNote', e.target.value)}
                      placeholder={tr('admin.helpEditor.placeholders.extraVideoNote', 'Durada: 3 minuts')}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
              <div className="flex-1 text-xs text-muted-foreground">
                {tr('admin.helpEditor.editing', 'Editant:')} <strong>{languageLabels[activeLocale]}</strong>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  {tr('admin.helpEditor.cancel', 'Cancel·lar')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={isProcessing}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {tr('admin.helpEditor.save', 'Guardar')}
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isProcessing}
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  {tr('admin.helpEditor.publish', 'Publicar')}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
