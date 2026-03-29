'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { HelpCircle, CheckCircle2, AlertTriangle, Copy, ExternalLink, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MANUAL_HREFS } from '@/components/help/HelpSheet';
import {
  REQUIRED_HELP_LOCALES,
  buildHelpTitleKey,
  type HelpLocale,
} from '@/lib/help/help-audit';
import { getLocalBundle, trFactory } from '@/i18n/json-runtime';
import { useTranslations } from '@/i18n';
import { HelpEditorDialog } from './help-editor-dialog';

/**
 * Secció d'auditoria d'ajudes per /admin
 *
 * Mostra una taula amb tots els routeKeys que requereixen ajuda
 * i l'estat de publicació per cada idioma.
 */
export function HelpAuditSection() {
  const { toast } = useToast();
  const { tr } = useTranslations();
  const [editingRouteKey, setEditingRouteKey] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Obtenir tots els routeKeys que haurien de tenir ajuda
  const helpKeys = React.useMemo(() => Object.keys(MANUAL_HREFS).sort(), []);

  // Crear funcions tr() per cada idioma (usant bundles locals)
  const trByLocale = React.useMemo(() => {
    const result: Record<HelpLocale, ReturnType<typeof trFactory>> = {} as Record<HelpLocale, ReturnType<typeof trFactory>>;
    for (const locale of REQUIRED_HELP_LOCALES) {
      const bundle = getLocalBundle(locale);
      result[locale] = trFactory(bundle);
    }
    return result;
  }, []);

  // Calcular l'estat de publicació per cada routeKey i idioma
  const auditResults = React.useMemo(() => {
    return helpKeys.map((routeKey) => {
      const locales: Record<HelpLocale, boolean> = {} as Record<HelpLocale, boolean>;

      for (const locale of REQUIRED_HELP_LOCALES) {
        const tr = trByLocale[locale];
        const key = buildHelpTitleKey(routeKey);
        const value = tr(key);
        // Publicada si retorna un valor diferent de la clau
        locales[locale] = Boolean(value && value !== key && value.trim() !== '');
      }

      const isComplete = REQUIRED_HELP_LOCALES.every((locale) => locales[locale]);

      return {
        routeKey,
        locales,
        isComplete,
      };
    });
  }, [helpKeys, trByLocale]);

  // Comptar ajudes incompletes
  const incompleteCount = auditResults.filter((r) => !r.isComplete).length;

  // Handler per copiar prefix al clipboard
  const handleCopyPrefix = (routeKey: string) => {
    const prefix = `help.${routeKey}.`;
    navigator.clipboard.writeText(prefix);
    toast({
      title: tr('admin.helpAudit.toast.copiedTitle', 'Prefix copiat'),
      description: tr('admin.helpAudit.toast.copiedDescription', '"{prefix}" copiat al porta-retalls. Cerca aquest prefix a Traduccions.').replace('{prefix}', prefix),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-4 w-4" />
          {tr('admin.helpAudit.title', 'Ajudes contextuals')}
          {incompleteCount > 0 && (
            <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
              {tr('admin.helpAudit.incompleteBadge', '{count} incompletes').replace('{count}', String(incompleteCount))}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {tr('admin.helpAudit.description', 'Estat de publicació de les ajudes per pantalla i idioma. Les ajudes es gestionen via Traduccions.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('admin.helpAudit.table.screen', 'Pantalla (routeKey)')}</TableHead>
              {REQUIRED_HELP_LOCALES.map((locale) => (
                <TableHead key={locale} className="text-center w-16">
                  {locale.toUpperCase()}
                </TableHead>
              ))}
              <TableHead className="w-32">{tr('admin.helpAudit.table.actions', 'Accions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditResults.map((result) => (
              <TableRow key={result.routeKey}>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {result.routeKey}
                  </code>
                </TableCell>
                {REQUIRED_HELP_LOCALES.map((locale) => (
                  <TableCell key={locale} className="text-center">
                    {result.locales[locale] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditingRouteKey(result.routeKey)}
                      title={tr('admin.helpAudit.editTitle', 'Editar ajuda per {routeKey}').replace('{routeKey}', result.routeKey)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {tr('admin.helpAudit.edit', 'Editar')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleCopyPrefix(result.routeKey)}
                      title={tr('admin.helpAudit.copyTitle', 'Copia prefix help.{routeKey}.').replace('{routeKey}', result.routeKey)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            {tr('admin.helpAudit.footer.editHint', 'Clica Editar per modificar l’ajuda directament, o copia el prefix per editar via Traduccions.')}
          </p>
          <p className="mt-1 text-xs">
            {tr('admin.helpAudit.footer.minimumFields', 'Cada ajuda requereix com a mínim: help.ROUTEKEY.title i help.ROUTEKEY.intro')}
          </p>
        </div>

        {/* Dialog d'edició */}
        <HelpEditorDialog
          open={editingRouteKey !== null}
          onOpenChange={(open) => {
            if (!open) setEditingRouteKey(null);
          }}
          routeKey={editingRouteKey ?? ''}
          onPublished={() => {
            // Forçar refetch incrementant refreshKey
            // Nota: Els bundles locals no canvien fins a rebuild,
            // però l'usuari pot veure el canvi via HelpSheet
            setRefreshKey((k) => k + 1);
          }}
        />
      </CardContent>
    </Card>
  );
}
