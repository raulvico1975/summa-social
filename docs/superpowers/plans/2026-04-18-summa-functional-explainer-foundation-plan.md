# Summa Functional Explainer Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first durable foundation for Summa Social functional product videos so future feature explainers can be produced from contracts, briefs, captures, and reusable shot templates instead of ad-hoc iteration.

**Architecture:** `docs/brand` becomes the canonical source for the new `functional-explainer` channel and its memory. `video-studio/hyperframes` becomes the isolated consumer runtime that hosts briefs, capture metadata, reusable shots, and templates. Existing `05` research remains available but explicitly non-canonical.

**Tech Stack:** Markdown docs, JSON memory files, HyperFrames HTML runtime structure, Node.js render scripts already present in the studio.

---

## Scope split

This plan covers:

- the canonical `functional-explainer` contract
- the video production execution contract
- dedicated video memory files
- reusable studio registries for briefs, captures, shots, and templates
- explicit treatment of `05` as research-only

This plan does not cover:

- automatic capture generation
- a final published feature video
- voiceover or soundtrack
- every future distribution profile

## File structure

New files in this plan:

- docs/brand/contracts/functional-explainer.md
- docs/brand/execution/video-production.md
- docs/brand/memory/video-memory.md
- docs/brand/memory/video-memory.json
- video-studio/hyperframes/briefs/README.md
- video-studio/hyperframes/briefs/importacio-extracte-conciliacio.md
- video-studio/hyperframes/captures-registry/README.md
- video-studio/hyperframes/captures-registry/importacio-extracte-conciliacio.json
- video-studio/hyperframes/shots/README.md
- video-studio/hyperframes/templates/README.md
- video-studio/hyperframes/templates/functional-explainer-master-16x9.md

Existing files to modify:

- docs/brand/memory/brand-memory.md
- video-studio/hyperframes/README.md
- video-studio/hyperframes/HANDOFF.md

Reasoning:

- the new contract separates product explainers from short marketing videos
- the new execution contract defines master vs. derived outputs
- the new memory files prevent approved learnings from living only in chat
- the new studio directories give future videos a repeatable home
- the studio docs must stop implying that `05` is a canonical template

### Task 1: Canonize the functional-explainer channel

**Files:**
- Create: `docs/brand/contracts/functional-explainer.md`
- Create: `docs/brand/execution/video-production.md`
- Modify: `docs/brand/memory/brand-memory.md`

- [ ] **Step 1: Write the functional-explainer contract**
- [ ] **Step 2: Write the video production execution contract**
- [ ] **Step 3: Add a note in `brand-memory.md` that failed prototypes do not become video precedents**
- [ ] **Step 4: Verify docs formatting and internal consistency**
- [ ] **Step 5: Commit the canon docs task**

### Task 2: Add dedicated video memory

**Files:**
- Create: `docs/brand/memory/video-memory.md`
- Create: `docs/brand/memory/video-memory.json`

- [ ] **Step 1: Create the human-readable video memory rules**
- [ ] **Step 2: Create the machine-readable empty memory file**
- [ ] **Step 3: Ensure the schema distinguishes approved masters from rejected experiments**
- [ ] **Step 4: Verify JSON validity**
- [ ] **Step 5: Commit the memory task**

### Task 3: Materialize the studio registries

**Files:**
- Create: `video-studio/hyperframes/briefs/README.md`
- Create: `video-studio/hyperframes/briefs/importacio-extracte-conciliacio.md`
- Create: `video-studio/hyperframes/captures-registry/README.md`
- Create: `video-studio/hyperframes/captures-registry/importacio-extracte-conciliacio.json`
- Create: `video-studio/hyperframes/shots/README.md`
- Create: `video-studio/hyperframes/templates/README.md`
- Create: `video-studio/hyperframes/templates/functional-explainer-master-16x9.md`

- [ ] **Step 1: Create the new registry directories**
- [ ] **Step 2: Write the briefs registry rules and the first reconciliation/import brief**
- [ ] **Step 3: Write the capture registry rules and the first capture metadata file**
- [ ] **Step 4: Write the shot library rules**
- [ ] **Step 5: Write the template registry rules and the first master template contract**
- [ ] **Step 6: Commit the studio registry task**

### Task 4: Update studio docs to reflect reality

**Files:**
- Modify: `video-studio/hyperframes/README.md`
- Modify: `video-studio/hyperframes/HANDOFF.md`

- [ ] **Step 1: Update `README.md` to describe the new functional-explainer path**
- [ ] **Step 2: Update `HANDOFF.md` to mark `05` as research-only and not approved precedent**
- [ ] **Step 3: Verify the docs do not present `05` as an accepted template**
- [ ] **Step 4: Commit the studio docs task**

### Task 5: Final verification

**Files:**
- Review only

- [ ] **Step 1: Run `git diff --check` in the isolated worktree**
- [ ] **Step 2: Run targeted doc validation if the local validator can do so without unrelated repo failures**
- [ ] **Step 3: Run `git status --short` and confirm a clean working tree after commit**
- [ ] **Step 4: Summarize residual risks**
