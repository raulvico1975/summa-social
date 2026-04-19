# Video Production Execution Contract

## Purpose

This document defines how the functional-explainer channel is executed in practice.
It turns the brand contracts into a reviewable production workflow for
proof-first masters, premium films, and delivery cuts.

## Runtime

- The canonical master path is `video-studio/functional-explainers`.
- The studio runtime is `video-studio/hyperframes`.
- HyperFrames is a renderer and runtime, not a style authority.
- The production chain is `source capture -> approved proof-first master -> product film -> delivery cuts`.

## What a master is

A master is the approved upstream proof artifact for one feature or workflow.

A master must:

- follow the `functional-explainer` contract
- be produced through the `functional-explainers` pipeline
- be built around one feature or one operational workflow
- use approved capture evidence as the primary proof
- be readable on its own before any premium editorial treatment exists
- have a clear approval state before it is treated as reusable
- stay visually subordinate to truth rather than polish

## What a product film is

A product film is the premium public-facing expression of an approved master.

A product film may:

- reframe
- retime
- simplify copy
- improve editorial rhythm
- raise delivery quality

A product film may not:

- invent proof
- change the workflow truth
- turn the piece into a poster, keynote, or ad shell
- replace proof with decorative motion

## What a delivery cut is

A delivery cut is a downstream export of the product film for a target surface.

A delivery cut may crop, shorten, or change export settings.
It may not change the approved narrative.

## Production flow

1. Start from an approved brief and storyboard.
2. Select the approved capture set.
3. Assemble the proof-first master through `video-studio/functional-explainers`.
4. Render and review the master at exact timestamps.
5. Generate any proxy assets only as editorial working material.
6. Build the product film from the approved master.
7. Fix any timing, overlap, looping, or readability problems.
8. Approve the product film only after render verification passes.
9. Derive delivery cuts from the approved product film only.

## Review gates

No explainer may be considered approved until all of the following are true:

- the audience is clear
- the problem is clear
- the product proof is visible
- the proof sequence is readable without pausing
- the copy density stays within the contract
- the approved capture set matches the brief
- the master export has been checked as a real render, not just as a timeline preview

## Mandatory render verification

Render verification is required for every master before approval.

Verification must confirm:

- the export renders successfully
- the aspect ratio matches the intended format
- the duration lands in the approved target range unless the brief explicitly says otherwise
- no scene loops unexpectedly
- no layers overlap in a way that blocks readability
- text is legible in playback
- the product proof is present where the contract requires it
- any proxy assets preserve enough quality for downstream reframing
- the export profile matches the delivery intent when the piece is web-facing

If a render fails any of these checks, the master is not approved.

## Artifact policy

- Source docs, templates, and scripts are committed.
- Rendered mp4 files stay untracked.
- Preview snapshots and thumbnails stay untracked.
- Proxy artifacts and edit metadata stay untracked.
- The repository should only store durable production inputs and reviewable contracts.

## Approval gate

The first human review gate is functional, not aesthetic.
The video must make sense to someone handling accounting or member administration in a Catalan social entity.

## Rejected direction

The earlier short-video and poster-like explainer line is rejected.

It must not be reused as precedent for premium video.

## Governance

If a future explainer needs a new execution rule, the rule belongs in this document before the canonical master path treats it as approved behavior.
