'use client';

import * as React from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BotSheet } from './BotSheet';

export function BotFab() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        className="h-14 w-14 rounded-full shadow-lg bg-[#0da2e7] hover:bg-[#0b8dcc] text-white"
        onClick={() => setOpen(true)}
        aria-label="Assistent"
      >
        <Bot className="h-6 w-6" />
      </Button>

      <BotSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
