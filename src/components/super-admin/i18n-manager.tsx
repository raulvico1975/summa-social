'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Upload,
  Languages,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileJson,
  Loader2,
  Cloud,
  HardDrive,
  Send,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Import JSON locals directament
import caJson from '@/i18n/locales/ca.json';
import esJson from '@/i18n/locales/es.json';
import frJson from '@/i18n/locales/fr.json';
import ptJson from '@/i18n/locales/pt.json';

type Language = 'ca' | 'es' | 'fr' | 'pt';

type JsonMessages = Record<string, string>;

type DownloadSource = 'storage' | 'local' | null;

const localBundles: Record<Language, JsonMessages> = {
  ca: caJson as JsonMessages,
  es: esJson as JsonMessages,
  fr: frJson as JsonMessages,
  pt: ptJson as JsonMessages,
};

const languageLabels: Record<Language, string> = {
  ca: 'Català',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

type UploadValidation = {
  isValid: boolean;
  totalKeys: number;
  missingKeys: string[];
  extraKeys: string[];
  invalidValues: string[];
  parseError?: string;
};

export function I18nManager() {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = React.useState<Language>('ca');
  const [uploadValidation, setUploadValidation] = React.useState<UploadValidation | null>(null);
  const [uploadedContent, setUploadedContent] = React.useState<JsonMessages | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadSource, setDownloadSource] = React.useState<DownloadSource>(null);
  const [currentVersion, setCurrentVersion] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Estadístiques del bundle actual
  const currentBundle = localBundles[selectedLanguage];
  const baseBundle = localBundles.ca; // ca és la referència
  const totalKeysInBase = Object.keys(baseBundle).length;
  const totalKeysInCurrent = Object.keys(currentBundle).length;

  // Carregar versió actual al mount
  React.useEffect(() => {
    const loadVersion = async () => {
      try {
        const firestore = getFirestore();
        const i18nDoc = await getDoc(doc(firestore, 'system', 'i18n'));
        if (i18nDoc.exists()) {
          setCurrentVersion(i18nDoc.data()?.version ?? 0);
        } else {
          setCurrentVersion(0);
        }
      } catch {
        setCurrentVersion(0);
      }
    };
    loadVersion();
  }, []);

  // Descarregar des de Storage (amb fallback a local)
  const handleDownloadFromStorage = async () => {
    setIsDownloading(true);
    setDownloadSource(null);

    try {
      const storage = getStorage();
      const fileRef = ref(storage, `i18n/${selectedLanguage}.json`);
      const url = await getDownloadURL(fileRef);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');

      const data = await response.json();
      const jsonString = JSON.stringify(data, null, 2);
      downloadFile(jsonString, `${selectedLanguage}.json`);
      setDownloadSource('storage');

      toast({
        title: 'JSON descarregat (Storage)',
        description: `${selectedLanguage}.json (${Object.keys(data).length} claus)`,
      });
    } catch {
      // Fallback a local
      const bundle = localBundles[selectedLanguage];
      const jsonString = JSON.stringify(bundle, null, 2);
      downloadFile(jsonString, `${selectedLanguage}.json`);
      setDownloadSource('local');

      toast({
        title: 'JSON descarregat (Local)',
        description: `${selectedLanguage}.json (${totalKeysInCurrent} claus) - No hi ha versió a Storage`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper per descarregar fitxer
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Pujar a Storage
  const handleUploadToStorage = async () => {
    if (!uploadedContent) return;

    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = ref(storage, `i18n/${selectedLanguage}.json`);
      const jsonString = JSON.stringify(uploadedContent, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      await uploadBytes(fileRef, blob);

      toast({
        title: 'JSON pujat a Storage',
        description: `${selectedLanguage}.json (${Object.keys(uploadedContent).length} claus). Recorda publicar per activar els canvis.`,
      });

      // Clear upload state
      handleClearUpload();
    } catch (error) {
      console.error('[i18n] Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Error pujant',
        description: 'No s\'ha pogut pujar el fitxer. Verifica els permisos.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Publicar: incrementar version per invalidar cache
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const firestore = getFirestore();
      const i18nDocRef = doc(firestore, 'system', 'i18n');

      // Obtenir versió actual
      const currentDoc = await getDoc(i18nDocRef);
      const currentVer = currentDoc.exists() ? (currentDoc.data()?.version ?? 0) : 0;
      const newVersion = currentVer + 1;

      // Actualitzar amb nova versió
      await setDoc(i18nDocRef, {
        version: newVersion,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setCurrentVersion(newVersion);

      toast({
        title: 'Traduccions publicades',
        description: `Versió ${newVersion} activa. Tots els usuaris veuran els canvis.`,
      });
    } catch (error) {
      console.error('[i18n] Publish error:', error);
      toast({
        variant: 'destructive',
        title: 'Error publicant',
        description: 'No s\'ha pogut publicar. Verifica els permisos.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Validar JSON pujat
  const validateUpload = (content: unknown): UploadValidation => {
    // 1. Verificar que és un objecte
    if (typeof content !== 'object' || content === null || Array.isArray(content)) {
      return {
        isValid: false,
        totalKeys: 0,
        missingKeys: [],
        extraKeys: [],
        invalidValues: [],
        parseError: 'El fitxer no és un objecte JSON vàlid',
      };
    }

    const uploadedKeys = Object.keys(content);
    const baseKeys = new Set(Object.keys(baseBundle));
    const uploadedKeysSet = new Set(uploadedKeys);

    // 2. Verificar que tots els values són strings
    const invalidValues: string[] = [];
    for (const [key, value] of Object.entries(content)) {
      if (typeof value !== 'string') {
        invalidValues.push(`${key}: ${typeof value}`);
      }
    }

    // 3. Comparar amb base (ca)
    const missingKeys = [...baseKeys].filter(k => !uploadedKeysSet.has(k));
    const extraKeys = uploadedKeys.filter(k => !baseKeys.has(k));

    return {
      isValid: invalidValues.length === 0,
      totalKeys: uploadedKeys.length,
      missingKeys,
      extraKeys,
      invalidValues,
    };
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadValidation(null);
    setUploadedContent(null);

    try {
      const text = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        setUploadValidation({
          isValid: false,
          totalKeys: 0,
          missingKeys: [],
          extraKeys: [],
          invalidValues: [],
          parseError: 'Error parsejant JSON. Verifica el format.',
        });
        return;
      }

      const validation = validateUpload(parsed);
      setUploadValidation(validation);

      if (validation.isValid) {
        setUploadedContent(parsed as JsonMessages);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut llegir el fitxer',
      });
    } finally {
      setIsProcessing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clear upload state
  const handleClearUpload = () => {
    setUploadValidation(null);
    setUploadedContent(null);
  };

  return (
    <div className="space-y-4">
      {/* Header amb selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-semibold">Gestió de traduccions</h3>
            <p className="text-sm text-muted-foreground">
              Baixa i puja paquets de traducció JSON
            </p>
          </div>
        </div>

        <Select
          value={selectedLanguage}
          onValueChange={(v) => {
            setSelectedLanguage(v as Language);
            handleClearUpload();
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(localBundles) as Language[]).map((lang) => (
              <SelectItem key={lang} value={lang}>
                {languageLabels[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Download Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-green-500" />
              Descarregar JSON
            </CardTitle>
            <CardDescription>
              Baixa el paquet de traducció (Storage prioritari, fallback local)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{selectedLanguage}.json</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{totalKeysInCurrent} claus</Badge>
                {downloadSource && (
                  <Badge variant={downloadSource === 'storage' ? 'default' : 'outline'} className="gap-1">
                    {downloadSource === 'storage' ? (
                      <><Cloud className="h-3 w-3" /> Storage</>
                    ) : (
                      <><HardDrive className="h-3 w-3" /> Local</>
                    )}
                  </Badge>
                )}
              </div>
            </div>

            {selectedLanguage !== 'ca' && totalKeysInCurrent !== totalKeysInBase && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Diferència amb base (ca): {totalKeysInBase - totalKeysInCurrent} claus
                </span>
              </div>
            )}

            <Button onClick={handleDownloadFromStorage} className="w-full" disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descarregar {languageLabels[selectedLanguage]}
            </Button>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-blue-500" />
              Pujar JSON
            </CardTitle>
            <CardDescription>
              Puja un fitxer JSON traduït per validar-lo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="json-upload"
            />

            {!uploadValidation ? (
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Clica per seleccionar fitxer .json
                    </span>
                  </div>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Parse error */}
                {uploadValidation.parseError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{uploadValidation.parseError}</span>
                  </div>
                )}

                {/* Validation results */}
                {!uploadValidation.parseError && (
                  <>
                    {/* Total keys */}
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Claus totals</span>
                      </div>
                      <Badge variant="secondary">{uploadValidation.totalKeys}</Badge>
                    </div>

                    {/* Missing keys */}
                    {uploadValidation.missingKeys.length > 0 && (
                      <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              Claus que falten
                            </span>
                          </div>
                          <Badge variant="outline" className="text-amber-600">
                            {uploadValidation.missingKeys.length}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {uploadValidation.missingKeys.slice(0, 3).join(', ')}
                          {uploadValidation.missingKeys.length > 3 && '...'}
                        </p>
                      </div>
                    )}

                    {/* Extra keys */}
                    {uploadValidation.extraKeys.length > 0 && (
                      <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                              Claus extra
                            </span>
                          </div>
                          <Badge variant="outline" className="text-blue-600">
                            {uploadValidation.extraKeys.length}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {uploadValidation.extraKeys.slice(0, 3).join(', ')}
                          {uploadValidation.extraKeys.length > 3 && '...'}
                        </p>
                      </div>
                    )}

                    {/* Invalid values */}
                    {uploadValidation.invalidValues.length > 0 && (
                      <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/30">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-700 dark:text-red-400">
                              Valors invàlids (no string)
                            </span>
                          </div>
                          <Badge variant="destructive">
                            {uploadValidation.invalidValues.length}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {uploadValidation.invalidValues.slice(0, 3).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* All good */}
                    {uploadValidation.isValid &&
                      uploadValidation.missingKeys.length === 0 &&
                      uploadValidation.extraKeys.length === 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">JSON vàlid i complet</span>
                        </div>
                      )}
                  </>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearUpload}
                    className="flex-1"
                  >
                    Netejar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!uploadValidation.isValid || isUploading}
                    className="flex-1"
                    onClick={handleUploadToStorage}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Pujar a Storage
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publish Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-purple-500" />
            Publicar traduccions
          </CardTitle>
          <CardDescription>
            Activa els canvis pujats a Storage per a tots els usuaris
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Versió activa:</span>
              <Badge variant="outline" className="font-mono">
                v{currentVersion ?? '...'}
              </Badge>
            </div>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="gap-2"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publicar (v{(currentVersion ?? 0) + 1})
            </Button>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Publicar incrementa la versió i invalida el cache de tots els usuaris.
              Els canvis es veuran immediatament sense recarregar la pàgina.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Info footer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>Referència:</strong> El català (ca) és l'idioma base. Les traduccions es comparen
          amb les {totalKeysInBase} claus del català per detectar diferències.
        </div>
      </div>
    </div>
  );
}
