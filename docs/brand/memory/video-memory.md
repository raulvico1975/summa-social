# Video Memory

This file defines the durable memory rules for `functional-explainer` video work.
It is the human-readable companion to `video-memory.json`.

## Purpose

Only approved video learnings belong here.
The goal is to preserve what worked for future masters and derived cuts, while keeping failed experiments visible as rejected history instead of canon.

## Entry Policy

Record an entry only when the review outcome is explicit.

- Approved masters may enter memory after they pass the video review gate.
- Rejected experiments may be recorded separately for traceability, but they do not become precedent.
- Derived variants may be recorded only when they inherit from an approved master.
- Drafts, half-finished renders, and ambiguous prototypes do not enter memory.

## Required Fields For Approved Masters

Each approved master entry should capture:

- `master_id`: stable id for the explainer
- `feature_domain`: the product area or workflow being explained
- `audience`: the intended reader or viewer group
- `timing_profile`: target duration and scene rhythm
- `approved_shot_patterns`: the shot families that were accepted
- `approved_capture_set`: the capture ids or capture groups used as proof
- `approval_notes`: the reason the master is approved and reusable
- `derived_variant_ids`: downstream cuts that inherit from this master, if any

## Required Fields For Rejected Experiments

Each rejected experiment entry should capture:

- `experiment_id`: stable id for the prototype or test
- `feature_domain`: what it was trying to explain
- `rejection_reason`: why it failed review
- `review_notes`: the concrete failure observed
- `can_inform_future_work`: whether any narrow lesson is reusable

## Capture Memory Rules

- Captures may be reused only when they are explicitly approved for the same or a narrower workflow.
- Real Summa UI evidence is preferred over illustration when the scene is meant to prove product value.
- A capture set must not be assumed reusable just because it appeared in an earlier draft.

## Versioning Rules

- Keep the JSON schema stable and additive.
- Do not store speculative placeholders.
- Prefer empty arrays over fake entries when nothing is approved yet.

## Current State

The memory is intentionally empty until the first `functional-explainer` master is approved.
