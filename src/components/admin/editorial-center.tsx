'use client'

import * as React from 'react'
import { getAuth } from 'firebase/auth'
import { Mic, MicOff, Loader2, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

type SimpleGuideForm = {
  title: string
  intro: string
  steps: string
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

type SourceStatus = 'draft' | 'published' | 'empty'

type SimpleGuideField = keyof SimpleGuideForm

const LANGS: Array<{ id: Lang; label: string; speechLang: string }> = [
  { id: 'ca', label: 'CA', speechLang: 'ca-ES' },
  { id: 'es', label: 'ES', speechLang: 'es-ES' },
  { id: 'fr', label: 'FR', speechLang: 'fr-FR' },
  { id: 'pt', label: 'PT', speechLang: 'pt-PT' },
]

const INTRO_SUFFIX: Record<Lang, string> = {
  ca: 'Això et dona context ràpid per actuar amb seguretat.',
  es: 'Esto te da contexto rápido para actuar con seguridad.',
  fr: "C'est une aide claire pour avancer avec les bonnes étapes.",
  pt: 'Isto é uma ajuda clara para avançar com os passos certos.',
}

const EXTRA_STEP: Record<Lang, string | null> = {
  ca: null,
  es: null,
  fr: 'Pour finir, vérifie les données avec une révision complète.',
  pt: 'Para terminar, confirme os dados com uma revisão final.',
}

const COMMON_ERRORS_TEXT: Record<Lang, string> = {
  ca: 'Error habitual: saltar un pas o anar massa ràpid. Repassa-ho amb calma abans de continuar.',
  es: 'Error habitual: saltarse un paso o ir demasiado rápido. Repásalo con calma antes de continuar.',
  fr: 'Erreur fréquente: sauter une étape. Pour la qualité, vérifie les données avec une revue complète.',
  pt: 'Erro comum: pular uma etapa ou ir rápido demais. Revise com calma para evitar erros.',
}

const HOW_TO_CHECK_TEXT: Record<Lang, string> = {
  ca: "Comprova el resultat final i valida que cada pas s'ha aplicat correctament.",
  es: 'Comprueba el resultado final y valida que cada paso se haya aplicado correctamente.',
  fr: 'Pour vérifier, relis les étapes avec une dernière vérification des données.',
  pt: 'Para validar, releia os passos com uma verificação final dos dados.',
}

const FIXED_ENDING: Record<Lang, string> = {
  ca: 'Si no surt a la primera, no passa res: estem amb tu i ho resolem plegats.',
  es: 'Si no sale a la primera, no pasa nada: estamos contigo y lo resolvemos juntos.',
  fr: "Si ce n'est pas clair, on est avec toi et on continue ensemble.",
  pt: 'Se não sair à primeira, tudo bem: estamos com você e seguimos juntos.',
}

const FIXED_CTA: Record<Lang, string> = {
  ca: "Si vols, t'ajudem en el següent pas.",
  es: 'Si quieres, te ayudamos en el siguiente paso.',
  fr: "Si besoin, on t'aide pour la suite.",
  pt: 'Se quiser, ajudamos no próximo passo.',
}

function emptyForm(): SimpleGuideForm {
  return {
    title: '',
    intro: '',
    steps: '',
  }
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function stripKnownSuffix(value: string, suffix: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.endsWith(suffix)) {
    return trimmed.slice(0, Math.max(0, trimmed.length - suffix.length)).trim().replace(/[\s.]+$/, '')
  }
  return trimmed
}

function toSimpleFormPatch(lang: Lang, payload: GuidePatchPayload): SimpleGuideForm {
  const cleanedSteps = payload.stepByStep.filter(step => step.trim() && step.trim() !== EXTRA_STEP[lang])

  return {
    title: payload.title,
    intro: stripKnownSuffix(payload.whatHappens, INTRO_SUFFIX[lang]),
    steps: cleanedSteps.join('\n'),
  }
}

function toDraftPayload(form: SimpleGuideForm): GuidePatchPayload {
  return {
    title: form.title.trim(),
    whatHappens: form.intro.trim(),
    stepByStep: parseLines(form.steps),
    commonErrors: [],
    howToCheck: [],
    whenToEscalate: [],
    cta: '',
  }
}

function toPublishPayload(lang: Lang, form: SimpleGuideForm): GuidePatchPayload {
  const title = form.title.trim()
  const intro = form.intro.trim()
  const steps = parseLines(form.steps)

  const stepByStep = [...steps]
  const extraStep = EXTRA_STEP[lang]
  if (extraStep && steps.length > 0) {
    stepByStep.push(extraStep)
  }

  return {
    title,
    whatHappens: intro ? `${intro} ${INTRO_SUFFIX[lang]}`.trim() : '',
    stepByStep,
    commonErrors: intro || steps.length > 0 ? [COMMON_ERRORS_TEXT[lang]] : [],
    howToCheck: intro || steps.length > 0 ? [HOW_TO_CHECK_TEXT[lang]] : [],
    whenToEscalate: intro || steps.length > 0 ? [FIXED_ENDING[lang]] : [],
    cta: intro || steps.length > 0 || title ? FIXED_CTA[lang] : '',
  }
}

function sourceLabel(source: SourceStatus): string {
  if (source === 'published') return 'Publicada'
  if (source === 'draft') return 'Esborrany'
  return 'Buita'
}

function getInitialGuideId(rows: CoverageRow[]): string {
  const firstPending = rows.find(row => !row.publishedCompleteAllLangs)
  if (firstPending) return firstPending.guideId
  return rows[0]?.guideId ?? ''
}

export function EditorialCenter() {
  const { toast } = useToast()
  const [isMounted, setIsMounted] = React.useState(false)
  const [isLoadingCoverage, setIsLoadingCoverage] = React.useState(false)
  const [coverageRows, setCoverageRows] = React.useState<CoverageRow[]>([])
  const [selectedGuideId, setSelectedGuideId] = React.useState<string>('')
  const [activeLang, setActiveLang] = React.useState<Lang>('ca')
  const [sourceByLang, setSourceByLang] = React.useState<Record<Lang, SourceStatus>>({
    ca: 'empty',
    es: 'empty',
    fr: 'empty',
    pt: 'empty',
  })
  const [formByLang, setFormByLang] = React.useState<Record<Lang, SimpleGuideForm>>({
    ca: emptyForm(),
    es: emptyForm(),
    fr: emptyForm(),
    pt: emptyForm(),
  })
  const [isLoadingDraft, setIsLoadingDraft] = React.useState(false)
  const [isSavingDraft, setIsSavingDraft] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)
  const [dictationField, setDictationField] = React.useState<string | null>(null)

  const publishedRows = React.useMemo(
    () => coverageRows.filter(row => row.publishedCompleteAllLangs),
    [coverageRows]
  )
  const pendingRows = React.useMemo(
    () => coverageRows.filter(row => !row.publishedCompleteAllLangs),
    [coverageRows]
  )

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
        throw new Error(data.error || 'No s ha pogut carregar guies')
      }

      setCoverageRows(data.rows)
      if (!selectedGuideId && data.rows.length > 0) {
        setSelectedGuideId(getInitialGuideId(data.rows))
      }
    } catch (error) {
      console.error('[EditorialCenter] coverage error:', error)
      toast({
        variant: 'destructive',
        title: 'Error carregant guies',
        description: (error as Error).message || 'No s ha pogut carregar',
      })
    } finally {
      setIsLoadingCoverage(false)
    }
  }, [getToken, selectedGuideId, toast])

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
          throw new Error((data as { error?: string }).error || 'No s ha pogut carregar la guia')
        }

        setSourceByLang(data.sourceByLang)
        setFormByLang({
          ca: toSimpleFormPatch('ca', data.patchByLang.ca),
          es: toSimpleFormPatch('es', data.patchByLang.es),
          fr: toSimpleFormPatch('fr', data.patchByLang.fr),
          pt: toSimpleFormPatch('pt', data.patchByLang.pt),
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
  }, [isMounted, loadCoverage])

  React.useEffect(() => {
    if (!isMounted || !selectedGuideId) return
    loadDraft(selectedGuideId)
  }, [isMounted, selectedGuideId, loadDraft])

  const updateFormField = React.useCallback((lang: Lang, field: SimpleGuideField, value: string) => {
    setFormByLang(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }))
  }, [])

  const handleCreateNewGuide = React.useCallback(() => {
    if (pendingRows.length === 0) {
      toast({
        title: 'No hi ha guies noves pendents',
        description: 'Pots editar una guia publicada des del llistat de sota.',
      })
      if (coverageRows.length > 0) {
        setSelectedGuideId(coverageRows[0].guideId)
      }
      return
    }

    setActiveLang('ca')
    setSelectedGuideId(pendingRows[0].guideId)
  }, [coverageRows, pendingRows, toast])

  const handleSaveDraft = React.useCallback(async () => {
    if (!selectedGuideId) return
    setIsSavingDraft(true)
    try {
      const idToken = await getToken()
      const payload = {
        guideId: selectedGuideId,
        patchByLang: {
          ca: toDraftPayload(formByLang.ca),
          es: toDraftPayload(formByLang.es),
          fr: toDraftPayload(formByLang.fr),
          pt: toDraftPayload(formByLang.pt),
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
        throw new Error(data.error || 'No s ha pogut guardar')
      }

      toast({
        title: 'Esborrany guardat',
        description: 'La guia ha quedat guardada i encara no està publicada.',
      })

      await Promise.all([loadCoverage(), loadDraft(selectedGuideId)])
    } catch (error) {
      console.error('[EditorialCenter] save draft error:', error)
      toast({
        variant: 'destructive',
        title: 'Error guardant',
        description: (error as Error).message || 'No s ha pogut guardar',
      })
    } finally {
      setIsSavingDraft(false)
    }
  }, [formByLang, getToken, loadCoverage, loadDraft, selectedGuideId, toast])

  const handlePublish = React.useCallback(async () => {
    if (!selectedGuideId) return
    setIsPublishing(true)
    try {
      const idToken = await getToken()
      const payload = {
        guideId: selectedGuideId,
        patchByLang: {
          ca: toPublishPayload('ca', formByLang.ca),
          es: toPublishPayload('es', formByLang.es),
          fr: toPublishPayload('fr', formByLang.fr),
          pt: toPublishPayload('pt', formByLang.pt),
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
          throw new Error(data.errors.slice(0, 2).map((error: { field: string; message: string }) => `${error.field}: ${error.message}`).join(' | '))
        }
        throw new Error(data.message || 'No s ha pogut publicar')
      }

      toast({
        title: 'Guia publicada',
        description: `La guia ${selectedGuideId} ja està activa a l'app i al bot.`,
      })

      await Promise.all([loadCoverage(), loadDraft(selectedGuideId)])
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
  }, [formByLang, getToken, loadCoverage, loadDraft, selectedGuideId, toast])

  const getSpeechCtor = (): SpeechRecognitionCtor | null => {
    if (typeof window === 'undefined') return null
    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
  }

  const handleToggleDictation = React.useCallback((lang: Lang, field: SimpleGuideField) => {
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
        const separator = current.trim() ? (field === 'steps' ? '\n' : ' ') : ''
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

  if (!isMounted) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Guies
          </CardTitle>
          <CardDescription>
            Crea o actualitza guies de forma simple. Quan publiques, els canvis passen a la secció de guies, a les ajudes (icona ?) i al bot.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button onClick={handleCreateNewGuide} disabled={isLoadingCoverage || isLoadingDraft || isSavingDraft || isPublishing}>
            Afegir nova guia
          </Button>
          <Button variant="outline" onClick={loadCoverage} disabled={isLoadingCoverage || isLoadingDraft || isSavingDraft || isPublishing}>
            {(isLoadingCoverage || isLoadingDraft) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Actualitzar llistat
          </Button>
          {selectedGuideId && (
            <span className="text-sm text-muted-foreground">Guia oberta: <strong>{selectedGuideId}</strong></span>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guies pendents</CardTitle>
            <CardDescription>Guies que encara no estan completes i publicades en tots els idiomes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[280px] overflow-auto">
            {pendingRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hi ha guies pendents.</p>
            ) : (
              pendingRows.map(row => (
                <div key={row.guideId} className="flex items-center justify-between gap-2 rounded border p-2">
                  <div>
                    <p className="text-sm font-medium">{row.guideId}</p>
                    <p className="text-xs text-muted-foreground">{row.domain}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedGuideId(row.guideId); setActiveLang('ca') }}>
                    Obrir
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guies publicades</CardTitle>
            <CardDescription>Llistat de guies ja publicades. Pots editar qualsevol guia i tornar-la a publicar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[280px] overflow-auto">
            {publishedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Encara no hi ha guies publicades.</p>
            ) : (
              publishedRows.map(row => (
                <div key={row.guideId} className="flex items-center justify-between gap-2 rounded border p-2">
                  <div>
                    <p className="text-sm font-medium">{row.guideId}</p>
                    <p className="text-xs text-muted-foreground">{row.domain}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedGuideId(row.guideId); setActiveLang('ca') }}>
                    Editar
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editor guiat</CardTitle>
          <CardDescription>Omple cada idioma amb 3 camps: titol, mini-intro i pas a pas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedGuideId ? (
            <p className="text-sm text-muted-foreground">Selecciona una guia del llistat o fes clic a <strong>Afegir nova guia</strong>.</p>
          ) : (
            <>
              <Tabs value={activeLang} onValueChange={(value) => setActiveLang(value as Lang)}>
                <TabsList className="grid grid-cols-4 w-full">
                  {LANGS.map(lang => (
                    <TabsTrigger key={lang.id} value={lang.id}>
                      {lang.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {LANGS.map(lang => (
                  <TabsContent key={lang.id} value={lang.id} className="space-y-3 pt-3">
                    <p className="text-xs text-muted-foreground">Estat actual: {sourceLabel(sourceByLang[lang.id])}</p>

                    <FieldWithMic
                      label="Títol"
                      value={formByLang[lang.id].title}
                      onChange={value => updateFormField(lang.id, 'title', value)}
                      onMic={() => handleToggleDictation(lang.id, 'title')}
                      recording={dictationField === `${lang.id}.title`}
                    />

                    <FieldWithMic
                      label="Mini-intro (explica-ho com ho diries a un client)"
                      value={formByLang[lang.id].intro}
                      onChange={value => updateFormField(lang.id, 'intro', value)}
                      onMic={() => handleToggleDictation(lang.id, 'intro')}
                      recording={dictationField === `${lang.id}.intro`}
                      multiline
                    />

                    <FieldWithMic
                      label="Pas a pas (1 línia = 1 pas)"
                      value={formByLang[lang.id].steps}
                      onChange={value => updateFormField(lang.id, 'steps', value)}
                      onMic={() => handleToggleDictation(lang.id, 'steps')}
                      recording={dictationField === `${lang.id}.steps`}
                      multiline
                    />

                    <div className="space-y-1">
                      <Label className="text-sm">Final (fix i empàtic)</Label>
                      <Textarea value={FIXED_ENDING[lang.id]} readOnly rows={2} />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft || isPublishing || isLoadingDraft || !selectedGuideId}>
                  {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Esborrany
                </Button>
                <Button onClick={handlePublish} disabled={isPublishing || isSavingDraft || isLoadingDraft || !selectedGuideId}>
                  {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publicar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
