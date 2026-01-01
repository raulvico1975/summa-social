'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Activity, Megaphone, Wrench } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'govern', label: 'Govern', icon: <Shield className="h-3.5 w-3.5" /> },
  { id: 'salut', label: 'Salut', icon: <Activity className="h-3.5 w-3.5" /> },
  { id: 'contingut', label: 'Contingut', icon: <Megaphone className="h-3.5 w-3.5" /> },
  { id: 'operativa', label: 'Operativa', icon: <Wrench className="h-3.5 w-3.5" /> },
];

/**
 * AdminNav - Mini-navegació sticky per saltar entre seccions del panell.
 */
export function AdminNav() {
  const [activeSection, setActiveSection] = React.useState<string>('govern');

  // Observar quina secció és visible
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -70% 0px' }
    );

    navItems.forEach((item) => {
      const section = document.getElementById(item.id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                activeSection === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
