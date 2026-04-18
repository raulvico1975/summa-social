# Video Production Execution Contract

## Purpose

This document defines how the functional-explainer channel is executed in practice.
It turns the brand contract into a reviewable production workflow for masters and derived cuts.

For editorial consumer-layer cuts on top of an approved master, also follow `docs/brand/contracts/explainer-edit.md`.

## Runtime

- The canonical master path is `video-studio/functional-explainers`.
- The studio runtime is `video-studio/hyperframes`.
- HyperFrames consumes the canonical master path and render inputs.
- HyperFrames is not a source of truth.
- The production chain is `source capture -> approved master -> edit proxy -> explainer-edit`.
- The approved master is the only source of truth; the edit proxy exists only to support downstream editorial reframing or retiming.

## What a master is

A master is the approved upstream explainer for one feature or workflow.

A master must:

- follow the `functional-explainer` contract
- be produced through the `functional-explainers` pipeline
- be built around one feature or one operational workflow
- use approved capture evidence as the primary proof
- be readable on its own before any derived distribution cut exists
- have a clear approval state before it is treated as reusable
- generate an edit-ready proxy only when downstream `explainer-edit` work needs reframing or retiming

## What a derived cut is

A derived cut is a downstream version of a master.

A derived cut may:

- crop
- shorten
- simplify
- re-time
- reframe for a target channel

A derived cut may not:

- invent a new narrative
- introduce unapproved proof
- change the core problem or promise
- override the approved capture set

## Production flow

1. Start from an approved brief and storyboard.
2. Select the approved capture set.
3. Assemble the master through `video-studio/functional-explainers`.
4. Render and review the master at exact timestamps.
5. Generate the edit-ready proxy and edit asset only if a downstream `explainer-edit` cut is needed.
6. Use the proxy as the editing input for the consumer layer, not as a replacement for the master.
7. Fix any timing, overlap, looping, or readability problems.
8. Approve the master only after render verification passes.
9. Derive secondary cuts from the approved master only.

## Review gates

No explainer may be considered approved until all of the following are true:

- the audience is clear
- the problem is clear
- the product proof is visible
- the scene order is readable without pausing
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
- edit-ready proxies use dense keyframes before HyperFrames reframing consumes them
- any declared `editProxyPath` and `editAssetPath` are produced from the approved recording, then handed off to `explainer-edit`

If a render fails any of these checks, the master is not approved.

## Artifact policy

- Source docs, templates, and scripts are committed.
- Rendered mp4 files stay untracked.
- Preview snapshots and thumbnails stay untracked.
- Edit proxies and edit-asset JSON files stay untracked.
- The reusable editorial handoff lives in docs, not in tracked proxy artifacts.
- The repository should only store durable production inputs and reviewable contracts.

## Approval gate

The first human review gate is functional, not aesthetic.
The video must make sense to someone handling accounting or member administration in a Catalan social entity.

## Research status

`05-devolucions-estat-real-16x9` remains research material only.

It is:

- not an approved precedent
- not a reusable master
- not a distribution template
- not a substitute for render verification

This matters because the production system must preserve the learning without canonizing a failed pilot.

## Governance

If a future explainer needs a new execution rule, the rule belongs in this document before the canonical master path treats it as approved behavior.
