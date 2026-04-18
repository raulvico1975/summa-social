# Video Production Execution Contract

## Purpose

This document defines how the functional explainer channel is executed in practice.
It turns the brand contract into a reviewable production workflow for masters and derived cuts.

## Runtime

- The studio runtime is `video-studio/hyperframes`.
- The studio consumes the canon from `docs/brand/`.
- The studio is not a second source of truth.

## What a master is

A master is the approved upstream explainer for one feature or workflow.

A master must:

- follow the `functional-explainer` contract
- be built around one feature or one operational workflow
- use approved capture evidence as the primary proof
- be readable on its own before any derived distribution cut exists
- have a clear approval state before it is treated as reusable

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

1. Start from an approved brief.
2. Select the approved capture set.
3. Assemble the master against the channel contract.
4. Review the master at exact timestamps.
5. Fix any timing, overlap, looping, or readability problems.
6. Approve the master only after render verification passes.
7. Derive secondary cuts from the approved master only.

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

If a render fails any of these checks, the master is not approved.

## Artifact policy

- Source docs, templates, and scripts are committed.
- Rendered mp4 files stay untracked.
- Preview snapshots and thumbnails stay untracked.
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

If a future explainer needs a new execution rule, the rule belongs in this document before the studio runtime treats it as approved behavior.
