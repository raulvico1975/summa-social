# Summa OpenAI-Like Explainer Iteration Design

## Goal

Take the first `explainer-edit` cut from "readable and product-led" to "calm, premium, guided product explainer" while also turning the winning decisions into reusable system inputs for future Summa videos.

This is not a new channel and not a replacement for the canonical `functional-explainer` master path.
It is the next iteration of the editorial consumer layer on top of that master path.

## Problem

The current `06-importacio-extracte-editorial-16x9` piece is already more understandable than the earlier pilot, but it still falls short in three ways:

1. it still reads partially like a poster built around a capture, rather than a guided demo
2. its copy explains the flow, but does not always lead with the administrative pain or operational payoff
3. the system now has an edit proxy, but it still lacks stronger reusable grammar for future videos

If we stop here, every new feature video will still need too much manual taste and too much iteration.

## Outcome Required

At the end of this iteration, we need:

- one better `06` cut that feels closer to a premium product explainer
- a reusable editorial grammar for future explainers
- a reusable copy brief structure for one-feature videos
- a stable asset contract for downstream HyperFrames reframing

The goal is not to imitate OpenAI cosmetically.
The goal is to achieve the same level of clarity, pacing discipline, and product-first explanation for Summa’s own identity.

## Scope

### In scope

- `explainer-edit` refinement for `06-importacio-extracte-editorial-16x9`
- reusable editorial grammar for shot focus, copy budget, and scene jobs
- reusable brief/template inputs for future explainers
- manifest/runtime improvements that reduce future iteration
- human-style review against the intended persona

### Out of scope

- changing Summa core product flows
- building a multi-feature brand film
- adding voiceover, music, or narration system-wide
- adding new external dependencies
- merging to `main`

## Design Direction

The new cut should feel like a guided observation of the product.

That means:

- the product capture remains the hero
- the text becomes a sparse guide, not a second story
- each beat isolates one decision, state, or consequence
- framing changes should feel purposeful and quiet
- the administrative payoff should appear earlier and more concretely

The guiding tone is:

- calm
- procedural
- trustworthy
- premium through clarity, not through decoration

## Target Shape

The piece should move from:

`headline + large frame + summary copy`

toward:

`single claim -> focused proof -> next consequence`

This does not require a dark theme, flashy motion, or aggressive typography.
It requires:

- less poster layout
- more local focus on active UI
- shorter claims
- cleaner relationship between what is said and what is shown

## System Changes Required

### 1. Editorial grammar

Create a small, reusable editorial grammar for `explainer-edit`:

- one claim per beat
- one proof target per beat
- one consequence or payoff per beat
- explicit scene types such as:
  - entry
  - confirm
  - review
  - alert
  - result

This grammar should be reusable by later videos such as Stripe, conciliation, or donor flows.

### 2. Brief template

The next explainers should not start from a free-form prompt alone.

We need a short structured brief that captures:

- user problem in administrative terms
- operational promise
- proof target by beat
- claim wording candidates
- what the viewer should understand after each beat

### 3. Asset contract

The proxy step is now correct, but future explainers need a clearer asset contract:

- source capture
- edit proxy
- edit asset metadata
- approved still captures if used

This should remain downstream of the canonical recording output and must stay untracked.

## Acceptance Criteria

The new iteration is acceptable only if all of the following are true:

- the new `06` cut is more product-led than the current version
- the copy is shorter and more operational
- each beat has a single visual target
- the UI remains readable during reframing
- the edit proxy remains the consumed video source for HyperFrames
- the reusable grammar is documented for future videos
- a future feature team could create the next explainer with less guesswork than today

## Review Criteria

The primary review lens remains the same:

someone responsible for administration, bank imports, members, receipts, or reconciliation inside a Catalan social entity must be able to understand:

- what problem is being solved
- what step is being protected
- what risk is being prevented
- why Summa is safer or clearer than manual handling

If the piece looks elegant but still feels generic, it fails.

## Implementation Strategy

This work should happen in parallel across three tracks:

1. `piece refinement`
   Tighten `06` itself: composition, claims, focus windows, and pacing.

2. `system reuse`
   Add the reusable editorial grammar and a future-facing brief/template layer.

3. `review loop`
   Re-check the resulting piece through both product/editorial and persona-client lenses.

## Risks

- over-correcting into a visually colder but still abstract piece
- adding too much system before confirming the new language actually works
- building reusable templates around a weak edit

## Mitigation

- keep the implementation anchored to one real piece first
- only generalize what clearly improves the piece
- re-render and inspect real frames before treating anything as solved
