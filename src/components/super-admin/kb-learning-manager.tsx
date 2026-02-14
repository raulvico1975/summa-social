'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrainCircuit, Download, Loader2, MessageSquareWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';

// =============================================================================
// TYPES
// =============================================================================

type ExportScope = 'all' | 'fallbackOnly';

// =============================================================================
// COMPONENT
// =============================================================================

export function KbLearningManager() {
  const { user } = useFirebase();
  const { toast } = useToast();

  const [scope, setScope] = React.useState<ExportScope>('fallbackOnly');
  const [days, setDays] = React.useState<string>('30');
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams({ scope, days });

      const res = await fetch(`/api/support/bot-questions/export?${params}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error exportant');
      }

      // Download CSV
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] ?? 'bot-questions.csv';

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'CSV descarregat',
        description: `Preguntes del bot exportades (${scope === 'fallbackOnly' ? 'sense resposta' : 'totes'}, ${days}d).`,
      });
    } catch (error) {
      console.error('[KbLearningManager] export error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'No s\'ha pogut exportar.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [user, scope, days, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="h-4 w-4" />
          Aprenentatge del bot
        </CardTitle>
        <CardDescription>
          Exporta les preguntes dels usuaris al bot de suport per millorar la KB.
          L'organització es determina automàticament pel teu compte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scope + Days */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Abast</label>
            <Select value={scope} onValueChange={(v) => setScope(v as ExportScope)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fallbackOnly">
                  <span className="flex items-center gap-1.5">
                    <MessageSquareWarning className="h-3.5 w-3.5 text-amber-500" />
                    Sense resposta (fallback)
                  </span>
                </SelectItem>
                <SelectItem value="all">Totes les preguntes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Període</label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dies</SelectItem>
                <SelectItem value="30">30 dies</SelectItem>
                <SelectItem value="90">90 dies</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descarregar CSV
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Top 500 per freqüència · PII emmascarada · orgId derivat del token
        </p>
      </CardContent>
    </Card>
  );
}
