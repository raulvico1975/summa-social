'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  FileText, 
  FolderKanban, 
  AreaChart, 
  Shield,
  Heart,
  Building2,
  UserCog
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';

const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';

export function DashboardSidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { auth: firebaseAuth } = useFirebase();
  const { t } = useTranslations();
  const { toast } = useToast();
  
  // Obtenir dades de l'organització i el helper per construir URLs
  const { userProfile, firebaseUser, organization, orgSlug } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  
  const isSuperAdmin = firebaseUser?.uid === SUPER_ADMIN_UID;

  const handleSignOut = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      // Netejar sessionStorage si el Super Admin estava veient una altra org
      sessionStorage.removeItem('adminViewingOrgId');
      
      await firebaseSignOut(firebaseAuth);
      
      toast({ title: t.sidebar.logoutToastTitle, description: t.sidebar.logoutToastDescription });
      
      router.push('/');
      router.refresh(); 

    } catch (error) {
       console.error("Error signing out: ", error);
       toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut tancar la sessió." });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CANVI PRINCIPAL: Construir URLs amb el slug de l'organització
  // ═══════════════════════════════════════════════════════════════════════════
  const menuItems = React.useMemo(() => {
    const baseItems = [
      {
        path: '/dashboard',
        label: t.sidebar.dashboard,
        icon: LayoutDashboard,
      },
      {
        path: '/dashboard/movimientos',
        label: t.sidebar.movements,
        icon: FileText,
      },
      {
        path: '/dashboard/projectes',
        label: t.sidebar.projects,
        icon: FolderKanban,
      },
      {
        path: '/dashboard/donants',
        label: t.sidebar.donors || 'Donants',
        icon: Heart,
        className: 'text-red-500',
      },
     {
        path: '/dashboard/proveidors',
        label: t.sidebar.suppliers || 'Proveïdors',
        icon: Building2,
        className: 'text-blue-500',
      },
      {
        path: '/dashboard/treballadors',
        label: t.sidebar.employees || 'Treballadors',
        icon: UserCog,
        className: 'text-purple-500',
      },
      {
        path: '/dashboard/informes',
        label: t.sidebar.reports,
        icon: AreaChart,
      },
      {
        path: '/dashboard/configuracion',
        label: t.sidebar.settings,
        icon: Settings,
      },
    ];

    // Afegir opció Super Admin si l'usuari ho és
    if (isSuperAdmin) {
      baseItems.push({
        path: '/dashboard/super-admin',
        label: 'Super Admin',
        icon: Shield,
        className: 'text-purple-500',
      });
    }

    // Construir URLs amb el slug
    return baseItems.map(item => ({
      ...item,
      href: buildUrl(item.path),
    }));
  }, [t, isSuperAdmin, buildUrl]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper per comprovar si una ruta està activa
  // Ara funciona amb URLs que inclouen el slug
  // ═══════════════════════════════════════════════════════════════════════════
  const isActive = React.useCallback((href: string, path: string) => {
    // Si estem a la pàgina principal del dashboard
    if (path === '/dashboard') {
      // Comprovar si el pathname acaba amb /dashboard (amb o sense slug)
      return pathname.endsWith('/dashboard') && !pathname.includes('/dashboard/');
    }
    
    // Per altres pàgines, comprovar si el pathname conté el path
    const pathSuffix = path.replace('/dashboard', '');
    return pathname.includes(pathSuffix) && pathSuffix !== '';
  }, [pathname]);

  const getInitials = (name: string | null | undefined): string => {
    if (!name || name === t.sidebar.anonymousUser) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts[0] && parts[0].length > 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Obtenir el nom de l'usuari
  const userName = React.useMemo(() => {
    if (userProfile?.displayName) {
      return userProfile.displayName;
    }
    if (firebaseUser?.displayName) {
      return firebaseUser.displayName;
    }
    if (firebaseUser?.email) {
      return firebaseUser.email.split('@')[0];
    }
    return t.sidebar.anonymousUser;
  }, [userProfile, firebaseUser, t.sidebar.anonymousUser]);

  const userInitials = getInitials(userName);

  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
          <Logo className="h-8 w-8 text-primary" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-semibold font-headline">Summa Social</span>
            {/* ═══════════════════════════════════════════════════════════════
                NOU: Mostrar el nom de l'organització actual
                ═══════════════════════════════════════════════════════════════ */}
            {organization && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {organization.name}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href, item.path)}
                tooltip={{ children: item.label }}
              >
                <Link href={item.href}>
                  <item.icon className={item.className} />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="#">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={firebaseUser?.photoURL ?? undefined} alt="User Avatar" data-ai-hint="user avatar" />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span>{userName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton asChild tooltip={{children: t.sidebar.logout}}>
                <Link href="/" onClick={handleSignOut}>
                  <LogOut />
                  <span>{t.sidebar.logout}</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
