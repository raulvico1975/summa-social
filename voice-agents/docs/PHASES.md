# Phases

Cada fase requereix validacio previa i tancament formal del `product-director-agent`.

## Fase 0 - Govern i Scaffold

### Objectiu

Deixar el pilot aillat, documentat i preparat per executar-se sense tocar el core de Summa.

### Valor per Summa

Evita invertir en una via tecnica sense criteri ni govern. No aporta valor d'usuari final encara, pero evita deriva i rework.

### Entregables

- estructura `voice-agents/`
- client i server separats
- arquitectura documentada
- govern de producte i fases aprovades
- definicio d'agents i guardrails

### Go / No-Go

- `GO` si el pilot queda totalment encapsulat
- `NO-GO` si per arrancar ja necessita tocar build, deploy o rutes principals

## Fase 1 - Web-Agent Text-First

### Objectiu

Validar un `web-agent` public que diagnostiqui l'encaix de Summa millor que un formulari o xat generic.

### Valor per Summa

Demostra si una conversa guiada en text amb `rich UI` ajuda a qualificar millor i amb menys friccio.

### Scope

- contracte JSON estricte del `web-agent`
- components minims de `rich UI`
- estat de qualificacio explicit
- sortida clara d'encaix i seguent pas
- eval de qualitat sobre converses representatives
- backend Python minim separat del client
- client Next minim que consumeix el backend directament

### Fora de scope

- veu
- Gemini Live
- integracio al suport
- automatitzacio de demo guiada

### Evidencia minima

- el model retorna JSON valid de manera estable
- el flux no sembla un interrogatori
- la conversa arriba a `bon encaix`, `encaix parcial` o `poc encaix`

### Implementacio activa al worktree

- `voice-agents/contracts/` defineix request i response
- `voice-agents/server/app.py` exposa `POST /api/web-agent`
- `voice-agents/client/app/page.tsx` renderitza la conversa text-first
- el pilot no toca cap ruta ni runtime de l'app principal

### Prova manual reproduible

1. Des del worktree, copia les variables locals:
   `cp voice-agents/client/.env.example voice-agents/client/.env.local`
2. Arrenca el backend:
   `cd voice-agents/server && python3 app.py`
3. En una altra terminal, arrenca el client:
   `cd voice-agents/client && npm install && npm run dev -- --hostname 127.0.0.1 --port 3001`
4. Comprova salut del backend:
   `curl http://127.0.0.1:8787/health`
5. Obre `http://127.0.0.1:3001/`.
6. Verifica aquests punts:
   - el client mostra la primera pregunta del diagnostic sense intervenir
   - apareix un `ChoiceSelector` usable
   - en clicar una opcio, la conversa avanca i els senyals recollits es refresquen
   - el backend retorna JSON valid a `POST /api/web-agent`

### Go / No-Go

- `GO` si qualifica millor que un xat generic i sense friccio extra
- `HOLD` si la idea es bona pero la UI encara no ajuda prou
- `NO-GO` si el model no manté context o no respecta l'schema

## Nota de tall

Aquest worktree es tanca amb Fase 1. No hi ha preparacio de Fase 2 ni documentacio executable de fases posteriors dins aquest lliurament.
