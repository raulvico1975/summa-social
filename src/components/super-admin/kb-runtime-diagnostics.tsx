'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export function KbRuntimeDiagnostics() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [version, setVersion] = React.useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = React.useState<string | null>(null);
  const [storageExists, setStorageExists] = React.useState<boolean | null>(null);
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
      if (!user) return;

      setIsLoading(true);

      try {
        const db = getFirestore();
        const snap = await getDoc(doc(db, 'system', 'supportKb'));

        if (snap.exists()) {
          const data = snap.data();
          setUpdatedAt(data.updatedAt?.toDate?.().toISOString() ?? null);
          setUpdatedBy(data.updatedBy ?? null);
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
