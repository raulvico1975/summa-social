# Summa Functional Explainer Video System Design

## Purpose

This spec defines the durable video system for Summa Social product explainers.
It replaces the current ad-hoc short-video prototype as the canonical path for feature videos that must later adapt to LinkedIn, blog, WhatsApp, or similar distribution channels.

## Problem statement

The current branch contains a first `short-video` marketing attempt under `video-studio/hyperframes`.
That attempt was useful as research, but it is not a reliable production system:

- the approved brand canon exists, but the current video contract is still too close to marketing abstraction
- the pilot `05-devolucions-estat-real-16x9` failed as a trustworthy quality precedent
- text density, scene timing, and timeline behavior were not stable enough
- the system does not yet prove product value with real Summa UI captures
- the current structure is not ready for later asks such as “prepare a Stripe integration video for LinkedIn”

The next system must be able to generate repeatable functional videos with much less iteration.

## Goals

1. Create one canonical video channel for product-led explainers: `functional-explainer`.
2. Make the video system reusable across future asks without re-deciding the same rules every time.
3. Use real product captures as primary proof of value.
4. Keep the system isolated from Summa core and safe to integrate later.
5. Ensure that approved learnings persist in structured memory, not only in chat.

## Non-goals

- shipping a public final video in this spec itself
- solving narration, soundtrack, subtitles, or voiceover automation now
- supporting every distribution variant immediately
- replacing the existing blog-cover image system

## Core decision

The canonical unit is no longer “a short marketing video”.
The canonical unit is:

`one functional explainer master` -> `one or more derived distribution cuts`

This means:

- first, produce a calm, readable master explainer for one feature
- then derive lighter variants for channels such as LinkedIn or WhatsApp
- do not ask one single video to serve every channel and every objective at once

## Channel model

### 1. Functional explainer

This is the upstream master.

Purpose:
- explain one real operational workflow or one feature clearly
- prove the value with real product evidence
- stay readable without pause

Mandatory traits:
- real Summa captures are primary visual proof
- slower rhythm than short-video marketing
- one main claim per scene
- product reality over design flourish
- readable by a person doing economic and administrative work in a social entity

Initial target:
- 16:9
- 18s to 30s
- 4 to 6 scenes
- one scene = one idea only

### 2. Derived distribution variants

Derived variants are downstream outputs of a master explainer.
They do not invent a new story from scratch.

Examples:
- LinkedIn feed cut
- blog/post companion cut
- WhatsApp share cut

These variants may shorten, crop, or simplify the master, but they inherit:
- problem
- proof
- tone
- approved capture set
- approved copy hierarchy

## System architecture

### Canon layer

Source of truth under `docs/brand/`.

Responsibilities:
- define the `functional-explainer` contract
- define distribution profiles
- define execution rules
- define approval and memory rules

### Studio layer

Runtime under `video-studio/hyperframes/`.

Responsibilities:
- consume the canon
- host reusable shot components
- host templates
- host briefs
- host capture registry metadata
- render masters and later variants

The studio is a consumer, not a second source of truth.

### Review and memory layer

Structured approval memory under `docs/brand/memory/`.

Responsibilities:
- store only approved video learnings
- record what pacing, density, shot choice, and capture strategy worked
- explicitly keep rejected prototypes out of approved memory

## Required building blocks

### A. Functional explainer contract

New canonical contract under:
- `docs/brand/contracts/functional-explainer.md`

It must define:
- audience
- pacing
- copy density
- when captures are mandatory
- what illustration may still do
- rejection triggers

### B. Video production execution contract

New execution contract under:
- `docs/brand/execution/video-production.md`

It must define:
- what a “master” is
- how variants derive from it
- review gates before any video is shown as approved
- what render verification is mandatory

### C. Video memory

New memory files under:
- `docs/brand/memory/video-memory.md`
- `docs/brand/memory/video-memory.json`

They must record:
- approved master id
- feature domain
- target audience
- timing profile
- approved shot patterns
- approved capture set
- approval notes

### D. Brief registry

New brief system under:
- `video-studio/hyperframes/briefs/`

Each brief must define:
- feature
- real user problem
- audience
- promise
- approved captures needed
- target master format
- later derived channels

### E. Capture registry

New registry under:
- `video-studio/hyperframes/captures-registry/`

This is not raw media storage yet.
It is the metadata and rules for stable captures:

- demo dataset source
- screen name
- workflow step
- why the capture exists
- where it is safe to reuse

### F. Shot library

Reusable shot system under:
- `video-studio/hyperframes/shots/`

Expected first shot families:
- full-screen capture hold
- zoom/highlight on one UI area
- before/after comparison
- manual workflow vs Summa resolution
- result state / resolved state

### G. Templates

Reusable templates under:
- `video-studio/hyperframes/templates/`

Expected first templates:
- `functional-explainer-master-16x9`
- later, derived cut templates if needed

## Rules for readability

These rules exist because the failed pilot showed what breaks:

1. No stacked text systems in the same pilot unless the contract explicitly requires them.
2. No captions, chips, lower-thirds, and body copy all competing at once.
3. One scene must be readable by a human in normal playback without pause.
4. Review must happen at exact timestamps, not only by “watching quickly”.
5. A master explainer is rejected if any scene loops, overlaps, restarts incorrectly, or obscures text.

## Rules for product proof

1. A functional explainer must show real Summa UI captures unless a scene is purely framing or transition.
2. Illustration is secondary and supportive, not primary proof.
3. The viewer must understand not only the problem, but what Summa visibly changes.
4. The video should make a responsible economic/admin user think:
   - “this is my workflow”
   - “this removes manual ambiguity”
   - “I can see where the help comes from”

## Status of current prototype

`05-devolucions-estat-real-16x9` remains in the branch as research material only.

It is:
- not an approved precedent
- not eligible for memory
- not the template for future functional explainers

This is intentional.
The branch should preserve the learning while refusing to canonize a failed output.

## First implementation slice

The first real use of this system should be:

`importacio-extracte-conciliacio`

Why:
- it is concrete
- it is product-demonstrable
- it naturally benefits from real UI capture
- it maps directly to a recurring operational workflow

Expected outcome of the first slice:
- a canonical functional explainer brief
- the minimum shot library and template needed to build it
- a capture registry ready for this workflow

## Acceptance criteria for the system

The system is only considered ready if all of these are true:

1. A future request like “prepare a Stripe integration video for LinkedIn” can be answered by selecting a brief + captures + template, not by reinventing architecture.
2. The master/variant relationship is explicit.
3. The system distinguishes approved precedents from failed experiments.
4. The system can prove product value through captures, not only conceptual visuals.
5. The system stays isolated from Summa core and easy to integrate later.
