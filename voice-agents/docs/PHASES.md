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

Validar un `web-agent` public que qualifiqui o desqualifiqui l'encaix de Summa millor que un formulari o xat generic.

### Valor per Summa

Demostra si una conversa guiada en text amb `rich UI` ajuda a filtrar millor, amb menys friccio i sense vendre fum.

### Scope

- contracte JSON estricte del `web-agent`
- components minims de `rich UI`
- estat de qualificacio explicit
- desqualificacio assertiva fora de l'ICP
- sortida clara d'encaix i seguent pas
- backend Python minim separat del client
- client Next minim que consumeix el backend directament

### Fora de scope

- veu
- Gemini Live
- WebRTC
- integracio al suport
- automatitzacio de demo guiada
- demo-agent
- support-agent

### Evidencia minima

- el model retorna JSON valid de manera estable
- el flux no sembla un interrogatori
- la conversa arriba a `good_fit`, `uncertain_fit` o `low_fit`
- la desqualificacio no intenta salvar leads fora de scope

### Implementacio activa al worktree

- `voice-agents/contracts/` defineix request i response
- `voice-agents/server/bot.py` exposa `POST /api/web-agent`
- `voice-agents/client/app/page.tsx` renderitza la conversa text-first
- el pilot no toca cap ruta ni runtime de l'app principal

### Prova manual reproduible

1. Des del worktree, copia les variables locals:
   `cp voice-agents/client/.env.example voice-agents/client/.env.local`
2. Arrenca el backend:
   `cd voice-agents/server && python3 bot.py`
3. En una altra terminal, arrenca el client:
   `cd voice-agents/client && npm install && npm run dev -- --hostname 127.0.0.1 --port 3001`
4. Comprova salut del backend:
   `curl http://127.0.0.1:8787/health`
5. Obre `http://127.0.0.1:3001/`.
6. Casos provats en aquesta iteracio:
   - API text-first: `Som una associacio petita amb moltes quotes i molta feina manual amb el banc.`
   - resultat validat: `fit_assessment = uncertain_fit`, `recommended_next_step = show_value`, `FeatureCard` visible i `next_question = Quantes persones toqueu aquest flux en el dia a dia?`
   - navegador, cas de desqualificacio: `Necessitem un ERP complet amb comptabilitat formal, nomines i gestio de voluntariat.`
   - resultat validat: `fit_assessment = low_fit`, `recommended_next_step = disqualify` i `QualificationSummaryCard` amb motiu d'exclusio
7. Verifica aquests punts:
   - el client mostra la primera pregunta del diagnostic sense intervenir
   - apareix un `ChoiceSelector` usable
   - quan es detecta un dolor alineat, pot apareixer una peca de valor abans de la seguent pregunta
   - en clicar una opcio, la conversa avanca i els senyals recollits es refresquen
   - el resultat final mostra `uncertain_fit` o `low_fit` segons el cas provat
   - el backend retorna JSON valid a `POST /api/web-agent`

### Go / No-Go

- `GO` si qualifica millor que un xat generic i sense friccio extra
- `HOLD` si la idea es bona pero la UI encara no ajuda prou
- `NO-GO` si el model no manté context o no respecta l'schema

## Nota de tall

## Fase 2 - Demo-Agent Live

### Objectiu

Validar una guia de veu en temps real que pugui entendre la pantalla actual d'una demo i ajudar a navegar-la sense refactoritzar l'app principal.

### Valor per Summa

Permet comprovar si una demo guiada oralment redueix friccio i estalvia temps al Raül en demos repetitives de tresoreria, remeses i donants.

### Scope

- backend Live separat a `voice-agents/server/demo_bot.py`
- Daily WebRTC per a audio bidireccional
- Gemini Live per a resposta de veu i function calling
- context DOM enviat de manera silenciosa des de `/live`
- dues tools nomes: `highlight_element` i `Maps_to`
- sandbox falsa a `/live` amb pantalles de remeses i donants

### Fora de scope

- integracio al core de Summa
- suport operatiu real
- desplegament
- refactor global de frontend

### Evidencia minima

- la ruta `/live` arrenca i es connecta a una sessio Daily
- el client envia context `data-ai-*` al backend Live
- l'agent pot destacar un boto o navegar entre pantalles de la demo

### Validacio esperada

- `python3 -m py_compile voice-agents/server/demo_bot.py`
- `npm run typecheck`
- `npm run build`
- `GET /health` del backend Live

## Nota de tall

Aquest worktree manté Fase 1 i Fase 2 aillades. El `web-agent` i el `demo-agent` viuen separats i no toquen el core de Summa.
