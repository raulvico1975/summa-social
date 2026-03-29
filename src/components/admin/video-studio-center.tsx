'use client'

import * as React from 'react'
import { useFirebase } from '@/firebase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Copy, LayoutTemplate, Languages, Loader2, PanelsTopLeft, Sparkles, Video } from 'lucide-react'

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
    locales: string[]
    targets: Array<{ surface: string; locale: string }>
  }>
  starterPrompts: Array<{
    id: string
    title: string
    prompt: string
  }>
  paths: {
    foundationDoc: string
    studioRoot: string
  }
}

function formatDuration(minSeconds: number | null, maxSeconds: number | null): string {
  if (minSeconds == null && maxSeconds == null) return 'Flexible'
  if (minSeconds != null && maxSeconds != null) return `${minSeconds}-${maxSeconds}s`
  if (minSeconds != null) return `${minSeconds}s+`
  return `fins ${maxSeconds}s`
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
              <p className="font-medium">Per a tu, la logica ha de ser aquesta:</p>
              <ol className="mt-2 space-y-1 text-muted-foreground">
                <li>1. Trio objectiu: landing, home o xarxes.</li>
                <li>2. Copio un prompt base.</li>
                <li>3. Demano la peça i el sistema resol la part tecnica.</li>
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
            <p className="text-sm text-muted-foreground">Drafts vius per executar o completar.</p>
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
                  superfícies: {preset.surfaces.join(', ')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marques i projectes</CardTitle>
            <CardDescription>Configuracio viva del sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {summary.brands.map((brand) => (
                <div key={brand.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{brand.name}</p>
                    <Badge>{brand.id}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    Idiomes: {brand.defaultLocales.join(', ')} · captions: {brand.captionStyle} · doodles: {brand.doodlesCount}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {summary.projects.length > 0 ? (
                summary.projects.map((project) => (
                  <div key={project.slug} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{project.title}</p>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {project.brand} · {project.preset} · idiomes: {project.locales.join(', ')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Encara no hi ha projectes creats.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base del sistema</CardTitle>
          <CardDescription>Referencies internes per continuar creixent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Document fundacional: <code>{summary.paths.foundationDoc}</code></p>
          <p>Arrel de configuracio: <code>{summary.paths.studioRoot}</code></p>
        </CardContent>
      </Card>
    </div>
  )
}
