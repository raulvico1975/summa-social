'use client'

import * as React from 'react'
import { getAuth } from 'firebase/auth'
import { Mic, MicOff, Loader2, CheckCircle2, AlertTriangle, Languages } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

type Lang = 'ca' | 'es' | 'fr' | 'pt'

type GuidePatchPayload = {
  title: string
  whatHappens: string
  stepByStep: string[]
  commonErrors: string[]
  howToCheck: string[]
  whenToEscalate: string[]
  cta: string
}

type GuidePatchForm = {
  title: string
  whatHappens: string
  stepByStep: string
  commonErrors: string
  howToCheck: string
  whenToEscalate: string
  cta: string
}

type CoverageRow = {
  guideId: string
  domain: string
  byLang: Record<
    Lang,
    {
      published: { complete: boolean; missingFields: string[] }
      draft: { complete: boolean; missingFields: string[] }
    }
  >
  publishedCompleteAllLangs: boolean
  hasAnyDraft: boolean
}

type ChecklistTask = {
  id: string
  title: string
  hint: string
  metric: number
  required: boolean
}

type ChecklistDecision = 'done' | 'postponed' | 'discarded'

type ChecklistState = {
  weekId: string
  status: 'open' | 'closed'
  tasks: ChecklistTask[]
  decisions: Record<
    string,
    {
      decision: ChecklistDecision
      note: string
      decidedBy: string
      decidedAtIso: string
    }
  >
  canCloseWeek: boolean
}

type DraftResponse = {
  ok: true
  guideId: string
  patchByLang: Record<Lang, GuidePatchPayload>
  sourceByLang: Record<Lang, 'draft' | 'published' | 'empty'>
}

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

const LANGS: Array<{ id: Lang; label: string; speechLang: string }> = [
  { id: 'ca', label: 'CA', speechLang: 'ca-ES' },
  { id: 'es', label: 'ES', speechLang: 'es-ES' },
  { id: 'fr', label: 'FR', speechLang: 'fr-FR' },
  { id: 'pt', label: 'PT', speechLang: 'pt-PT' },
]

const DECISION_LABELS: Record<ChecklistDecision, string> = {
  done: 'Fet',
  postponed: 'Ajornat',
  discarded: 'Descartat',
}

function emptyForm(): GuidePatchForm {
  return {
    title: '',
    whatHappens: '',
    stepByStep: '',
    commonErrors: '',
    howToCheck: '',
    whenToEscalate: '',
    cta: '',
  }
}

function toFormPatch(payload: GuidePatchPayload): GuidePatchForm {
  return {
    title: payload.title,
    whatHappens: payload.whatHappens,
    stepByStep: payload.stepByStep.join('\n'),
    commonErrors: payload.commonErrors.join('\n'),
    howToCheck: payload.howToCheck.join('\n'),
    whenToEscalate: payload.whenToEscalate.join('\n'),
    cta: payload.cta,
  }
}

function toPayloadPatch(form: GuidePatchForm): GuidePatchPayload {
  const parseLines = (value: string): string[] =>
    value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

  return {
    title: form.title.trim(),
    whatHappens: form.whatHappens.trim(),
    stepByStep: parseLines(form.stepByStep),
    commonErrors: parseLines(form.commonErrors),
    howToCheck: parseLines(form.howToCheck),
    whenToEscalate: parseLines(form.whenToEscalate),
    cta: form.cta.trim(),
  }
}

export function EditorialCenter() {
  const { toast } = useToast()
  const [isMounted, setIsMounted] = React.useState(false)
  const [isLoadingCoverage, setIsLoadingCoverage] = React.useState(false)
  const [coverageRows, setCoverageRows] = React.useState<CoverageRow[]>([])
  const [coverageSummary, setCoverageSummary] = React.useState<{
    totalGuides: number
    fullyPublishedGuides: number
    guidesWithDraft: number
    missingPublishedByLang: Record<Lang, number>
  } | null>(null)
  const [i18nVersion, setI18nVersion] = React.useState<number>(0)
  const [selectedGuideId, setSelectedGuideId] = React.useState<string>('')
  const [activeLang, setActiveLang] = React.useState<Lang>('ca')
  const [sourceByLang, setSourceByLang] = React.useState<Record<Lang, 'draft' | 'published' | 'empty'>>({
    ca: 'empty',
    es: 'empty',
    fr: 'empty',
    pt: 'empty',
  })
  const [formByLang, setFormByLang] = React.useState<Record<Lang, GuidePatchForm>>({
    ca: emptyForm(),
    es: emptyForm(),
    fr: emptyForm(),
    pt: emptyForm(),
  })
  const [isLoadingDraft, setIsLoadingDraft] = React.useState(false)
  const [isSavingDraft, setIsSavingDraft] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [checklistState, setChecklistState] = React.useState<ChecklistState | null>(null)
  const [isLoadingChecklist, setIsLoadingChecklist] = React.useState(false)
  const [isSavingDecisionForTask, setIsSavingDecisionForTask] = React.useState<string | null>(null)
  const [isClosingWeek, setIsClosingWeek] = React.useState(false)
  const [decisionDrafts, setDecisionDrafts] = React.useState<Record<string, ChecklistDecision>>({})
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({})
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const [dictationField, setDictationField] = React.useState<string | null>(null)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const getToken = React.useCallback(async () => {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) throw new Error('Sessió no disponible')
    return user.getIdToken()
  }, [])

  const loadCoverage = React.useCallback(async () => {
    setIsLoadingCoverage(true)
    try {
      const idToken = await getToken()
      const response = await fetch('/api/editorial/guide/coverage', {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No s ha pogut carregar cobertura')
      }

      setCoverageRows(data.rows)
      setCoverageSummary(data.summary)
      setI18nVersion(data.i18nVersion ?? 0)
      if (!selectedGuideId && data.rows.length > 0) {
        setSelectedGuideId(data.rows[0].guideId)
      }
    } catch (error) {
      console.error('[EditorialCenter] coverage error:', error)
      toast({
        variant: 'destructive',
        title: 'Error cobertura',
        description: (error as Error).message || 'No s ha pogut carregar cobertura',
      })
    } finally {
      setIsLoadingCoverage(false)
    }
  }, [getToken, selectedGuideId, toast])

  const loadChecklist = React.useCallback(async () => {
    setIsLoadingChecklist(true)
    try {
      const idToken = await getToken()
      const response = await fetch('/api/editorial/checklist', {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No s ha pogut carregar checklist')
      }

      setChecklistState(data.state)

      const decisions: Record<string, ChecklistDecision> = {}
      const notes: Record<string, string> = {}
      for (const task of data.state.tasks as ChecklistTask[]) {
        const existing = data.state.decisions?.[task.id]
        if (existing?.decision) decisions[task.id] = existing.decision
        if (existing?.note) notes[task.id] = existing.note
      }
      setDecisionDrafts(decisions)
      setNoteDrafts(notes)
    } catch (error) {
      console.error('[EditorialCenter] checklist error:', error)
      toast({
        variant: 'destructive',
        title: 'Error checklist',
        description: (error as Error).message || 'No s ha pogut carregar checklist',
      })
    } finally {
      setIsLoadingChecklist(false)
    }
  }, [getToken, toast])

  const loadDraft = React.useCallback(
    async (guideId: string) => {
      if (!guideId) return
      setIsLoadingDraft(true)
      try {
        const idToken = await getToken()
        const response = await fetch(`/api/editorial/guide/draft?guideId=${encodeURIComponent(guideId)}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const data = (await response.json()) as DraftResponse | { ok: false; error: string }
        if (!response.ok || !data.ok) {
          throw new Error((data as { error?: string }).error || 'No s ha pogut carregar draft')
        }

        setSourceByLang(data.sourceByLang)
        setFormByLang({
          ca: toFormPatch(data.patchByLang.ca),
          es: toFormPatch(data.patchByLang.es),
          fr: toFormPatch(data.patchByLang.fr),
          pt: toFormPatch(data.patchByLang.pt),
        })
      } catch (error) {
        console.error('[EditorialCenter] draft load error:', error)
        toast({
          variant: 'destructive',
          title: 'Error editor',
          description: (error as Error).message || 'No s ha pogut carregar la guia',
        })
      } finally {
        setIsLoadingDraft(false)
      }
    },
    [getToken, toast]
  )

  React.useEffect(() => {
    if (!isMounted) return
    loadCoverage()
    loadChecklist()
  }, [isMounted, loadCoverage, loadChecklist])

  React.useEffect(() => {
    if (!isMounted || !selectedGuideId) return
    loadDraft(selectedGuideId)
  }, [isMounted, selectedGuideId, loadDraft])

  const updateFormField = React.useCallback((lang: Lang, field: keyof GuidePatchForm, value: string) => {
    setFormByLang(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }))
  }, [])

  const handleSaveDraft = React.useCallback(async () => {
    if (!selectedGuideId) return
    setIsSavingDraft(true)
    try {
      const idToken = await getToken()
      const payload = {
        guideId: selectedGuideId,
        patchByLang: {
          ca: toPayloadPatch(formByLang.ca),
          es: toPayloadPatch(formByLang.es),
          fr: toPayloadPatch(formByLang.fr),
          pt: toPayloadPatch(formByLang.pt),
        },
      }

      const response = await fetch('/api/editorial/guide/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No s ha pogut guardar draft')
      }

      toast({
        title: 'Esborrany guardat',
        description: 'La guia s ha guardat a guidesDraft.* sense publicar.',
      })

      await Promise.all([loadCoverage(), loadChecklist(), loadDraft(selectedGuideId)])
    } catch (error) {
      console.error('[EditorialCenter] draft save error:', error)
      toast({
        variant: 'destructive',
        title: 'Error guardant draft',
        description: (error as Error).message || 'No s ha pogut guardar',
      })
    } finally {
      setIsSavingDraft(false)
    }
  }, [formByLang, getToken, loadChecklist, loadCoverage, loadDraft, selectedGuideId, toast])

  const handlePublish = React.useCallback(async () => {
    if (!selectedGuideId) return
    setIsPublishing(true)
    try {
      const idToken = await getToken()
      const payload = {
        guideId: selectedGuideId,
        patchByLang: {
          ca: toPayloadPatch(formByLang.ca),
          es: toPayloadPatch(formByLang.es),
          fr: toPayloadPatch(formByLang.fr),
          pt: toPayloadPatch(formByLang.pt),
        },
        meta: { source: 'manual' as const },
      }

      const response = await fetch('/api/editorial/guide/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok || !data.published) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          throw new Error(data.errors.slice(0, 3).map((error: { field: string; message: string }) => `${error.field}: ${error.message}`).join(' | '))
        }
        throw new Error(data.message || 'No s ha pogut publicar')
      }

      toast({
        title: 'Guia publicada',
        description: `Publicada ${selectedGuideId}. Nova versió i18n: ${data.newI18nVersion}`,
      })

      await Promise.all([loadCoverage(), loadChecklist(), loadDraft(selectedGuideId)])
    } catch (error) {
      console.error('[EditorialCenter] publish error:', error)
      toast({
        variant: 'destructive',
        title: 'Error publicant',
        description: (error as Error).message || 'No s ha pogut publicar',
      })
    } finally {
      setIsPublishing(false)
    }
  }, [formByLang, getToken, loadChecklist, loadCoverage, loadDraft, selectedGuideId, toast])

  const getSpeechCtor = (): SpeechRecognitionCtor | null => {
    if (typeof window === 'undefined') return null
    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
  }

  const handleToggleDictation = React.useCallback((lang: Lang, field: keyof GuidePatchForm) => {
    const currentFieldId = `${lang}.${field}`
    if (dictationField === currentFieldId && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const Ctor = getSpeechCtor()
    if (!Ctor) {
      toast({
        variant: 'destructive',
        title: 'Dictat no disponible',
        description: 'El navegador no suporta reconeixement de veu.',
      })
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    const recognition = new Ctor()
    recognition.lang = LANGS.find(item => item.id === lang)?.speechLang ?? 'ca-ES'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? ''
      if (!transcript) return

      setFormByLang(prev => {
        const current = prev[lang][field]
        const isListField = field !== 'title' && field !== 'whatHappens' && field !== 'cta'
        const separator = current.trim() ? (isListField ? '\n' : ' ') : ''
        return {
          ...prev,
          [lang]: {
            ...prev[lang],
            [field]: `${current}${separator}${transcript}`.trim(),
          },
        }
      })
    }
    recognition.onerror = () => {
      setDictationField(null)
    }
    recognition.onend = () => {
      setDictationField(null)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    setDictationField(currentFieldId)
    recognition.start()
  }, [dictationField, toast])

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const handleSaveTaskDecision = React.useCallback(async (taskId: string) => {
    if (!checklistState) return
    const decision = decisionDrafts[taskId]
    if (!decision) {
      toast({
        variant: 'destructive',
        title: 'Decisió requerida',
        description: 'Selecciona una decisió abans de guardar.',
      })
      return
    }

    setIsSavingDecisionForTask(taskId)
    try {
      const idToken = await getToken()
      const response = await fetch('/api/editorial/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'decide',
          weekId: checklistState.weekId,
          taskId,
          decision,
          note: noteDrafts[taskId] ?? '',
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No s ha pogut guardar la decisió')
      }
      setChecklistState(data.state)
      toast({
        title: 'Decisió guardada',
        description: `Tasca ${taskId} actualitzada.`,
      })
    } catch (error) {
      console.error('[EditorialCenter] save decision error:', error)
      toast({
        variant: 'destructive',
        title: 'Error guardant decisió',
        description: (error as Error).message || 'No s ha pogut guardar',
      })
    } finally {
      setIsSavingDecisionForTask(null)
    }
  }, [checklistState, decisionDrafts, getToken, noteDrafts, toast])

  const handleCloseWeek = React.useCallback(async () => {
    if (!checklistState) return
    setIsClosingWeek(true)
    try {
      const idToken = await getToken()
      const response = await fetch('/api/editorial/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'close',
          weekId: checklistState.weekId,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        const extra = Array.isArray(data.missingTaskIds) ? ` (${data.missingTaskIds.join(', ')})` : ''
        throw new Error((data.error || 'No s ha pogut tancar setmana') + extra)
      }

      setChecklistState(data.state)
      toast({
        title: 'Setmana tancada',
        description: `Checklist ${checklistState.weekId} tancat.`,
      })
    } catch (error) {
      console.error('[EditorialCenter] close week error:', error)
      toast({
        variant: 'destructive',
        title: 'No es pot tancar',
        description: (error as Error).message || 'Falten decisions obligatòries',
      })
    } finally {
      setIsClosingWeek(false)
    }
  }, [checklistState, getToken, toast])

  if (!isMounted) return null

  const currentForm = formByLang[activeLang]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-4 w-4" />
            Centre Editorial (P1)
          </CardTitle>
          <CardDescription>
            Guardar escriu només a <code>guidesDraft.*</code>. Publicar escriu a <code>guides.*</code> i incrementa <code>system/i18n.version</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">i18n v{i18nVersion}</Badge>
            <Badge variant="outline">Guies catàleg: {coverageSummary?.totalGuides ?? 0}</Badge>
            <Badge variant="outline">Publicades 4 idiomes: {coverageSummary?.fullyPublishedGuides ?? 0}</Badge>
            <Badge variant="outline">Amb draft: {coverageSummary?.guidesWithDraft ?? 0}</Badge>
            <Button variant="outline" size="sm" onClick={() => { loadCoverage(); loadChecklist() }} disabled={isLoadingCoverage || isLoadingChecklist}>
              {(isLoadingCoverage || isLoadingChecklist) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refrescar
            </Button>
          </div>

          {coverageSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {LANGS.map(lang => (
                <div key={lang.id} className="rounded border p-2">
                  <div className="font-medium">{lang.label}</div>
                  <div className="text-muted-foreground">Pendents publicació: {coverageSummary.missingPublishedByLang[lang.id]}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="coverage" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="coverage">Cobertura</TabsTrigger>
          <TabsTrigger value="editor">Editor guiat</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quines guies falten</CardTitle>
              <CardDescription>Comparativa catàleg vs estat real a i18n (publicat i draft).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[420px] overflow-auto">
              {isLoadingCoverage ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregant cobertura...
                </div>
              ) : (
                coverageRows.map(row => (
                  <div key={row.guideId} className="border rounded p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{row.guideId}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.domain}</Badge>
                        {row.publishedCompleteAllLangs ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300">Publicada</Badge>
                        ) : (
                          <Badge variant="secondary">Pendent</Badge>
                        )}
                        {row.hasAnyDraft && <Badge variant="outline">Amb draft</Badge>}
                        <Button size="sm" variant="outline" onClick={() => { setSelectedGuideId(row.guideId); setActiveLang('ca') }}>
                          Editar
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                      {LANGS.map(lang => (
                        <div key={lang.id} className="rounded bg-muted/30 px-2 py-1">
                          <div className="font-medium">{lang.label}</div>
                          <div className="flex items-center gap-1 mt-1">
                            {row.byLang[lang.id].published.complete ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            )}
                            <span>publicat</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {row.byLang[lang.id].draft.complete ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span>draft</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Editor guiat</CardTitle>
              <CardDescription>5 blocs obligatoris + CTA, amb dictat per veu per camp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-sm">Guia</Label>
                <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Selecciona guia" />
                  </SelectTrigger>
                  <SelectContent>
                    {coverageRows.map(row => (
                      <SelectItem key={row.guideId} value={row.guideId}>
                        {row.guideId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingDraft && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregant...
                  </span>
                )}
              </div>

              <Tabs value={activeLang} onValueChange={(value) => setActiveLang(value as Lang)}>
                <TabsList className="grid grid-cols-4 w-full">
                  {LANGS.map(lang => (
                    <TabsTrigger key={lang.id} value={lang.id}>
                      {lang.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {LANGS.map(lang => (
                  <TabsContent key={lang.id} value={lang.id} className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Font actual: {sourceByLang[lang.id]}
                    </div>

                    <FieldWithMic
                      label="Title"
                      value={formByLang[lang.id].title}
                      onChange={value => updateFormField(lang.id, 'title', value)}
                      onMic={() => handleToggleDictation(lang.id, 'title')}
                      recording={dictationField === `${lang.id}.title`}
                    />

                    <FieldWithMic
                      label="What happens"
                      value={formByLang[lang.id].whatHappens}
                      onChange={value => updateFormField(lang.id, 'whatHappens', value)}
                      onMic={() => handleToggleDictation(lang.id, 'whatHappens')}
                      recording={dictationField === `${lang.id}.whatHappens`}
                      multiline
                    />

                    <FieldWithMic
                      label="Step by step (1 línia = 1 pas)"
                      value={formByLang[lang.id].stepByStep}
                      onChange={value => updateFormField(lang.id, 'stepByStep', value)}
                      onMic={() => handleToggleDictation(lang.id, 'stepByStep')}
                      recording={dictationField === `${lang.id}.stepByStep`}
                      multiline
                    />

                    <FieldWithMic
                      label="Common errors (1 línia = 1 punt)"
                      value={formByLang[lang.id].commonErrors}
                      onChange={value => updateFormField(lang.id, 'commonErrors', value)}
                      onMic={() => handleToggleDictation(lang.id, 'commonErrors')}
                      recording={dictationField === `${lang.id}.commonErrors`}
                      multiline
                    />

                    <FieldWithMic
                      label="How to check (1 línia = 1 punt)"
                      value={formByLang[lang.id].howToCheck}
                      onChange={value => updateFormField(lang.id, 'howToCheck', value)}
                      onMic={() => handleToggleDictation(lang.id, 'howToCheck')}
                      recording={dictationField === `${lang.id}.howToCheck`}
                      multiline
                    />

                    <FieldWithMic
                      label="When to escalate (1 línia = 1 punt)"
                      value={formByLang[lang.id].whenToEscalate}
                      onChange={value => updateFormField(lang.id, 'whenToEscalate', value)}
                      onMic={() => handleToggleDictation(lang.id, 'whenToEscalate')}
                      recording={dictationField === `${lang.id}.whenToEscalate`}
                      multiline
                    />

                    <FieldWithMic
                      label="CTA"
                      value={formByLang[lang.id].cta}
                      onChange={value => updateFormField(lang.id, 'cta', value)}
                      onMic={() => handleToggleDictation(lang.id, 'cta')}
                      recording={dictationField === `${lang.id}.cta`}
                    />
                  </TabsContent>
                ))}
              </Tabs>

              <Separator />

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft || isPublishing || isLoadingDraft || !selectedGuideId}>
                  {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar esborrany
                </Button>
                <Button onClick={handlePublish} disabled={isPublishing || isSavingDraft || isLoadingDraft || !selectedGuideId}>
                  {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publicar
                </Button>
                <span className="text-xs text-muted-foreground">
                  Publicar aplica gate server-side i només llavors actualitza versió i18n.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview ràpida ({activeLang.toUpperCase()})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div><strong>Títol:</strong> {currentForm.title || '—'}</div>
              <div><strong>Què passa:</strong> {currentForm.whatHappens || '—'}</div>
              <div><strong>Pas a pas:</strong> {currentForm.stepByStep || '—'}</div>
              <div><strong>Errors comuns:</strong> {currentForm.commonErrors || '—'}</div>
              <div><strong>Com comprovar:</strong> {currentForm.howToCheck || '—'}</div>
              <div><strong>Quan escalar:</strong> {currentForm.whenToEscalate || '—'}</div>
              <div><strong>CTA:</strong> {currentForm.cta || '—'}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist setmanal</CardTitle>
              <CardDescription>No es pot tancar setmana si falta decisió en qualsevol tasca.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingChecklist || !checklistState ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregant checklist...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Setmana: {checklistState.weekId}</Badge>
                    <Badge variant={checklistState.status === 'closed' ? 'default' : 'secondary'}>
                      {checklistState.status === 'closed' ? 'Tancada' : 'Oberta'}
                    </Badge>
                    <Badge variant={checklistState.canCloseWeek ? 'default' : 'outline'}>
                      {checklistState.canCloseWeek ? 'Llesta per tancar' : 'Falten decisions'}
                    </Badge>
                  </div>

                  {checklistState.tasks.map(task => (
                    <div key={task.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-muted-foreground">{task.hint}</div>
                        </div>
                        <Badge variant="outline">metric: {task.metric}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2">
                        <Select
                          value={decisionDrafts[task.id] ?? ''}
                          onValueChange={(value) => setDecisionDrafts(prev => ({ ...prev, [task.id]: value as ChecklistDecision }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Decisió" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="done">{DECISION_LABELS.done}</SelectItem>
                            <SelectItem value="postponed">{DECISION_LABELS.postponed}</SelectItem>
                            <SelectItem value="discarded">{DECISION_LABELS.discarded}</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          value={noteDrafts[task.id] ?? ''}
                          onChange={(event) => setNoteDrafts(prev => ({ ...prev, [task.id]: event.target.value }))}
                          placeholder="Motiu (obligatori per ajornat/descartat)"
                        />

                        <Button
                          variant="outline"
                          onClick={() => handleSaveTaskDecision(task.id)}
                          disabled={isSavingDecisionForTask === task.id || checklistState.status === 'closed'}
                        >
                          {isSavingDecisionForTask === task.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <Button
                      onClick={handleCloseWeek}
                      disabled={!checklistState.canCloseWeek || checklistState.status === 'closed' || isClosingWeek}
                    >
                      {isClosingWeek && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Tancar setmana
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FieldWithMic(props: {
  label: string
  value: string
  onChange: (value: string) => void
  onMic: () => void
  recording: boolean
  multiline?: boolean
}) {
  const { label, value, onChange, onMic, recording, multiline = false } = props

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onMic}>
          {recording ? <MicOff className="h-4 w-4 text-red-600" /> : <Mic className="h-4 w-4" />}
          <span className="ml-1 text-xs">{recording ? 'Atura' : 'Dictar'}</span>
        </Button>
      </div>
      {multiline ? (
        <Textarea value={value} onChange={event => onChange(event.target.value)} rows={4} />
      ) : (
        <Input value={value} onChange={event => onChange(event.target.value)} />
      )}
    </div>
  )
}
