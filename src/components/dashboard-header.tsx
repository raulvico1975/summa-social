
'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from 'next/link';


export function DashboardHeader() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(part => part);
    let path = '';
    const items = parts.map((part, index) => {
      path += `/${part}`;
      const isLast = index === parts.length - 1;
      const name = part.charAt(0).toUpperCase() + part.slice(1);

      return (
        <React.Fragment key={path}>
          <BreadcrumbItem>
            {isLast ? (
               <BreadcrumbPage>{name}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={path}>{name}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {!isLast && <BreadcrumbSeparator />}
        </React.Fragment>
      )
    });
    return items;
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-9 w-9 border border-border" />
        <Breadcrumb>
          <BreadcrumbList>
            {getBreadcrumbs()}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {/* User menu or other actions can go here */}
    </header>
  );
}
