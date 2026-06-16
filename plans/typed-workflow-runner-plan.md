# Typed Workflow Runner Plan

## Goal

The Moodle pipeline page is a workflow runner and inspector, not a free workflow editor.
It must show a predefined workflow, let the user choose run parameters, and make every
visible connection obey typed input/output contracts.

The later reusable product can be a workflow editor, but this page must stay focused:

- inspect the configured Moodle workflow
- choose safe runtime parameters such as OCR or Codex model
- run from a valid step or selected scope
- inspect node inputs, outputs, status, logs, and artifacts
- show compile or runtime errors at the earliest meaningful place

## Bad State

The graph currently looks like a node editor, but some connections are only visual.
For example, a node may visually show `sheet pdf[]` or `solution pdf[]` while the
consumer lane actually expects a single selected task group, sheet PDF, or extracted
document.

That makes the UI look more powerful than the workflow model really is.

## Design Principle

Treat the Moodle graph as a typed workflow runner:

```text
Workflow definition
  -> compile/validate
  -> runnable plan
  -> runtime state
  -> runner UI
```

The UI must not imply that arbitrary nodes can be connected. Connections are valid
only when the source output port and target input port are compatible.

## Port Model

Each port has three reader-facing properties:

```text
value type     e.g. CourseSource, TaskGroup, PdfResource, ExtractedDocument
cardinality    single | array | optional
runtime state  ready | missing | failed | loading | etc.
```

Visual convention:

```text
round port   = single value
square port  = array / collection
dashed port  = optional value
```

Array ports are not allowed to silently connect to single ports. They need an
explicit map/fan-out boundary.

## Moodle Runner Mapping

```text
Course
  output: course source

Resource Set
  input:  course source
  output: task groups[]     TaskGroup[]
  output: script groups[]   ScriptGroup[]
  output: review items[]    ReviewItem[]

Task groups[]
  input:  task groups[]     TaskGroup[]
  mode:   map / foreach viewer
  output: sheet pdf         PdfResource
  output: solution pdf      PdfResource?

PDF / Pages / Sections / Extraction
  input/output contracts convert PdfResource -> Pages[] -> Sections[] -> ExtractedDocument

Collect Pair
  input:  sheet extraction      ExtractedDocument
  input:  solution extraction   ExtractedDocument?
  output: task input bundle     TaskInputBundle

Codex Transform
  input:  task input bundle
  output: task draft[]

Website Output
  input:  task draft
  output: website task output
```

`Task groups[]` is the important boundary. It is an array node, but the detailed
lane to the right represents the selected item inside the map. Therefore the right
side outputs are single-item ports, not array ports.

## Compile Rules

```text
SourcePort.type must satisfy TargetPort.type
SourcePort.cardinality must satisfy TargetPort.cardinality

array -> single    invalid unless through Map
single -> array    invalid unless through Collect
optional -> required invalid unless guarded or allowed
```

For the Moodle runner, the graph structure is predefined, so the UI is not editing
edges. Still, every visible edge should be explainable by these rules.

## Runner UI Rules

- The graph must show that `Resource Set` outputs collections.
- The graph must show that `Task groups[]` is a map/foreach viewer.
- Selecting an item changes the visible single-item lane.
- A green array node means that node produced/organized its collection, not that
  every downstream step succeeded.
- Item rows inside an array node show the selected item's downstream state.
- The run controls configure execution parameters; they do not edit graph topology.

## Acceptance Criteria

- Array-producing ports render with square connectors.
- Single-value ports render with round connectors.
- `Task groups[]` takes `task groups[]` as an array input and emits selected
  single-item `sheet pdf` / `solution pdf` ports.
- The task-group output preview states that this is a map/foreach selection.
- The generated graph is validated before it is presented as a trustworthy runner.
- Invalid cardinality or value-type edges are surfaced as workflow contract errors.
- Tests cover the typed port semantics for `Resource Set` and `Task groups[]`.
- Tests cover a failing array-to-single edge so the compile rule cannot regress silently.
- Existing graph tests continue to pass.
