'use client'

import * as React from 'react'
import { useFirebase } from '@/firebase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Copy, Languages, LayoutTemplate, Loader2, PanelsTopLeft, Sparkles, Video } from 'lucide-react'

type VideoStudioSummary = {
  interfaceRecommendation: {
    primary: string
    reason: string
  }
  telegramRecommendation: {
    recommended: boolean
    reason: string
  }
  brands: Array<{
    id: string
    name: string
    defaultLocales: string[]
    captionStyle: string
    doodlesCount: number
  }>
  presets: Array<{
    id: string
    label: string
    surfaces: string[]
    aspectRatio: string
    minDurationSeconds: number | null
    maxDurationSeconds: number | null
    captionsMode: string
    includeIntro: boolean
    includeOutro: boolean
    goal: string
  }>
  projects: Array<{
    slug: string
    title: string
    brand: string
    preset: string
    status: string
    objective: string
    audience: string
    locales: string[]
    targets: Array<{ surface: string; locale: string }>
    workflow: {
      hasBaseVideo: boolean
      canRender: boolean
      rendered: boolean
      canPublish: boolean
      published: boolean
    }
    nextAction: {
      label: string
      reason: string
      codexPrompt: string
    }
    diagnostics: Array<{
      level: 'ok' | 'warn' | 'error'
      message: string
    }>
    paths: {
      projectFile: string
      inputPath: string | null
      artifactDir: string | null
      publicDir: string | null
      posterPath: string | null
    }
    timestamps: {
      lastRenderedAt: string | null
      lastPublishedAt: string | null
    }
    publishedVariants: string[]
  }>
  starterPrompts: Array<{
    id: string
    title: string
    prompt: string
  }>
  paths: {
    foundationDoc: string
    nonTechnicalGuide: string
    studioRoot: string
  }
}

function formatDuration(minSeconds: number | null, maxSeconds: number | null): string {
  if (minSeconds == null && maxSeconds == null) return 'Flexible'
  if (minSeconds != null && maxSeconds != null) return `${minSeconds}-${maxSeconds}s`
  if (minSeconds != null) return `${minSeconds}s+`
  return `fins ${maxSeconds}s`
}

function formatProjectStatus(status: string): string {
  if (status === 'published') return 'Publicat'
  if (status === 'rendered') return 'Renderitzat'
  if (status === 'ready') return 'Preparat'
  if (status === 'draft') return 'Draft'
  return status
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'published') return 'default'
  if (status === 'rendered' || status === 'ready') return 'secondary'
  return 'outline'
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Encara no'

  try {
    return new Intl.DateTimeFormat('ca-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function getDiagnosticTone(level: 'ok' | 'warn' | 'error'): string {
  if (level === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (level === 'error') return 'border-red-200 bg-red-50 text-red-800'
  return 'border-amber-200 bg-amber-50 text-amber-900'
}

function WorkflowPill({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${done ? 'border-emerald-200 bg-emerald-50' : 'bg-muted/30'}`}>
      <p className="font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{done ? 'A punt' : 'Pendent'}</p>
    </div>
  )
}

export function VideoStudioCenter() {
  const { user } = useFirebase()
  const { toast } = useToast()
  const [summary, setSummary] = React.useState<VideoStudioSummary | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!user) return

    let active = true

    const loadSummary = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const idToken = await user.getIdToken()
        const response = await fetch('/api/admin/video-studio/summary', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        const data = await response.json()
        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'No s ha pogut carregar Video Studio')
        }

        if (!active) return
        setSummary(data.summary)
      } catch (loadError) {
        if (!active) return
        setError((loadError as Error).message)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      active = false
    }
  }, [user])

  const handleCopy = React.useCallback(
    async (text: string, title: string) => {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copiat',
        description: `S ha copiat ${title.toLowerCase()} al porta-retalls.`,
      })
    },
    [toast]
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregant Video Studio...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
      </Card>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4" />
              Entrada recomanada
            </CardTitle>
            <CardDescription>La manera mes clara de treballar-hi ara mateix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge>{summary.interfaceRecommendation.primary}</Badge>
            </div>
            <p className="text-muted-foreground">{summary.interfaceRecommendation.reason}</p>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-medium">Per a tu, la logica bona es aquesta:</p>
              <ol className="mt-2 space-y-1 text-muted-foreground">
                <li>1. Trio objectiu: landing, home o xarxes.</li>
                <li>2. Reviso quin projecte ja existeix o en copio un prompt base.</li>
                <li>3. Li demano a Codex el seguent pas, sense pensar en scripts ni render.</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Telegram i Octavi
            </CardTitle>
            <CardDescription>El criteri actual del sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant="secondary">
              {summary.telegramRecommendation.recommended ? 'Recomanat' : 'No recomanat ara'}
            </Badge>
            <p className="text-muted-foreground">{summary.telegramRecommendation.reason}</p>
            <p className="text-muted-foreground">
              Si hi anem algun dia, hauria de ser com a capa final, no com a motor principal.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="h-4 w-4" />
              Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.presets.length}</p>
            <p className="text-sm text-muted-foreground">Formats reutilitzables disponibles.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-4 w-4" />
              Marques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.brands.length}</p>
            <p className="text-sm text-muted-foreground">Summa es la primera marca preparada.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PanelsTopLeft className="h-4 w-4" />
              Projectes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.projects.length}</p>
            <p className="text-sm text-muted-foreground">Peces amb seguiment i estat real.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompts rapids</CardTitle>
          <CardDescription>Aixo es el que hauries de poder demanar sense pensar en scripts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.starterPrompts.map((prompt) => (
            <div key={prompt.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="font-medium">{prompt.title}</p>
                  <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{prompt.prompt}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCopy(prompt.prompt, prompt.title)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar prompt
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projectes operables</CardTitle>
          <CardDescription>El sistema t ha de dir que tenim, que falta i que m has de demanar a continuacio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.projects.length > 0 ? (
            summary.projects.map((project) => (
              <div key={project.slug} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{project.title}</p>
                      <Badge variant={getStatusVariant(project.status)}>{formatProjectStatus(project.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {project.objective || 'Cal definir millor el relat comercial o funcional d aquesta peça.'}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{project.brand}</Badge>
                      <Badge variant="outline">{project.preset}</Badge>
                      <Badge variant="outline">idiomes: {project.locales.join(', ') || 'ca'}</Badge>
                      <Badge variant="outline">
                        destins: {project.targets.map((target) => `${target.surface}-${target.locale}`).join(', ') || 'sense desti'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleCopy(project.nextAction.codexPrompt, `prompt de ${project.title}`)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar prompt per Codex
                    </Button>
                    {project.paths.publicDir ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(project.paths.publicDir ?? '', `ruta publica de ${project.title}`)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar ruta publica
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <WorkflowPill label="Base gravada" done={project.workflow.hasBaseVideo} />
                  <WorkflowPill label="Render final" done={project.workflow.rendered} />
                  <WorkflowPill label="Publicat web" done={project.workflow.published} />
                </div>

                <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seguent pas recomanat</p>
                  <p className="mt-2 font-medium">{project.nextAction.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{project.nextAction.reason}</p>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2 rounded-lg border p-3 text-sm">
                    <p className="font-medium">Estat del projecte</p>
                    <p className="text-muted-foreground">Audience: {project.audience}</p>
                    <p className="text-muted-foreground">Fitxer: <code>{project.paths.projectFile}</code></p>
                    <p className="text-muted-foreground">Video base: <code>{project.paths.inputPath ?? 'pendent'}</code></p>
                    <p className="text-muted-foreground">Artefactes: <code>{project.paths.artifactDir ?? 'pendent'}</code></p>
                    <p className="text-muted-foreground">Publicacio: <code>{project.paths.publicDir ?? 'pendent'}</code></p>
                    <p className="text-muted-foreground">Poster: <code>{project.paths.posterPath ?? 'pendent'}</code></p>
                    <p className="text-muted-foreground">Ultim render: {formatDateTime(project.timestamps.lastRenderedAt)}</p>
                    <p className="text-muted-foreground">Ultima publicacio: {formatDateTime(project.timestamps.lastPublishedAt)}</p>
                    <p className="text-muted-foreground">
                      Variants publicades: {project.publishedVariants.length > 0 ? project.publishedVariants.join(', ') : 'cap encara'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-sm">Diagnosi rapida</p>
                    {project.diagnostics.map((diagnostic, index) => (
                      <div key={`${project.slug}-${index}`} className={`rounded-lg border p-3 text-sm ${getDiagnosticTone(diagnostic.level)}`}>
                        {diagnostic.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Encara no hi ha projectes creats.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presets disponibles</CardTitle>
            <CardDescription>Tipus de peça que ja podem tractar com a producte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.presets.map((preset) => (
              <div key={preset.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{preset.label}</p>
                  <Badge variant="outline">{preset.aspectRatio}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{preset.goal}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDuration(preset.minDurationSeconds, preset.maxDurationSeconds)} · {preset.captionsMode} ·
                  superficies: {preset.surfaces.join(', ')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Base del sistema</CardTitle>
            <CardDescription>Referencies internes per continuar creixent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Document fundacional: <code>{summary.paths.foundationDoc}</code></p>
            <p>Guia no tecnica: <code>{summary.paths.nonTechnicalGuide}</code></p>
            <p>Arrel de configuracio: <code>{summary.paths.studioRoot}</code></p>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              {summary.brands.map((brand) => (
                <div key={brand.id}>
                  <p className="font-medium text-foreground">{brand.name}</p>
                  <p>Idiomes: {brand.defaultLocales.join(', ')} · captions: {brand.captionStyle} · doodles: {brand.doodlesCount}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
