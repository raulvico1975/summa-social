# Copilot Onboarding Premium Rollout

## Objectiu de negoci

Reduir la carrega cognitiva dels usuaris nous en el primer moment de valor de Summa Social: arribar a la vista de remeses i identificar el boto clau per generar la primera remesa.

Aquest copilot no substitueix el bot de suport ni introdueix un flux funcional nou. Actua com a ajuda contextual acotada per accelerar el primer `aha moment` sense tocar dades ni automatitzar operacions.

## Abast tecnic actual

L'estat actual del pilot queda limitat a la sandbox de `/live` i al cas d'us `primera remesa`.

Peces actuals:
- `src/app/api/copilot/route.ts`
  Responsabilitat: function calling amb `Maps` i `highlight_element`, ruta blanca de navegacio, validacio d'elements visibles i contingencia estricta.
- `src/components/copilot/OnboardingPill.tsx`
  Responsabilitat: input compacte, loading curt, encadenament post-navegacio, spotlight visual, minimitzacio i telemetria.
- `src/lib/copilot/use-copilot-observer.ts`
  Responsabilitat: exposar `currentRoute` i `visibleActions` del DOM sense rerenders innecessaris.
- `src/components/copilot/LiveCopilotSandbox.tsx`
  Responsabilitat: entorn controlat amb les dues vistes del happy path (`donants` i `remeses`).
- `src/lib/copilot/track-copilot-event.ts`
  Responsabilitat: facade de telemetria cap a `trackUX`.

Comportament validat localment:
- des de `donants`, el missatge `Vull generar la remesa` navega a `remeses`
- en arribar a `remeses`, el copilot continua sol i il.lumina `Generar remesa`
- el clic al boto ressaltat registra `copilot_goal_achieved`
- una peticio fora del happy path retorna `Aquesta opcio no esta disponible aqui.`

## Fases de rollout

### Fase 1: sandbox premium certificada

Objectiu:
- tancar la sandbox com a referencia estable del comportament premium

Abast:
- mantenir `/live?onboarding=true`
- certificar happy path, contingencia i telemetria
- zero integracio amb el bot de suport

Sortida:
- pilot local validat amb evidencies de navegador i build verd

### Fase 2: muntatge controlat a onboarding real

Objectiu:
- injectar la pill en un punt real d'onboarding sense tocar el layout global

Abast:
- muntatge exclusiu sobre la pantalla real acordada
- gating per usuari nou / cohort controlada
- mateix abast funcional: navegar a remeses i ressaltar el boto persistent

Sortida:
- experiment real amb trafic limitat i risc baix

### Fase 3: feature flag i embut de conversio

Objectiu:
- mesurar si el copilot redueix friccio i accelera el primer flux

Abast:
- activacio per flag
- embut minim:
  - `copilot_interaction_started`
  - `copilot_action_executed`
  - `copilot_goal_achieved`

Sortida:
- dades suficients per decidir si escalar o aturar

### Fase 4: expansio navegacional controlada

Objectiu:
- obrir un segon cas d'us si la primera remesa demostra valor

Abast:
- nomes intents navegacionals o de localitzacio visual
- cap suport fiscal, legal o procedimental
- mateix patró: eines limitades, contingencia curta, sense text llarg

Sortida:
- una capa frontal de guia contextual, encara separada del bot KB

## Riscos principals

### 1. Coll d'ampolla de UX

Si el loading, la minimitzacio o el spotlight semblen eines de debug, el valor del copilot cau encara que la logica sigui correcta.

Mitigacio:
- loading immediat
- spotlight subtil
- missatges curts
- desaparicio rapida despres de l'accio

### 2. Guardrails massa tous o massa estrictes

Si son tous, el copilot inventa UI. Si son massa estrictes, bloquegen el happy path.

Mitigacio:
- `Maps` validat contra rutes blanques
- `highlight_element` validat contra `visibleActions`
- fallback deterministic per al cas principal

### 3. Integracio prematura en pantalles reals

Portar-lo massa aviat a la UI real podria afegir soroll a usuaris veterans o interferir amb fluxos sensibles.

Mitigacio:
- muntatge localitzat
- feature flag
- zero integracio al layout global

### 4. Confusio de responsabilitats amb el bot de suport

El copilot contextual no ha d'entrar a respondre processos, fiscalitat o criteri legal.

Mitigacio:
- limitacio funcional estricta a `Maps` i `highlight_element`
- no connectar-lo encara a la KB

## Criteris de validacio

El rollout nomes pot avancar si es mantenen aquests punts:
- la UI no queda bloquejada i l'input respon de forma immediata
- el happy path `donants -> remeses -> Generar remesa` funciona sense reconfigurar la pantalla manualment
- el spotlight es veu clarament i es retira sol
- el clic al boto real registrat tanca l'embut de telemetria
- el missatge de contingencia surt exactament igual quan l'accio no es pot executar
- cap intent fora de rutes o elements permesos provoca accions falses

## Decisio recomanada

No ampliar el copilot a mes funcionalitats.

El pas correcte es:
1. consolidar aquesta experiencia premium per a `primera remesa`
2. muntar-la detras d'un flag en onboarding real
3. mesurar si accelera el primer valor percebut
4. decidir expansio nomes amb evidencia d'us
