'use client';

import * as React from 'react';
import { getAuth } from 'firebase/auth';
import { BrainCircuit, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type WizardMode = 'from_unanswered' | 'manual';

type CandidateItem = {
  question: string;
  lang: string;
  count: number;
  lastSeen: string;
  suggestedDomain: string;
  suggestedKeywords: string[];
};

type KbCardRow = {
  id: string;
  titleCa: string;
  titleEs: string;
  questionCa: string;
  questionEs: string;
  answerCa: string;
  answerEs: string;
  domain: string;
  source: 'base' | 'published' | 'draft';
  isDraftOverride: boolean;
  isDeleted: boolean;
  isRequiredCore: boolean;
};

type PublishIssue = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

function detectTopic(question: string): string {
  const text = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/fiscal|182|347|aeat|hisenda|hacienda|certificat|modelo|model/.test(text)) return 'Fiscal';
  if (/sepa|pain|xml|domiciliaci|iban|banc|banco/.test(text)) return 'SEPA';
  if (/remesa|remesas|devoluc|processa|procesa|desfer|deshacer|split/.test(text)) return 'Remeses';
  if (/superadmin|perill|peligro|irreversible|eliminar|esborrar|borrar/.test(text)) return 'SuperAdmin';
  if (/donant|donante|soci|socio/.test(text)) return 'Donants';
  if (/projecte|proyecto/.test(text)) return 'Projectes';
  return 'General';
}

function safetyText(topic: string): string {
  if (topic === 'Fiscal') return 'Consulta sensible: la resposta es publicarà en mode orientatiu per seguretat.';
  if (topic === 'SEPA') return 'Consulta sensible: la resposta es publicarà amb orientació prudent.';
  if (topic === 'Remeses') return 'Consulta sensible: es recomana revisar bé els passos abans de confirmar.';
  if (topic === 'SuperAdmin') return 'Acció sensible: es publicarà amb proteccions de seguretat.';
  return 'Consulta estàndard: es publicarà com a resposta completa.';
}

function sourceLabel(row: KbCardRow): string {
  if (row.isDeleted) return 'Esborrada';
  if (row.source === 'draft') return 'Pendent';
  return 'Publicada';
}

export function KbLearningManager() {
  const { toast } = useToast();

  const [isMounted, setIsMounted] = React.useState(false);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = React.useState<WizardMode>('from_unanswered');

  const [days, setDays] = React.useState<'7' | '30' | '90'>('30');
  const [isLoadingCandidates, setIsLoadingCandidates] = React.useState(false);
  const [candidates, setCandidates] = React.useState<CandidateItem[]>([]);

  const [editingCardId, setEditingCardId] = React.useState<string>('');
  const [questionCa, setQuestionCa] = React.useState('');
  const [questionEs, setQuestionEs] = React.useState('');
  const [answerCa, setAnswerCa] = React.useState('');
  const [answerEs, setAnswerEs] = React.useState('');

  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishIssues, setPublishIssues] = React.useState<PublishIssue[]>([]);

  const [isLoadingCards, setIsLoadingCards] = React.useState(false);
  const [cards, setCards] = React.useState<KbCardRow[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const getToken = React.useCallback(async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Sessió no disponible');
    return user.getIdToken();
  }, []);

  const loadCandidates = React.useCallback(async () => {
    if (mode !== 'from_unanswered') return;

    setIsLoadingCandidates(true);
    try {
      const idToken = await getToken();
      const res = await fetch(`/api/support/bot-questions/candidates?days=${days}&limit=100`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No s han pogut carregar preguntes');
      }
      setCandidates(data.items ?? []);
    } catch (error) {
      console.error('[KbLearningManager] loadCandidates error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'No s han pogut carregar preguntes.',
      });
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [days, getToken, mode, toast]);

  const loadCards = React.useCallback(async () => {
    setIsLoadingCards(true);
    try {
      const idToken = await getToken();
      const res = await fetch('/api/support/kb/cards', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No s ha pogut carregar el llistat de targetes');
      }
      setCards(data.cards ?? []);
    } catch (error) {
      console.error('[KbLearningManager] loadCards error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'No s ha pogut carregar el llistat.',
      });
    } finally {
      setIsLoadingCards(false);
    }
  }, [getToken, toast]);

  React.useEffect(() => {
    if (!isMounted) return;
    loadCards();
  }, [isMounted, loadCards]);

  React.useEffect(() => {
    if (!isMounted || !wizardOpen || step !== 2 || mode !== 'from_unanswered') return;
    loadCandidates();
  }, [days, isMounted, loadCandidates, mode, step, wizardOpen]);

  const resetWizard = React.useCallback(() => {
    setStep(1);
    setMode('from_unanswered');
    setEditingCardId('');
    setQuestionCa('');
    setQuestionEs('');
    setAnswerCa('');
    setAnswerEs('');
    setPublishIssues([]);
  }, []);

  const openNewWizard = React.useCallback(() => {
    resetWizard();
    setWizardOpen(true);
  }, [resetWizard]);

  const handleSelectCandidate = React.useCallback((candidate: CandidateItem) => {
    setQuestionCa(candidate.question);
    setQuestionEs(candidate.question);
    setStep(3);
  }, []);

  const handlePublish = React.useCallback(async () => {
    if (!questionCa.trim()) {
      toast({ variant: 'destructive', title: 'Falta informació', description: 'Escriu la pregunta en català.' });
      return;
    }

    if (!answerCa.trim()) {
      toast({ variant: 'destructive', title: 'Falta informació', description: 'Escriu la resposta en català.' });
      return;
    }

    setIsPublishing(true);
    setPublishIssues([]);

    try {
      const idToken = await getToken();
      const payload = {
        action: 'upsert' as const,
        input: {
          mode,
          cardId: editingCardId || undefined,
          questionCa: questionCa.trim(),
          questionEs: questionEs.trim() || questionCa.trim(),
          answerCa: answerCa.trim(),
          answerEs: answerEs.trim() || answerCa.trim(),
        },
      };

      const res = await fetch('/api/support/kb/cards/precheck-and-publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const issues = Array.isArray(data.issues) ? (data.issues as PublishIssue[]) : [];
      setPublishIssues(issues);

      if (!res.ok || !data.ok || !data.published) {
        toast({
          variant: 'destructive',
          title: 'No es pot publicar',
          description: issues[0]?.message || 'Revisa els punts pendents i torna-ho a provar.',
        });
        await loadCards();
        return;
      }

      toast({
        title: 'Publicat',
        description: `Canvis publicats correctament (v${data.version}).`,
      });

      setWizardOpen(false);
      resetWizard();
      await loadCards();
    } catch (error) {
      console.error('[KbLearningManager] publish error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'No s ha pogut publicar.',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [answerCa, answerEs, editingCardId, getToken, loadCards, mode, questionCa, questionEs, resetWizard, toast]);

  const handleEdit = React.useCallback((card: KbCardRow) => {
    setWizardOpen(true);
    setStep(3);
    setMode('manual');
    setEditingCardId(card.id);
    setQuestionCa(card.questionCa || card.titleCa);
    setQuestionEs(card.questionEs || card.titleEs || card.questionCa || card.titleCa);
    setAnswerCa(card.answerCa || '');
    setAnswerEs(card.answerEs || card.answerCa || '');
    setPublishIssues([]);
  }, []);

  const handleDelete = React.useCallback(async (card: KbCardRow) => {
    const confirmed = window.confirm(`Vols esborrar definitivament la targeta "${card.id}"?`);
    if (!confirmed) return;

    setIsPublishing(true);
    try {
      const idToken = await getToken();
      const res = await fetch('/api/support/kb/cards/precheck-and-publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: 'delete', cardId: card.id }),
      });

      const data = await res.json();
      const issues = Array.isArray(data.issues) ? (data.issues as PublishIssue[]) : [];

      if (!res.ok || !data.ok || !data.published) {
        toast({
          variant: 'destructive',
          title: 'No es pot esborrar',
          description: issues[0]?.message || 'No s ha pogut completar l esborrat.',
        });
        return;
      }

      toast({
        title: 'Targeta esborrada',
        description: `S ha eliminat i publicat correctament (v${data.version}).`,
      });

      await loadCards();
    } catch (error) {
      console.error('[KbLearningManager] delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'No s ha pogut esborrar.',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [getToken, loadCards, toast]);

  const topic = detectTopic(questionCa || questionEs);
  const filteredCards = cards
    .filter(card => !card.isDeleted)
    .filter(card => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [card.id, card.titleCa, card.titleEs, card.questionCa, card.questionEs]
        .join(' ')
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  if (!isMounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="h-4 w-4" />
          Aprenentatge del bot
        </CardTitle>
        <CardDescription>
          Aquí pots afegir, editar i esborrar preguntes i respostes del bot amb un assistent guiat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openNewWizard}>
            <Plus className="mr-2 h-4 w-4" />
            Afegir noves preguntes i respostes al bot
          </Button>
          <Button variant="outline" onClick={loadCards} disabled={isLoadingCards || isPublishing}>
            {(isLoadingCards || isPublishing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Actualitzar llistat
          </Button>
        </div>

        {wizardOpen && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Assistent guiat</CardTitle>
              <CardDescription>
                Pas {step} de 4
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 && (
                <div className="space-y-3">
                  <Label>D on parteixes?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={mode === 'from_unanswered' ? 'default' : 'outline'}
                      onClick={() => setMode('from_unanswered')}
                    >
                      Preguntes sense resposta
                    </Button>
                    <Button
                      type="button"
                      variant={mode === 'manual' ? 'default' : 'outline'}
                      onClick={() => setMode('manual')}
                    >
                      Nova pregunta
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setStep(2)}>Següent</Button>
                    <Button variant="ghost" onClick={() => setWizardOpen(false)}>Tancar</Button>
                  </div>
                </div>
              )}

              {step === 2 && mode === 'from_unanswered' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label>Període</Label>
                      <Select value={days} onValueChange={(v) => setDays(v as '7' | '30' | '90')}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 dies</SelectItem>
                          <SelectItem value="30">30 dies</SelectItem>
                          <SelectItem value="90">90 dies</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={loadCandidates} disabled={isLoadingCandidates}>
                      {isLoadingCandidates && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Actualitzar preguntes
                    </Button>
                  </div>

                  <div className="max-h-[260px] overflow-auto space-y-2">
                    {candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hi ha preguntes sense bona resposta en aquest període.</p>
                    ) : (
                      candidates.map((item, idx) => (
                        <button
                          key={`${item.question}-${idx}`}
                          type="button"
                          className="w-full text-left rounded border p-2 hover:bg-muted/40"
                          onClick={() => handleSelectCandidate(item)}
                        >
                          <p className="text-sm font-medium">{item.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Repeticions: {item.count} · Tema detectat: {item.suggestedDomain}
                          </p>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>Enrere</Button>
                  </div>
                </div>
              )}

              {step === 2 && mode === 'manual' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Pregunta en català</Label>
                    <Input value={questionCa} onChange={e => setQuestionCa(e.target.value)} placeholder="Ex: Com puc veure les quotes pagades d un soci?" />
                  </div>
                  <div className="space-y-1">
                    <Label>Pregunta en castellà (opcional)</Label>
                    <Input value={questionEs} onChange={e => setQuestionEs(e.target.value)} placeholder="Si ho deixes buit, es copiarà la pregunta en català" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>Enrere</Button>
                    <Button onClick={() => setStep(3)} disabled={!questionCa.trim()}>Següent</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Pregunta en català</Label>
                    <Input value={questionCa} onChange={e => setQuestionCa(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Pregunta en castellà (opcional)</Label>
                    <Input value={questionEs} onChange={e => setQuestionEs(e.target.value)} placeholder="Si ho deixes buit, es copiarà la pregunta en català" />
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <Label>Resposta en català</Label>
                    <Textarea
                      rows={5}
                      value={answerCa}
                      onChange={e => setAnswerCa(e.target.value)}
                      placeholder="Escriu una resposta clara i humana"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Com quedarà en castellà (editable)</Label>
                    <Textarea
                      rows={5}
                      value={answerEs}
                      onChange={e => setAnswerEs(e.target.value)}
                      placeholder="Si ho deixes buit, es copiarà la resposta en català"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}>Enrere</Button>
                    <Button onClick={() => setStep(4)} disabled={!questionCa.trim() || !answerCa.trim()}>Següent</Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <div className="rounded border p-3 space-y-2">
                    <p className="text-sm"><strong>Tema detectat:</strong> {topic}</p>
                    <p className="text-sm text-muted-foreground"><strong>Nivell de seguretat:</strong> {safetyText(topic)}</p>
                    <p className="text-sm text-muted-foreground">Si la publicació no passa, et direm exactament què cal modificar.</p>
                  </div>

                  {publishIssues.length > 0 && (
                    <div className="rounded border p-3 space-y-2">
                      <p className="text-sm font-medium">Revisió abans de publicar</p>
                      {publishIssues.map((issue, idx) => (
                        <p key={`${issue.field}-${idx}`} className={`text-sm ${issue.severity === 'error' ? 'text-destructive' : 'text-amber-700'}`}>
                          - {issue.message}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(3)} disabled={isPublishing}>Enrere</Button>
                    <Button onClick={handlePublish} disabled={isPublishing}>
                      {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Comprovar i publicar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per id, pregunta o títol"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[360px] overflow-auto">
            {isLoadingCards ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregant targetes...
              </div>
            ) : filteredCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hi ha targetes per mostrar.</p>
            ) : (
              filteredCards.map(card => (
                <div key={card.id} className="rounded border p-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[250px] flex-1">
                    <p className="text-sm font-medium">{card.id}</p>
                    <p className="text-sm text-muted-foreground mt-1">{card.titleCa || card.questionCa}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estat: {sourceLabel(card)} · Tema: {card.domain}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(card)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(card)}
                      disabled={isPublishing || card.isRequiredCore}
                      title={card.isRequiredCore ? 'Aquesta targeta és obligatòria' : 'Esborrar definitivament'}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Esborrar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
