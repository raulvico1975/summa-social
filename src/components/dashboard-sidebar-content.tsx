
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
import { LayoutDashboard, BarChart3, Settings, LogOut, Users } from 'lucide-react';
import { Logo } from '@/components/logo';
import { signOut } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export function DashboardSidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleSignOut = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    await signOut();
    toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión correctamente.' });
    router.push('/');
  };

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Panel de Control',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/informes',
      label: 'Informes',
      icon: BarChart3,
    },
    {
      href: '/dashboard/contactos',
      label: 'Contactos',
      icon: Users,
    },
    {
      href: '/dashboard/configuracion',
      label: 'Configuración',
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
                <span>{user?.name || 'Usuario'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton asChild tooltip={{children: "Cerrar Sesión"}}>
                <Link href="/" onClick={handleSignOut}>
                  <LogOut />
                  <span>Cerrar Sesión</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
