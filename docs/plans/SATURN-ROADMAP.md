# Saturn Roadmap

## Goal

Turn the current Paperclip local experience into a more opinionated `Saturn`
workspace with:

- stronger brand identity
- cleaner Apple-leaning UI/UX
- a real content pipeline on top of issues, routines, and documents

This roadmap is intentionally practical. Each phase should ship useful value on
its own without requiring risky backend rewrites.

## Principles

- Keep backend contracts stable unless there is clear product value.
- Prefer visual and workflow improvements before deep architectural changes.
- Reuse existing primitives: issues, issue documents, routines, approvals,
  companies, inbox.
- Ship thin vertical slices instead of broad speculative refactors.

## Phase 1: Brand And Interface Foundation

### Outcome

Saturn looks and feels like a coherent product instead of a renamed fork.

### Deliverables

- Finalize Saturn visual language.
- Normalize shell UI across sidebar, rail, top bar, dialogs, cards, and forms.
- Define shared tokens for:
  - radius
  - elevation
  - motion
  - density
  - accent usage
- Remove leftover Paperclip visual inconsistencies where user-facing.

### Suggested implementation

- Stabilize theme tokens in [ui/src/index.css](/C:/Users/Andre/Desktop/Orbit-Labs/ui/src/index.css).
- Audit reusable primitives under [ui/src/components/ui](/C:/Users/Andre/Desktop/Orbit-Labs/ui/src/components/ui).
- Build a short Saturn UI checklist for:
  - buttons
  - inputs
  - badges
  - cards
  - popovers
  - dialogs
  - list rows

### Exit criteria

- Main shell is visually consistent.
- No obvious "liquid glass" or mismatched styling remains.
- Core screens feel like one product family.

## Phase 2: Dashboard And Navigation UX

### Outcome

The app feels easier to scan and more purposeful on first open.

### Deliverables

- Redesign dashboard hierarchy around "what matters now".
- Improve empty states and first-run guidance.
- Tighten sidebar taxonomy and labels.
- Make navigation state and selection more legible.

### Suggested implementation

- Refresh dashboard cards and section order.
- Improve issue, routine, and inbox summaries.
- Add stronger page intro patterns:
  - title
  - supporting sentence
  - primary action

### Exit criteria

- Dashboard gives clear value within a few seconds.
- New users can understand where to go next.
- Navigation feels intentional, not inherited.

## Phase 3: Content Workflow MVP

### Outcome

Saturn supports a real content workflow using existing issue and document
systems.

### Deliverables

- Promote the current Content modal from UX lab into a proper workflow.
- Standardize content issue metadata:
  - channel
  - status
  - source links
  - target publish date
- Support per-channel document variants:
  - `content`
  - `content:x`
  - `content:reddit`
  - `content:linkedin`
- Add review states:
  - idea
  - draft
  - review
  - approved
  - published

### Suggested implementation

- Reuse issues and issue documents instead of inventing a new content model.
- Move the modal into a first-class route and hook it from actual content lists.
- Add lightweight channel and status fields through issue metadata or documents
  first, before deeper schema expansion.

### Exit criteria

- A team can ideate, draft, review, and publish from one consistent workflow.
- Content is discoverable from the main product, not hidden in a lab route.

## Phase 4: Routine-Driven Content Generation

### Outcome

Routines can generate content opportunities and first drafts automatically.

### Deliverables

- Routine output can create or update content issues.
- Source ingestion support for:
  - Reddit
  - X
  - RSS
  - GitHub
  - docs/blog URLs
- Draft generation writes directly into issue documents.

### Suggested implementation

- Start with one routine type: `analyze sources -> create content issue`.
- Store source snapshots and summaries as documents, not bespoke tables, unless
  scale demands it.
- Keep humans in the loop for review and publish.

### Exit criteria

- A routine can produce a draft that opens cleanly in the content editor.
- Manual editorial review is still easy and safe.

## Phase 5: Editorial Operations Layer

### Outcome

Saturn becomes usable as a lightweight publishing workspace, not just a draft
editor.

### Deliverables

- Editorial calendar view.
- Approval queue for drafts awaiting review.
- Publish history and lightweight analytics.
- Scheduling hooks for future posting integrations.

### Suggested implementation

- Build calendar and review queue on top of issue filters first.
- Add explicit publish actions per channel.
- Keep analytics simple:
  - published date
  - channel
  - author
  - source type

### Exit criteria

- Teams can manage publication rhythm from inside Saturn.
- Content operations no longer live across scattered tools.

## Near-Term Priority Order

1. Finish visual system cleanup.
2. Redesign dashboard and list experiences.
3. Turn Content UX Lab into a real content workflow.
4. Add routine-generated content drafts.
5. Add editorial calendar and approvals.

## Recommended Next Build Steps

1. Refine `Dashboard` and `Issues` to match the current Saturn shell.
2. Move `ContentUxLab` toward a first-class `Content` surface.
3. Define the minimum metadata needed for content issues.
4. Build one routine path that generates a draft issue automatically.

## Notes

- Avoid large internal renames unless absolutely necessary.
- Keep "Saturn" primarily user-facing until product direction is stable.
- Use design consistency as a forcing function before adding many new features.
