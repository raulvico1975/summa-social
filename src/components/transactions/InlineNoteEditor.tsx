'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, X, StickyNote } from 'lucide-react';
import { useTranslations } from '@/i18n';

interface InlineNoteEditorProps {
  note: string | null | undefined;
  onSave: (note: string) => void;
}

export const InlineNoteEditor = React.memo(function InlineNoteEditor({
  note,
  onSave,
}: InlineNoteEditorProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState('');

  const handleStartEdit = React.useCallback(() => {
    setValue(note || '');
    setIsEditing(true);
  }, [note]);

  const handleSave = React.useCallback(() => {
    onSave(value);
    setIsEditing(false);
    setValue('');
  }, [onSave, value]);

  const handleCancel = React.useCallback(() => {
    setIsEditing(false);
    setValue('');
  }, []);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.movements.table.addNote}
          className="h-7 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
          <Check className="h-3.5 w-3.5 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  if (note) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <StickyNote className="h-3.5 w-3.5 text-amber-500" />
            <span className="italic max-w-[120px] truncate">"{note}"</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{note}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleStartEdit}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent transition-colors"
          aria-label={t.movements.table.addNote}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{t.movements.table.addNote}</p>
      </TooltipContent>
    </Tooltip>
  );
});
