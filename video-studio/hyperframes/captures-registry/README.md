# Captures Registry

This directory holds capture metadata for `functional-explainer` work.
It is not raw media storage. It is the stable index of which Summa UI captures
exist, why they exist, and where they can be safely reused.

## What a capture entry must define

- capture id
- source dataset or UI source
- screen name
- workflow step
- why the capture exists
- safe reuse scope
- status or approval state

## Reuse rules

- A capture may only be reused for the same workflow or a narrower one.
- A capture set is not reusable just because it appeared in a draft.
- Real UI evidence is preferred over illustration when the scene is meant to
  prove product value.
- If the product UI changes, refresh the capture metadata before reusing it.

## How this registry is organized

Each workflow gets one JSON file with the capture list for that brief.
The first registry entry for this branch is:

- `importacio-extracte-conciliacio.json`

## Current rule

The registry should keep the minimum set of stable captures needed to build the
master explainer without re-inventing the evidence on every new video.
