
'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from 'next/link';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { HelpSheet } from '@/components/help/HelpSheet';
import { Badge } from '@/components/ui/badge';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';

// Mapatge de segments URL a claus de traducció
const SEGMENT_TO_KEY: Record<string, keyof typeof import('@/i18n/ca').ca.breadcrumb> = {
  'dashboard': 'dashboard',
  'project-module': 'projectModule',
  'expenses': 'expenses',
  'projects': 'projects',
  'new': 'new',
  'edit': 'edit',
  'admin': 'admin',
  'donors': 'donors',
  'transactions': 'transactions',
  'categories': 'categories',
  'settings': 'settings',
  'model182': 'model182',
  'model347': 'model347',
  'stripe': 'stripe',
  'reports': 'reports',
};

// Heurística per detectar IDs de Firestore (alfanumèrics, >= 12 caràcters)
function isFirestoreId(segment: string): boolean {
  return segment.length >= 12 && /^[a-zA-Z0-9]+$/.test(segment);
}

// Convertir kebab-case a Title Case com a fallback
function toTitleCase(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DashboardHeader() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { organization } = useCurrentOrganization();

  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(part => part);

    // Filtrar segments que no volem mostrar
    const filteredParts: { segment: string; path: string; isId: boolean }[] = [];
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;

      // Primer segment és orgSlug - usar nom d'organització
      if (i === 0) {
        filteredParts.push({
          segment: '__org__', // marcador especial
          path: currentPath,
          isId: false,
        });
        continue;
      }

      // Si és un ID de Firestore, marcar-lo per tractar-lo diferent
      if (isFirestoreId(part)) {
        // Mirar el segment anterior per determinar context
        const prevSegment = parts[i - 1];

        // Si el següent segment és 'edit', no afegim l'ID (es mostrarà "Editar")
        if (parts[i + 1] === 'edit') {
          continue;
        }

        // Per expenses/[txId] o projects/[projectId] sense edit, mostrar "Detall"
        if (prevSegment === 'expenses' || prevSegment === 'projects') {
          filteredParts.push({
            segment: '__detail__',
            path: currentPath,
            isId: true,
          });
          continue;
        }

        // Altres IDs: no mostrar
        continue;
      }

      filteredParts.push({
        segment: part,
        path: currentPath,
        isId: false,
      });
    }

    const items = filteredParts.map((item, index) => {
      const isLast = index === filteredParts.length - 1;

      // Determinar el label
      let label: string;

      if (item.segment === '__org__') {
        // Usar nom de l'organització
        label = organization?.name || 'Organització';
      } else if (item.segment === '__detail__') {
        // Usar traducció de "Detall"
        label = t.breadcrumb.detail;
      } else {
        // Buscar al mapatge de traduccions
        const key = SEGMENT_TO_KEY[item.segment];
        if (key && t.breadcrumb[key]) {
          label = t.breadcrumb[key];
        } else {
          // Fallback: Title Case
          label = toTitleCase(item.segment);
        }
      }

      return (
        <React.Fragment key={item.path}>
          <BreadcrumbItem className="min-w-0 max-w-[8rem] sm:max-w-[12rem]">
            {isLast ? (
               <BreadcrumbPage className="truncate">{label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild className="truncate">
                <Link href={item.path}>{label}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {!isLast && <BreadcrumbSeparator className="shrink-0" />}
        </React.Fragment>
      )
    });
    return items;
  }

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 md:px-6">
      {/* Bloc esquerra: degradable (breadcrumb truncat) */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="h-9 w-9 shrink-0 border border-border" />
        {isDemoEnv() && (
          <Badge variant="outline" className="shrink-0 bg-amber-100 text-amber-800 border-amber-300 text-xs font-medium">
            DEMO
          </Badge>
        )}
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap overflow-hidden">
            {getBreadcrumbs()}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {/* Bloc dreta: fix (icones sempre visibles) */}
      <div className="flex shrink-0 items-center gap-2">
        <HelpSheet />
      </div>
    </header>
  );
}
