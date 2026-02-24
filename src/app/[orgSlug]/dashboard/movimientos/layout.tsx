'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';

interface MovimientosLayoutProps {
  children: React.ReactNode;
}

export default function MovimientosLayout({ children }: MovimientosLayoutProps) {
  const { canAccessMovimentsRoute } = usePermissions();

  if (!canAccessMovimentsRoute) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Acces restringit
            </CardTitle>
            <CardDescription>
              No tens permisos per accedir a Moviments.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Aquesta ruta requereix `sections.moviments` i `moviments.read`.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
