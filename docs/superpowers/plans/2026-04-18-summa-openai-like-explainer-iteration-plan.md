# Summa OpenAI-Like Explainer Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `06` explainer-edit cut and the supporting system so future Summa feature videos need less iteration and produce calmer, more product-led explainers.

**Architecture:** Keep the canonical `functional-explainer` path intact, improve the downstream `explainer-edit` layer, and materialize the winning editorial decisions as reusable brief/grammar assets. The current `06` piece remains the proving ground before any broader generalization.

**Tech Stack:** HTML/GSAP HyperFrames compositions, Node.js manifest tooling, markdown contracts/specs, existing Summa demo capture pipeline

---

### Task 1: Add reusable editorial grammar inputs

**Files:**
- Create: `video-studio/hyperframes/templates/explainer-edit-grammar.md`
- Create: `video-studio/hyperframes/briefs/templates/functional-explainer-brief-template.md`
- Modify: `docs/brand/contracts/explainer-edit.md`
- Modify: `video-studio/hyperframes/README.md`

- [ ] Define the reusable beat grammar in `video-studio/hyperframes/templates/explainer-edit-grammar.md`.
- [ ] Include concrete scene types: `entry`, `confirm`, `review`, `alert`, `result`.
- [ ] Define for each scene type: allowed claim length, expected proof target, and disallowed behavior.
- [ ] Create `video-studio/hyperframes/briefs/templates/functional-explainer-brief-template.md` with sections for user pain, operational promise, beat-by-beat proof target, and claim candidates.
- [ ] Update `docs/brand/contracts/explainer-edit.md` so the new grammar and brief template are part of the contract, not side notes.
- [ ] Update `video-studio/hyperframes/README.md` to point future explainers at the grammar and brief template.
- [ ] Run a docs validation pass for the touched docs.
- [ ] Commit only the grammar/template/docs changes.

### Task 2: Refine composition 06 into a calmer guided demo

**Files:**
- Modify: `video-studio/hyperframes/compositions/06-importacio-extracte-editorial-16x9.html`
- Modify: `video-studio/hyperframes/prompts/06-importacio-extracte-editorial-16x9.md`

- [ ] Rework the `06` layout so it feels less like a poster and more like a guided product demo.
- [ ] Tighten each beat to one short claim and one support line at most.
- [ ] Increase local focus on the active control or state instead of the whole screen.
- [ ] Keep the edit proxy as the source asset and preserve UI readability during reframing.
- [ ] Update the prompt file so its guidance matches the refined composition rules.
- [ ] Render the updated piece to a new temp MP4.
- [ ] Extract representative frames and inspect them visually before moving on.
- [ ] Commit only the composition/prompt changes if they are clean and self-contained.

### Task 3: Strengthen future-facing manifest/system inputs

**Files:**
- Modify: `video-studio/functional-explainers/manifests/importacio-extracte-conciliacio.json`
- Modify: `docs/brand/execution/video-production.md`
- Modify: `video-studio/functional-explainers/README.md`

- [ ] Add explicit editorial input fields to the current manifest if needed for future explainers, but only where the current system can actually consume them.
- [ ] Keep the manifest truthful: do not invent runtime behavior that the pipeline does not implement.
- [ ] Update the execution docs so future workers understand how `source -> edit proxy -> explainer-edit` is supposed to flow.
- [ ] Keep all output assets untracked and documented as such.
- [ ] Run manifest- and docs-related checks after changes.
- [ ] Commit only the system/input documentation changes if they stand alone.

### Task 4: Human-style review loop and acceptance check

**Files:**
- No required file changes unless acceptance docs need one short note.

- [ ] Review the updated rendered piece against the persona-client lens.
- [ ] Review the updated rendered piece against the product/editorial lens.
- [ ] Compare the new piece against the previous cut on clarity, proof focus, and perceived usefulness.
- [ ] Reject the edit if it still looks elegant but generic.
- [ ] If accepted, record the practical learning in the relevant docs already touched in this plan rather than creating redundant notes.

### Task 5: Verification and integration check

**Files:**
- Modify only if verification exposes a real gap.

- [ ] Run `node --test video-studio/functional-explainers/scripts/__tests__/render-explainer.test.mjs`.
- [ ] Run `npm run video:test` in `video-studio/hyperframes`.
- [ ] Run `npm run video:lint` in `video-studio/hyperframes`.
- [ ] Run `npm run video:validate` in `video-studio/hyperframes`.
- [ ] Render the final `06` piece to a fresh temp output and inspect it.
- [ ] Run `git diff --check`.
- [ ] Confirm the worktree remains isolated and `output/` stays untracked.
- [ ] Create one final commit for the integrated result.
