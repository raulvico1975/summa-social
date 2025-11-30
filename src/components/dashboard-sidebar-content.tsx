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
import { LayoutDashboard, Settings, LogOut, Users, FileText, FolderKanban, AreaChart } from 'lucide-react';
import { Logo } from '@/components/logo';
import { signOut as signOutServer } from '@/services/auth';
import { useFirebase, useAuth as useFirebaseAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { signOut as signOutClient } from 'firebase/auth';

export function DashboardSidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { auth } = useFirebase();
  const { t } = useTranslations();
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  
  const handleSignOut = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      // First, sign out from the client-side
      await signOutClient(auth);
      // Then, clear the server session cookie
      await signOutServer();
      
      toast({ title: t.sidebar.logoutToastTitle, description: t.sidebar.logoutToastDescription });
      
      // The user state will become null, and the app will redirect automatically.
      // Forcing a hard reload can also help clear any stale state.
      router.push('/');
      router.refresh();

    } catch (error) {
       console.error("Error signing out: ", error);
       toast({ variant: 'destructive', title: "Error", description: "No s'ha pogut tancar la sessió." });
    }
  };

  const menuItems = [
    {
      href: '/dashboard',
      label: t.sidebar.dashboard,
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/movimientos',
      label: t.sidebar.movements,
      icon: FileText,
    },
     {
      href: '/dashboard/projectes',
      label: t.sidebar.projects,
      icon: FolderKanban,
    },
    {
      href: '/dashboard/emissors',
      label: t.sidebar.emissors,
      icon: Users,
    },
    {
      href: '/dashboard/informes',
      label: t.sidebar.reports,
      icon: AreaChart,
    },
    {
      href: '/dashboard/configuracion',
      label: t.sidebar.settings,
      icon: Settings,
    },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 p-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-lg font-semibold font-headline">Summa Social</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                tooltip={{ children: item.label }}
              >
                <Link href={item.href}>
                  <item.icon />
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
                  <AvatarImage src={user?.picture} alt="User Avatar" data-ai-hint="user avatar" />
                  <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <span>{user?.name || t.sidebar.anonymousUser}</span>
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
