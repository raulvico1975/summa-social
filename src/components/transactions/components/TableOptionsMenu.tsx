'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface TableOptionsMenuProps {
  hideRemittanceItems: boolean;
  onHideRemittanceItemsChange: (value: boolean) => void;
  showProjectColumn: boolean;
  onShowProjectColumnChange: (value: boolean) => void;
  t: {
    tableOptions: string;
    hideRemittanceItems: string;
    showProjectColumn: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TableOptionsMenu = React.memo(function TableOptionsMenu({
  hideRemittanceItems,
  onHideRemittanceItemsChange,
  showProjectColumn,
  onShowProjectColumnChange,
  t,
}: TableOptionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">{t.tableOptions}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel>{t.tableOptions}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={hideRemittanceItems}
          onCheckedChange={onHideRemittanceItemsChange}
        >
          {t.hideRemittanceItems}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showProjectColumn}
          onCheckedChange={onShowProjectColumnChange}
        >
          {t.showProjectColumn}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
