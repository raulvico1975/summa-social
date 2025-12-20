// src/app/[orgSlug]/dashboard/project-module/admin/page.tsx
// Pàgina d'administració per executar migracions

'use client';

import * as React from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, AlertCircle, CheckCircle2, FolderSearch } from 'lucide-react';

interface MigrationDetail {
  orgId: string;
  orgName: string;
  projectId: string;
  projectName: string;
  status: 'migrated' | 'skipped' | 'error';
  message?: string;
}

interface MigrationResult {
  success: boolean;
  migrated: number;
  errors: string[];
  details: MigrationDetail[];
}

export default function ProjectModuleAdminPage() {
  const { app } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<MigrationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const runMigration = async (dryRun: boolean) => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const functions = getFunctions(app, 'europe-west1');
      const migrate = httpsCallable<{ dryRun: boolean; orgId?: string }, MigrationResult>(
        functions,
        'migrateProjectModulePaths'
      );

      const response = await migrate({
        dryRun,
        orgId: organizationId || undefined,
      });

      setResult(response.data);
    } catch (err) {
      console.error('Error executing migration:', err);
      setError(err instanceof Error ? err.message : 'Error desconegut');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administració del Mòdul de Projectes</h1>
        <p className="text-muted-foreground">
          Eines de manteniment i migracions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderSearch className="h-5 w-5" />
            Migració de Paths
          </CardTitle>
          <CardDescription>
            Migra els projectes del path antic (<code>projectModule/[projectId]</code>)
            al nou path (<code>projectModule/_/projects/[projectId]</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => runMigration(true)}
              disabled={isRunning}
              variant="outline"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Dry Run (simulació)
            </Button>
            <Button
              onClick={() => runMigration(false)}
              disabled={isRunning}
              variant="default"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Executar Migració Real
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {result.success ? 'Migració completada' : 'Migració amb errors'}
                </AlertTitle>
                <AlertDescription>
                  Projectes processats: {result.migrated}
                  {result.errors.length > 0 && (
                    <span className="text-destructive ml-2">
                      ({result.errors.length} errors)
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {result.details.length > 0 && (
                <div className="rounded-md border p-4 space-y-2">
                  <h4 className="font-medium">Detalls:</h4>
                  {result.details.map((detail, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                    >
                      <div>
                        <span className="font-medium">{detail.projectName}</span>
                        <span className="text-muted-foreground ml-2">
                          ({detail.orgName})
                        </span>
                      </div>
                      <Badge
                        variant={
                          detail.status === 'migrated'
                            ? 'default'
                            : detail.status === 'skipped'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {detail.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {result.details.length === 0 && result.migrated === 0 && (
                <p className="text-muted-foreground text-sm">
                  No s'han trobat projectes per migrar. Pot ser que ja estiguin al path correcte.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
