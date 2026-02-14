'use client';

import * as React from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/i18n';
import { useFirebase } from '@/firebase';
import { trackUX } from '@/lib/ux/trackUX';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface BotMessage {
  role: 'user' | 'bot';
  text: string;
  uiPaths?: string[];
  cardId?: string;
  mode?: 'card' | 'fallback';
}

interface BotSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function BotSheet({ open, onOpenChange }: BotSheetProps) {
  const { language, tr } = useTranslations();
  const { user } = useFirebase();

  const [messages, setMessages] = React.useState<BotMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // i18n strings
  const title = tr('bot.title', language === 'es' ? 'Asistente' : 'Assistent');
  const placeholder = tr('bot.placeholder', language === 'es' ? 'Escribe tu pregunta...' : 'Escriu la teva pregunta...');
  const thinking = tr('bot.thinking', language === 'es' ? 'Pensando...' : 'Pensant...');
  const errorGeneric = tr('bot.errorGeneric', language === 'es' ? 'No he podido procesar la pregunta. Vuelve a intentarlo.' : 'No he pogut processar la pregunta. Torna-ho a provar.');

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when sheet opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = React.useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !user) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    const lang = language === 'es' ? 'es' : 'ca';

    trackUX('bot.send', { lang });

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/support/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: text, lang }),
      });

      const data = await res.json();

      if (data.ok) {
        setMessages(prev => [...prev, {
          role: 'bot',
          text: data.answer,
          uiPaths: data.uiPaths,
          cardId: data.cardId,
          mode: data.mode,
        }]);

        if (data.mode === 'fallback') {
          trackUX('bot.fallback', { cardId: data.cardId, lang });
        }
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: errorGeneric }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: errorGeneric }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, user, language, errorGeneric]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-[100dvh] flex-col w-[400px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#0da2e7]" />
            {title}
          </SheetTitle>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="space-y-4 pr-2 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'bot' && (
                  <div className="h-7 w-7 rounded-full bg-[#0da2e7]/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-[#0da2e7]" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.text}
                  {msg.uiPaths && msg.uiPaths.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.uiPaths.map((path, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {path}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-[#0da2e7]/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-[#0da2e7]" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {thinking}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="pt-3 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-[#0da2e7] hover:bg-[#0b8dcc] text-white shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
