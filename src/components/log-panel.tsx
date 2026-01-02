
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppLog } from '@/hooks/use-app-log';
import { X, Bot, Trash2, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { SUPER_ADMIN_UID } from '@/lib/data';

export function LogPanel() {
  const { logs, clearLogs } = useAppLog();
  const { t } = useTranslations();
  const { toast } = useToast();
  const { user } = useFirebase();
  const [isOpen, setIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Només visible per SuperAdmin o en development
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;
  const isDev = process.env.NODE_ENV === 'development';
  const shouldShowUI = isSuperAdmin || isDev;

  // Ref per gestionar timeout i evitar memory leaks
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout quan component es desmunta
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyLogs = async () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      toast({ title: t.dashboard.copied });
      // Netejar timeout anterior si existeix
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying logs:', err);
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    }
  };

  React.useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [logs]);

  // Amagar UI completament per usuaris normals (context segueix funcionant)
  if (!shouldShowUI) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        className="shadow-lg rounded-full h-14 w-14"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-lg shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle className="text-lg">{t.logPanel.title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopyLogs} className="h-8 w-8" disabled={logs.length === 0}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={clearLogs} className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64 p-4 pt-0" ref={scrollAreaRef}>
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t.logPanel.waiting}
            </div>
          ) : (
            <div className="space-y-2 text-sm font-mono">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="font-sans text-muted-foreground">{log.timestamp}</span>
                  <div className="flex-1 break-words">
                  {log.message.includes('ERROR') ? (
                    <Badge variant="destructive" className="mr-2">{t.logPanel.errorBadge}</Badge>
                  ) : log.message.includes('¡Éxito!') || log.message.includes('Èxit') ? (
                     <Badge variant="success" className="mr-2">{t.logPanel.successBadge}</Badge>
                  ) : null}
                  {log.message.replace(/ERROR:? ?/, '').replace(/¡Éxito! ?/, '').replace(/Èxit:? ?/, '')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
