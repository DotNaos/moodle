# Pipeline Trace Model

This document describes how Moodle course material should move through the
study pipeline while staying inspectable at every step.

The core idea is:

```text
reduce(course, pipeline_steps) -> final_course_view + trace_graph
```

The final course view is the clean user-facing output. The trace graph explains
where every output block came from, what changed, and what was dropped.

## 1. The Three States

```text
STATE 1                          STATE 2                                      STATE 3
RAW / COURSE INPUT               EXTRACTED / RENDERABLE STRUCTURE             CURATED / FINAL VIEW
──────────────────               ────────────────────────────────             ────────────────────

Course                           Course                                       Course View
└─ Moodle Resources              ├─ Task Group: Aufgabenblatt 01              ├─ Tasks
   │                             │  ├─ Sheet: PDF A                           │  └─ Aufgabenblatt 01
   ├─ PDF A ───────────────────► │  │  ├─ Page 1                              │     ├─ Title
   │  Aufgabenblatt 01           │  │  │  ├─ block_001 heading/sheet_title ─────────► │
   │                             │  │  │  ├─ block_002 image/logo ────────X dropped  │
   │                             │  │  │  ├─ block_003 paragraph/intro ─────────────► Intro
   │                             │  │  │  ├─ block_004 code/pseudo_code ────────────► Code
   │                             │  │  │  └─ block_005 image/diagram ───────────────► Diagram
   │                             │  │  └─ Page 2                              │     │
   │                             │  │     ├─ block_006 paragraph/task_text ─────────► Aufgabe 2
   │                             │  │     └─ block_007 paragraph/footer ────X dropped
   │                             │  │
   ├─ PDF B ───────────────────► │  └─ Solution: PDF B                        │     └─ Solution
   │  Aufgabenblatt 01 Lösung    │     └─ Page 1                              │        ├─ Visual
   │                             │        ├─ block_008 image/solution ──────────────► │
   │                             │        └─ block_009 paragraph/weak_ocr ──────────► OCR text
   │
   └─ PDF C ───────────────────► └─ Script Source: PDF C                      └─ Script
      Teil 01 Skript                └─ Page 1                                    └─ Chapter 1
                                       ├─ block_010 heading/chapter_title ───────────► Title
                                       └─ block_011 paragraph/theory_text ───────────► Paragraph


        f_fetch / f_download / f_group / f_pair              f_codex_curate / f_split / f_clean
────────────────────────────────────────────► ────────────────────────────────────────────────►
```

## 2. State 1: Raw Course Input

The first step fetches the full Moodle course and organizes it without creating
study content yet.

```text
Course Inventory
├─ Lecture Material
│  ├─ Teil 01.pdf
│  ├─ Teil 02.pdf
│  └─ ...
│
├─ Task Groups
│  ├─ Aufgabenblatt 01
│  │  ├─ sheet: Aufgabenblatt 01.pdf
│  │  ├─ solution: Aufgabenblatt 01 Lösung.pdf
│  │  └─ status: paired
│  │
│  └─ Aufgabenblatt 09
│     ├─ sheet: Aufgabenblatt 09.pdf
│     ├─ solution: missing
│     └─ status: missing_solution
│
├─ References
├─ Interactions
└─ Unknown
```

Every item keeps an explicit classification reason.

```text
Task Group: Aufgabenblatt 01
├─ sheet
│  ├─ moodle_id: 947711
│  └─ reason: title contains "Aufgabenblatt 01"
│
├─ solution
│  ├─ moodle_id: 947712
│  └─ reason: title contains "Aufgabenblatt 01" and "Lösung"
│
└─ pairing
   ├─ status: paired
   ├─ confidence: high
   └─ method: normalized title + sheet number
```

Nothing should silently disappear. Unknown items remain visible in the
inventory.

## 3. State 2: Extracted Renderable Structure

The extracted state is a website-like document structure. It is not yet the
final study view, but it must already be renderable and inspectable.

Each PDF becomes pages. Each page becomes blocks.

```text
PDF: Aufgabenblatt 01.pdf
├─ metadata
│  ├─ moodle_id: 947711
│  ├─ file_hash: 3f9049...
│  ├─ page_count: 2
│  └─ kind: task_sheet
│
├─ pages
│  ├─ page 1
│  │  ├─ page_image
│  │  ├─ text_extraction
│  │  │  ├─ engine: pdftotext
│  │  │  ├─ chars: 1820
│  │  │  └─ status: ok
│  │  │
│  │  ├─ image_extraction
│  │  │  ├─ engine: pdftohtml
│  │  │  ├─ images: 1
│  │  │  └─ status: ok
│  │  │
│  │  └─ blocks
│  │     ├─ block_001 heading / sheet_title
│  │     ├─ block_002 paragraph / task_intro
│  │     ├─ block_003 code / pseudo_code
│  │     └─ block_004 image / diagram
│  │
│  └─ page 2
│     └─ blocks
│        └─ block_005 paragraph / task_text
│
└─ diagnostics
   ├─ pages_missing_text: 0
   ├─ pages_visual_only: 0
   ├─ extracted_images: 1
   ├─ unused_images: 0
   ├─ unmapped_blocks: 0
   └─ overall_status: ok
```

Block `type` describes the form. Block `label` describes the meaning.

```text
block.type
├─ heading
├─ paragraph
├─ list
├─ table
├─ image
├─ formula
├─ code
├─ page_header
├─ page_footer
├─ caption
└─ unknown

block.label
├─ course_title
├─ sheet_title
├─ task_number
├─ task_intro
├─ task_question
├─ diagram
├─ formula_definition
├─ solution_step
├─ note
└─ unknown
```

The frontend should be able to render this state directly:

```text
left: original page preview
right: recognized document structure

Page 1 Structure
├─ heading / sheet_title
├─ paragraph / task_intro
├─ code / pseudo_code
├─ image / diagram
└─ paragraph / task_question
```

## 4. State 3: Curated Final View

Codex works from the extracted structure, not from raw PDFs.

Codex may clean, split, rewrite, summarize, and remove noise. It may not create
untraceable course content.

```text
PDF A: Aufgabenblatt 01
├─ block_001 sheet_title      ─────► Tasks / Aufgabenblatt 01 / Title
├─ block_002 logo             ──X──► dropped: decorative logo
├─ block_003 intro            ─────► Tasks / Aufgabenblatt 01 / Aufgabe 1 / Intro
├─ block_004 pseudo_code      ─────► Tasks / Aufgabenblatt 01 / Aufgabe 1 / Code
├─ block_005 diagram          ─────► Tasks / Aufgabenblatt 01 / Aufgabe 1 / Diagram
├─ block_006 task_text        ─────► Tasks / Aufgabenblatt 01 / Aufgabe 2
└─ block_007 footer           ──X──► dropped: page footer

PDF B: Aufgabenblatt 01 Lösung
├─ block_008 solution_image   ─────► Tasks / Aufgabenblatt 01 / Solution / Visual
└─ block_009 weak_ocr_text    ─────► Tasks / Aufgabenblatt 01 / Solution / OCR text

PDF C: Teil 01 Skript
├─ block_010 chapter_title    ─────► Script / Chapter 1 / Title
└─ block_011 theory_text      ─────► Script / Chapter 1 / Paragraph
```

Every extracted block must end in one of these states:

```text
kept
rewritten
split
merged
moved
dropped
unused_needs_review
```

Dropped content must always carry a reason:

```text
Dropped block_002
├─ type: image
├─ label: logo
├─ reason: decorative logo
└─ allowed: true
```

If Codex creates content that is not directly copied from one block, it still
needs source links.

```text
Generated paragraph
├─ derived_from
│  ├─ block_003
│  └─ block_004
├─ operation: rewrite_for_readability
└─ review_status: needs_review
```

## 5. Trace Graph

The trace graph is the inspectable record of the pipeline. It connects every
source item, page, block, and final view node.

```text
source_node
  └─ pipeline_step
      ├─ output_node
      └─ trace_event
```

Example:

```text
block_005: PDF A / Page 1 / image / diagram
  └─ f_codex_curate
      ├─ output: Tasks / Aufgabenblatt 01 / Aufgabe 1 / Diagram
      └─ trace
         ├─ action: kept
         ├─ status: ok
         └─ reason: learning-relevant diagram
```

Missing or suspicious content becomes visible through the same graph:

```text
block_012: PDF A / Page 2 / image / unknown
  └─ f_codex_curate
      ├─ output: none
      └─ trace
         ├─ action: unused_needs_review
         ├─ status: warning
         └─ reason: extracted image was not referenced in final view
```

## 6. Rerunnable Pipeline Steps

Pipeline steps should be stored as independent runs so a stage can be repeated
with a different engine or configuration.

```text
Course
└─ Resource
   └─ File hash
      ├─ run: extract-pages / v1
      ├─ run: extract-text / pdftotext / config-a
      ├─ run: extract-text / docling / config-b
      ├─ run: extract-images / pdftohtml / config-a
      └─ run: detect-blocks / model-x / config-c
```

A rerun should not overwrite prior results. It creates a new run and the system
chooses which run is active for the next pipeline step.

```text
block detection input
├─ active text run: pdftotext / run_123
├─ active image run: pdftohtml / run_456
└─ active page render run: poppler / run_789
```

This allows the frontend to compare outputs:

```text
Page 4
├─ pdftotext
│  ├─ chars: 0
│  └─ status: weak
│
├─ docling
│  ├─ chars: 540
│  └─ status: ok
│
└─ selected_for_curated_view: docling
```

## 7. Frontend Inspection Goals

The frontend should support these questions:

- What did Moodle provide?
- How was it grouped?
- Which sheet belongs to which solution?
- What did extraction recognize on each page?
- Which blocks became final task or script content?
- Which blocks were dropped, and why?
- Which images were extracted but not used?
- Which OCR or extraction engine produced the selected output?
- Which stage is stale because the source file changed?

The user-facing principle is:

```text
No content is silently lost.
Every output can be traced back to source blocks.
Every missing or dropped block has a visible reason.
```

## 8. Product Shape: Course Pipeline Inspector

The processing pipeline should be visible in a separate inspection surface, not
inside the normal learning UI. The normal task and script screens should stay
focused on studying. Pipeline details are operational/debugging information and
would confuse regular users if shown inline.

The inspector should be reachable in two ways:

```text
Admin
└─ Pipeline
   ├─ all courses
   ├─ all active runs
   ├─ failed or blocked runs
   ├─ review queue
   └─ engine/configuration overview

Course
└─ Pipeline
   └─ same inspector, filtered to this course
```

The root-level admin route makes the pipeline future-proof. Today the primary
source is a Moodle course, but later the same pipeline may ingest uploaded PDF
sets, another LMS, manually curated file collections, or batch imports. The
course-level entry keeps day-to-day debugging ergonomic because it opens the
same system already scoped to the course the user is looking at.

The domain model should therefore not hard-code "course" as the only root
entity. It should model a generic source, with Moodle courses as the first
source type.

```text
Pipeline Source
├─ type: moodle_course
├─ source_id: 22584
├─ display_name: High Performance Computing
└─ children: Moodle resources

Pipeline Source
├─ type: uploaded_pdf_set
├─ source_id: fs26-exam-pack
├─ display_name: FS26 Exam Prep Pack
└─ children: uploaded files
```

The course-specific view should still present the hierarchy in course terms:

```text
Pipeline
└─ Course
   ├─ Resources
   │  └─ Resource
   │     ├─ classification
   │     ├─ status
   │     └─ steps
   │
   ├─ Classification Buckets
   │  ├─ Lecture Material
   │  ├─ Assignment Sheets
   │  ├─ Solutions
   │  ├─ References
   │  ├─ Interactions
   │  └─ Unknown
   │
   └─ Outputs
      ├─ Tasks
      ├─ Script
      └─ Formulas
```

The hierarchy ends at the resource. Buckets, status chips, and steps are views
over that resource, not deeper source hierarchy.

## 9. Course Hierarchy and Classification

The first visible stage is the resource inventory and classification state. It
answers what Moodle provided, what the system recognized, what remains unknown,
and why every resource landed where it did.

```text
Course: High Performance Computing
└─ Resources
   ├─ 947709 · Teil 01
   │  ├─ classified_as: lecture_material
   │  ├─ status: extracted
   │  └─ classification_reason:
   │     title starts with "Teil" and file is a PDF
   │
   ├─ 947711 · Aufgabenblatt 01
   │  ├─ classified_as: assignment_sheet
   │  ├─ status: curated
   │  └─ classification_reason:
   │     title contains "Aufgabenblatt 01" and no solution keyword
   │
   ├─ 947712 · Aufgabenblatt 01 Lösung
   │  ├─ classified_as: solution_pdf
   │  ├─ paired_with: 947711
   │  ├─ status: needs_review
   │  └─ classification_reason:
   │     title contains "Aufgabenblatt 01" and "Lösung"
   │
   └─ 947715 · Zoom Link
      ├─ classified_as: interaction
      ├─ status: ignored_allowed
      └─ classification_reason:
         activity type is external tool / meeting
```

The same resources should also be visible as buckets:

```text
Classification Buckets
├─ Lecture Material
│  ├─ 947709 · Teil 01
│  ├─ 947718 · Teil 02
│  └─ ...
│
├─ Assignment Sheets
│  ├─ 947711 · Aufgabenblatt 01
│  ├─ 947713 · Aufgabenblatt 02
│  └─ ...
│
├─ Solutions
│  ├─ 947712 · Aufgabenblatt 01 Lösung
│  ├─ 947714 · Aufgabenblatt 02 Lösung
│  └─ ...
│
├─ References
├─ Interactions
└─ Unknown
```

The Unknown bucket is important. Unknown resources are not errors by default,
but they must be visible because they represent content the system has not
understood yet. This prevents silent loss.

## 10. Blueprint View for Pipeline Steps

The step inspector should use a node-based "blueprint" view. A table or
terminal-like dashboard is good for summaries, but the pipeline is fundamentally
a graph: sources flow into extraction runs, extraction runs create artifacts,
artifacts feed Codex, and Codex creates final outputs or review items.

React Flow is a good fit for this view because it supports custom node types,
edges, selection, zooming, side panels, and graph layouts.

The graph should not be decorative. It should be the primary debugging tool for
understanding how content moved.

```text
[Moodle Course]
      |
      v
[Inventory]
      |
      v
[Classification]
      |---------------------> [Lecture Material]
      |                              |
      |                              v
      |                        [Extract Script PDFs]
      |                              |
      |                              v
      |                        [Script Blocks]
      |                              |
      |                              v
      |                        [Curated Script]
      |
      |---------------------> [Assignment Sheets]
      |                              |
      |                              v
      |                        [Pair Solutions]
      |                              |
      |                              v
      |                        [Extract Task PDFs]
      |                              |
      |                              v
      |                        [Task Blocks]
      |                              |
      |                              v
      |                        [Curated Tasks]
      |
      |---------------------> [Solutions]
      |                              |
      |                              v
      |                        [Extract Solution PDFs]
      |
      `---------------------> [Unknown]
                                     |
                                     v
                               [Needs Review]
```

For one task group:

```text
[Aufgabenblatt 02.pdf] --------\
                                v
                           [Extract Pages]
                                |
                                v
                           [OCR: pdftotext]
                                |
                                v
                           [Detect Blocks]
                                |
                                v
                           [Codex Curate]
                                |
                                v
[Aufgabenblatt 02 Lösung.pdf] -> [Published Task: Aufgabe 1]
```

For OCR comparison:

```text
                 +------------> [OCR: pdftotext] --+
                 |                                  |
[Page Images] ---+------------> [OCR: docling] -----+--> [Select Active Text Run]
                 |                                  |
                 `------------> [OCR: marker] ------+
```

For missing or unused content:

```text
[Extract Images]
      |
      +----> [image_001: diagram] ----> [Task Diagram]       ok
      |
      `----> [image_002: unknown] ----> [Unused / Review]    warning
```

Node types:

```text
source node
  Moodle resource, PDF, page, extracted image, extracted text

process node
  inventory, classify, pair, render pages, OCR, detect blocks, Codex curate

artifact node
  page image, OCR text, document block, task draft, script draft

review node
  missing solution, weak OCR, unused image, dropped block, stale source

publish node
  shared task, shared script section, formula collection
```

Clicking a node should open a detail panel:

```text
Node Detail
├─ identity
│  ├─ type
│  ├─ id
│  └─ source path
│
├─ run info
│  ├─ stage
│  ├─ engine
│  ├─ config hash
│  ├─ run id
│  ├─ created by
│  └─ created at
│
├─ preview
│  ├─ PDF page
│  ├─ extracted text
│  ├─ extracted image
│  └─ final output block
│
├─ diagnostics
│  ├─ status
│  ├─ warnings
│  ├─ confidence
│  └─ stale source check
│
└─ actions
   ├─ rerun this step
   ├─ compare runs
   ├─ select as active run
   ├─ mark dropped as allowed
   └─ promote output
```

## 11. Task Page UX: Request, Not Manual Improvement

The current task UI should be simplified. The normal task page should not expose
many pipeline controls or a large "improve" workflow. Users should be able to
request work, see progress, and report problems.

Normal task page:

```text
Aufgaben
└─ Aufgabenblatt 01
   ├─ Aufgabe 1
   │  ├─ status: ready
   │  └─ actions:
   │     ├─ Start
   │     └─ Problem melden
   │
   ├─ Aufgabe 2
   │  ├─ status: missing
   │  └─ actions:
   │     └─ Request task
   │
   └─ Pipeline status
      ├─ progress: 45%
      └─ active step: OCR / detect blocks
```

The "Request task" action should create or reuse a pipeline request with default
settings. The user does not need to choose OCR engine, block detection model, or
Codex configuration.

```text
User clicks "Request task"
      |
      v
create pipeline request
      |
      v
enqueue default task pipeline
      |
      v
show progress indicator
      |
      v
publish task when done or show review-needed state
```

Progress should be visible to all users:

```text
Task generation
[##########----------] 50%
Current step: Extracting pages
```

Admin/debug users get an additional action:

```text
Task generation
[##########----------] 50%
Current step: Extracting pages

[View pipeline status]
```

For now, "admin" can effectively mean all internal users. The permission model
should still be designed so that later we can hide the pipeline inspector from
non-admins without changing the pipeline data model.

## 12. Permissions and Ownership

Pipeline outputs have different ownership levels.

```text
shared source artifacts
  Moodle resource metadata, downloaded PDFs, file hashes, extracted pages,
  extracted images, OCR text, detected blocks

shared published outputs
  admin-approved tasks, script, formulas

user-owned outputs
  personal Codex improvement runs, personal edits, private proposals
```

Normal users:

```text
normal user
├─ can view published tasks and script
├─ can request a missing task with default settings
├─ can see simple progress
├─ can report wrong/missing content
└─ can create a personal Codex improvement proposal
```

Codex runs:

```text
user-owned Codex run
├─ belongs to one user
├─ may improve a task once for that user
├─ does not overwrite shared content
└─ can become an admin-review proposal
```

Admins:

```text
admin
├─ can inspect the full graph
├─ can compare OCR/extraction runs
├─ can rerun stages with another engine/config
├─ can choose active runs
├─ can approve dropped content reasons
├─ can promote user-owned proposals
└─ can publish shared outputs
```

This keeps storage under control because expensive shared artifacts are not
duplicated per user, while user-specific Codex work remains isolated.

## 13. Storage and Scheduling Requirements

The pipeline scheduler should treat every stage as a rerunnable immutable run.
Rerunning a stage never overwrites previous output. It creates a new run and
optionally becomes the active run.

```text
pipeline_run
├─ run_id
├─ source_id
├─ resource_id
├─ file_hash
├─ stage
├─ engine
├─ config_hash
├─ created_by
├─ ownership: shared | user_owned
├─ status: queued | running | ok | warning | failed | needs_review
├─ started_at
├─ finished_at
└─ artifacts
```

```text
active_run_selection
├─ source_id
├─ resource_id
├─ stage
├─ active_run_id
├─ selected_by
├─ selected_at
└─ reason
```

Scheduling should support:

```text
default task pipeline
├─ fetch or reuse Moodle inventory
├─ classify resources
├─ pair assignment and solution PDFs
├─ extract pages
├─ extract text with default OCR/text engine
├─ extract images
├─ detect blocks
├─ curate tasks
└─ publish or mark needs_review
```

OCR experimentation should be expressed as alternate runs:

```text
resource: Aufgabenblatt 01 Lösung.pdf
├─ extract_text / pdftotext / run_123     weak
├─ extract_text / docling / run_456       ok
└─ extract_text / marker / run_789        ok

active text run: run_456
```

The frontend then compares runs instead of overwriting them.

## 14. Implementation Plan

The work should be delivered in small, inspectable slices.

```text
Phase 1: Data contracts
├─ define pipeline source
├─ define resource classification
├─ define run model
├─ define trace edge model
└─ define permissions/ownership fields

Phase 2: Course inventory inspector
├─ add course pipeline route
├─ show resources
├─ show classification buckets
├─ show pairing status
├─ show unknown resources
└─ show simple status chips

Phase 3: Request task UX
├─ reduce task page improvement UI
├─ add Request task action
├─ enqueue default pipeline run
├─ show progress indicator to all users
└─ show View pipeline status action for admin/debug users

Phase 4: Blueprint graph
├─ add React Flow
├─ render course-level graph
├─ render resource-level graph
├─ add node detail panel
├─ show source, process, artifact, review, and publish nodes
└─ support dropped/unused/missing paths visibly

Phase 5: Rerunnable stages
├─ store immutable runs
├─ store active run selection
├─ compare OCR/text extraction outputs
├─ allow admin rerun with another engine/config
└─ mark stale runs when source file hash changes

Phase 6: Promotion and feedback
├─ user feedback creates review items
├─ user-owned Codex runs create proposals
├─ admin can promote proposal to shared output
└─ published output keeps full trace links
```

The first implementation goal should be Phase 1 and Phase 2. They create the
inspection foundation without changing the normal task generation behavior too
much. The Request task simplification should follow immediately after, because
the normal user experience should not expose the pipeline internals.
