'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function KbRuntimeDiagnostics() {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = React.useState(false);
  const [version, setVersion] = React.useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = React.useState<string | null>(null);
  const [storageExists, setStorageExists] = React.useState<boolean | null>(null);
  const [aiReformatEnabled, setAiReformatEnabled] = React.useState(true);
  const [reformatTimeoutMs, setReformatTimeoutMs] = React.useState<number | null>(null);
  const [isUpdatingAi, setIsUpdatingAi] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isMounted) return;

    const loadDiagnostics = async () => {
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { getAuth } = await import('firebase/auth');

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const db = getFirestore();
        const snap = await getDoc(doc(db, 'system', 'supportKb'));

        if (snap.exists()) {
          const data = snap.data();
          setUpdatedAt(data.updatedAt?.toDate?.().toISOString() ?? null);
          setUpdatedBy(data.updatedBy ?? null);
          setAiReformatEnabled(data.aiReformatEnabled !== false);
        }

        // Check Storage kb.json existence + version via API call
        // (client can't access Storage directly, and version from server is source of truth)
        const idToken = await user.getIdToken();
        const res = await fetch('/api/support/kb/diagnostics', {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (res.ok) {
          const diagnostics = await res.json();
          setVersion(diagnostics.version ?? 0);
          setStorageExists(diagnostics.storageExists ?? false);
          setAiReformatEnabled(diagnostics.aiReformatEnabled !== false);
          setReformatTimeoutMs(diagnostics.reformatTimeoutMs ?? null);
        }
      } catch (error) {
        console.warn('[KbRuntimeDiagnostics] Error loading diagnostics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDiagnostics();
  }, [isMounted]);

  if (!isMounted) return null;

  const handleToggleAi = async (nextValue: boolean) => {
    setIsUpdatingAi(true);
    try {
      const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { getAuth } = await import('firebase/auth');

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const db = getFirestore();
      await setDoc(
        doc(db, 'system', 'supportKb'),
        {
          aiReformatEnabled: nextValue,
          aiConfigUpdatedAt: serverTimestamp(),
          aiConfigUpdatedBy: user.uid,
        },
        { merge: true }
      );

      setAiReformatEnabled(nextValue);
      toast({
        title: nextValue ? 'IA activada' : 'IA desactivada',
        description: nextValue
          ? 'El bot reformula respostes amb IA quan sigui possible.'
          : 'El bot respondrà només amb contingut KB (mode ultra estable).',
      });
    } catch (error) {
      console.warn('[KbRuntimeDiagnostics] Error updating AI mode:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut actualitzar el mode IA.',
      });
    } finally {
      setIsUpdatingAi(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4" />
          KB Runtime - Estat del sistema
        </CardTitle>
        <CardDescription>
          Versió activa i estat de Storage en temps real.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregant...</p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium">Versió actual</p>
              <p className="text-2xl font-bold">v{version ?? 0}</p>
            </div>

            {updatedAt && (
              <div>
                <p className="text-xs text-muted-foreground">
                  Publicat el: {new Date(updatedAt).toLocaleString('ca-ES')}
                </p>
                {updatedBy && (
                  <p className="text-xs text-muted-foreground">Per: {updatedBy}</p>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Storage</p>
              <div className="flex items-center gap-2">
                {storageExists === true ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">kb.json PRESENT</span>
                  </>
                ) : storageExists === false ? (
                  <>
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">kb.json ABSENT (només filesystem)</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Desconegut</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Mode IA</p>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    Reformulació IA: <strong>{aiReformatEnabled ? 'ACTIVA' : 'OFF (KB pura)'}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Si tens incidències, desactiva-la per màxima estabilitat.
                  </p>
                  {reformatTimeoutMs ? (
                    <p className="text-xs text-muted-foreground">
                      Timeout IA: {reformatTimeoutMs}ms
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={aiReformatEnabled}
                  onCheckedChange={handleToggleAi}
                  disabled={isLoading || isUpdatingAi}
                  aria-label="Activar o desactivar reformulació IA"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
