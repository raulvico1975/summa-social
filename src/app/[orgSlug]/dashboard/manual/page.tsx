'use client';

import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ManualPage() {
  const [content, setContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/docs/manual-usuari-summa-social.md')
      .then((res) => {
        if (!res.ok) throw new Error('No s\'ha pogut carregar el manual');
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleOpenInNewTab = () => {
    window.open('/docs/manual-usuari-summa-social.md', '_blank');
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manual d&apos;usuari</h1>
            <p className="text-muted-foreground mt-1">
              Referència completa per fer servir Summa Social sense suport.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Obrir en una pestanya nova
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Carregant manual...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {content && (
        <div className="rounded-lg border bg-muted/30 p-6">
          <pre className="whitespace-pre-wrap text-sm leading-6 font-mono">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
