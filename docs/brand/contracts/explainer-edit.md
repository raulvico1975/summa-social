# Explainer Edit Contract

## Purpose

`explainer-edit` is the editorial consumer layer for approved functional explainer masters.
Its job is to turn a proof-complete master into a more polished product-explainer cut without breaking the proof chain underneath it.

It is downstream of `functional-explainer` and downstream of `video-studio/functional-explainers`.
It can make the piece feel closer to a modern product video, but it cannot become a new source of truth.

## Relationship to the proof master

An explainer edit always starts from one approved, render-verified master.

The edit may:

- tighten pacing
- reframe or crop for emphasis
- add editorial zooms and highlights
- reduce copy density
- sharpen the opening hook or closing payoff

The edit may not:

- invent new product proof
- introduce a new workflow step
- change the core claim
- cover up weak evidence with motion
- outgrow the approved master into a different story

If the master is weak, the fix is to repair the master, not to over-edit it.

## Canonical shape

`approved proof master` -> `explainer edit` -> `derived distribution cuts`

That means:

- one explainer edit can produce multiple platform cuts
- every edit must remain traceable to one approved master
- distribution cuts may simplify or reframe the edit, but they may not rewrite the editorial intent

## Editorial goal

The edit should feel polished, intentional, and product-led.

It should:

- read like a modern product explainer, not a raw screen recording
- keep the operational tone intact
- make the benefit easier to see at normal playback speed
- preserve the real UI as the primary evidence

It should not:

- become ad-like
- become flashy for its own sake
- depend on abstract motion to carry the message

## Pacing

The edit must move faster than the proof master, but not so fast that the viewer loses the operational thread.

Rules:

- one idea per beat
- no filler shots
- keep the first meaningful claim visible early
- use rhythm changes to reinforce the story, not to decorate it
- if a shot does not advance understanding, remove it

Recommended pacing behavior:

- open quickly with the operational promise or problem
- spend the middle on proof and consequence
- close with the outcome or the next action

## Zoom and highlight usage

Zooms and highlights are allowed as editorial tools, not as the story itself.

Use them to:

- direct attention to one active control, field, row, badge, or metric
- isolate the exact result that matters
- re-establish context after a close detail shot

Use them sparingly:

- one primary focus target per scene
- avoid competing callouts
- avoid decorative zoom cycles
- avoid highlight layers that obscure the UI

If the viewer would have to guess what is being emphasized, the edit is too busy.

## Copy density

The copy budget is intentionally tight.

Rules:

- one dominant line per scene
- short supporting text only when it removes ambiguity
- avoid stacked text systems
- avoid paragraphs, caption walls, or repeated restatement of the same claim
- keep visible text aligned with the proof on screen

If the UI already explains the step, the copy should shrink, not expand.

## Scene jobs

Every scene must have one job.

Valid scene jobs are:

- hook the operational problem or promise
- establish the proof context
- focus attention on one important control or result
- connect two approved beats without adding a new claim
- land the outcome or benefit

Invalid scene behavior includes:

- trying to explain two steps in one beat
- switching topics mid-scene
- using a scene as a general-purpose spacer
- stacking proof, narration, and typography without a clear hierarchy

## Rejection triggers

An explainer edit is rejected if any of the following are true:

- it feels like a generic SaaS promo
- it changes the story that the approved master proved
- it hides weak proof behind motion
- it requires pausing to understand the scene
- it uses more than one attention target at a time without a clear hierarchy
- it adds copy that repeats what the UI already makes obvious
- it turns the edit into a different narrative from the master
- it obscures text or key UI states during playback
- it cannot be traced cleanly back to one approved master

## Governance

`functional-explainer` defines the proof contract.
`explainer-edit` defines the editorial consumer layer on top of that proof.

When they conflict, the proof contract wins.
