# Explainer Edit Grammar

## Role

Reusable grammar for Summa Social explainer edits.

This grammar defines how a proof-backed master becomes a guided demo cut:
one claim per beat, one proof target per beat, and no ornamental scenes that do
not advance understanding.

## What this grammar is for

- functional explainers that need to feel clear at normal playback speed
- editorial cuts that tighten an approved proof master without changing its story
- future product videos for Stripe, conciliation, partners, and other operational flows
- brief-to-edit pipelines where the story must remain traceable to real UI proof

## What this grammar is not for

- campaign films
- abstract motion pieces
- poster-like explainers that trade clarity for atmosphere
- edits that invent proof or expand the scope of the approved master

## Core rule

Each beat must carry exactly one of each:

- one claim
- one proof target
- one visible action or state change

If a beat cannot be described that way, it should be split or removed.

## Beat grammar

Use this pattern to describe any explainer edit:

`beat = claim + proof_target + screen_action + editorial_motion + copy_budget`

### Claim

The single thing the viewer should understand from the beat.

Allowed forms:

- what changed
- what the product is doing
- what the user can verify
- what the result means

Constraints:

- one claim only
- no stacked benefits
- no claim that needs a second beat to make sense

### Proof target

The exact UI element or captured state that proves the claim.

Allowed forms:

- one control
- one row
- one field
- one status
- one result panel
- one alert or validation state

Constraints:

- one proof target only
- the proof target must be visible without guessing
- the proof target must come from the approved master or capture set

### Screen action

The user-facing action or product state shown in the beat.

Allowed forms:

- select
- upload
- validate
- compare
- confirm
- settle
- review
- resolve

Constraints:

- one action only
- no action montage inside a single beat
- the action must support the claim, not replace it

### Editorial motion

The minimum motion needed to direct attention.

Allowed forms:

- reframing
- crop
- small zoom
- highlight
- reveal
- timing cut

Constraints:

- motion must point at the proof target
- motion cannot become the story
- no decorative cycles
- no repeated emphasis on the same beat
- no bounding boxes or hard contour overlays around UI elements
- keep the text block outside the capture safe area with visible breathing room

### Copy budget

The amount of text allowed on screen for the beat.

Allowed forms:

- one line headline
- short operational subline
- micro-label only when it removes ambiguity

Constraints:

- no paragraph blocks
- no stacked slogans
- no generic filler
- copy must echo the proof, not restate the brand

## Beat types

Use these beat types to assemble a reusable edit:

- hook beat: states the operational promise or problem
- proof beat: shows the exact UI state that proves the claim
- transition beat: carries the viewer from one proof state to the next without adding a new claim
- outcome beat: lands the result or resolved state

Every edit should be assembled from these types, in that order or a close variant.

## Canonical beat sequence

For most functional explainers, use this sequence:

1. hook
2. setup
3. proof
4. consequence
5. outcome

The names can change, but the logic should not:

- introduce the workflow
- show the product state
- verify the claim
- show why it matters
- end on the resolved state or next action

## Edit rules

- preserve the proof chain from the approved master
- keep one main idea per beat
- keep one proof target per beat
- remove any beat that depends on ornamental motion to make sense
- keep the first meaningful claim visible early
- tighten pacing only if the proof remains readable
- use zooms and highlights as attention tools, not as a substitute for proof
- keep copy sparse when the UI already explains the step

## Rejection conditions

An explainer edit fails this grammar if any beat:

- contains more than one claim
- contains more than one proof target
- introduces a new workflow step
- uses motion to cover weak evidence
- reads like a general promo beat instead of a guided demo beat
- depends on decorative visuals to feel complete
- cannot be traced back to the approved brief and capture set

## Hand-off contract

The brief must supply the claims.
The capture set must supply the proof targets.
The edit must only rearrange, tighten, and clarify what those sources already justify.
