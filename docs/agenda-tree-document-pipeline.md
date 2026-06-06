# Agenda Tree Pipeline

This document captures the high-level model for turning Moodle PDFs into two
separate website areas:

- a lecture/script area
- a tasks area

The key idea is that Moodle files are the source material, but the website
should be organized by meaning, not by raw file order.

## 0. Target Outputs

The pipeline should create two user-facing outputs.

```text
Output 1: Script
├─ generated from B_V
├─ shown as the course script / reading area
├─ owns the table of contents
└─ explains the course topics in a clean learning order

Output 2: Tasks
├─ generated from B_A
├─ shown as a separate tasks page
├─ owns the assignment/task navigation
└─ links each task back to the relevant script topic when possible
```

This gives the core product model:

```text
Moodle course activities U_M
├─ lecture material U_V ───── f_V ─────> script tree B_V ─────> Script + TOC
│                                                  ^
│                                                  |
└─ task material U_A ──────── f_A ─────> task tree B_A ───────> Tasks page
                                                   |
                                                   h
                                                   |
                                      topic links back into B_V
```

## 1. Lecture Tree

The lecture tree describes the knowledge space of a course.

```text
Urbild U_V
= Moodle lecture material
= theory PDFs, slide PDFs, script PDFs, page text, page images

        f_V
        "Which lecture topic does this material explain?"
        |
        v

Bild B_V
= lecture agenda tree
= the script/navigation structure shown in the website's script area
= the source for the generated table of contents
```

Abstractly:

```text
U_V: Lecture PDFs and pages                  B_V: Lecture agenda tree

PDF 1, pages 1-n
PDF 2, pages 1-n
PDF 3, pages 1-n
        ------------------------------->    Course
                                             ├─ Topic 1
                                             │  ├─ Concept 1.1
                                             │  └─ Concept 1.2
                                             ├─ Topic 2
                                             │  ├─ Concept 2.1
                                             │  └─ Concept 2.2
                                             └─ Topic 3
                                                └─ Concept 3.1
```

Each lecture node spans a knowledge area:

```text
Lecture agenda node
├─ title
├─ TOC level
├─ explanation scope
├─ source PDF references
├─ source page ranges
├─ useful diagrams or screenshots
└─ generated script section
```

Example shape for a course:

```text
Course
├─ Introduction
│  └─ spans: motivation, course setup, hardware foundations
├─ Architecture / systems
│  └─ spans: machines, memory, cache, performance models
├─ Networks
│  └─ spans: topology criteria, static networks, dynamic networks
├─ Parallelization
│  └─ spans: dependencies, strategies, synchronization, load balancing
├─ Message passing
│  └─ spans: send/receive, collectives, MPI
├─ Shared memory
│  └─ spans: cache coherence, consistency, multithreading
└─ Applications
   └─ spans: matrix operations, solvers, sorting, numerical examples
```

Important rule:

```text
One PDF can map to many lecture nodes.
One lecture node can receive material from many PDFs.
```

So the mapping is not necessarily one-to-one:

```text
PDF page range A  ----------------------->  Concept A
PDF page range B  ----------------------->  Concept B
PDF diagram C     ----------------------->  Concept B
PDF page range D  ----------------------->  Concept C
```

The script generator should write from `B_V`, not directly from raw PDF order.
The raw PDF order remains useful as a baseline for comparison.

## 2. Task Tree

The task tree describes the exercise space of a course.

It is separate from the lecture tree because the website has a separate tasks
area. Tasks should not be hidden inside the script structure.

```text
Urbild U_A
= Moodle exercise material
= assignment PDFs, task pages, solution PDFs, optional Moodle hints

        f_A
        "Which exercise structure does this material define?"
        |
        v

Bild B_A
= task tree
= the exercise/navigation structure shown in the website's tasks area
= the source for the separate tasks page
```

Abstractly:

```text
U_A: Assignment and solution artifacts       B_A: Task tree

Assignment sheet 01
Solution sheet 01
Assignment sheet 02
Solution sheet 02
Support link
        ------------------------------->    Task area
                                             ├─ Assignment sheet 01
                                             │  ├─ Task 1
                                             │  │  ├─ Part a
                                             │  │  └─ Part b
                                             │  └─ Solution artifact
                                             ├─ Assignment sheet 02
                                             │  └─ Missing solution state
                                             └─ Support link
```

Each task node spans an exercise area:

```text
Task tree node
├─ assignment sheet
├─ task
├─ subtask
├─ expected answer area
├─ solution artifact or missing-solution state
├─ progress state
└─ link to the script topic it practices when possible
```

Example shape for a course:

```text
Tasks
├─ Assignment area 1
│  ├─ Sheet 01
│  │  ├─ Task 1
│  │  ├─ Task 2
│  │  └─ Solution artifact 01
│  └─ Sheet 02
│     ├─ Task 1
│     └─ Solution artifact 02
├─ Assignment area 2
│  ├─ Sheet 03
│  ├─ Sheet 04
│  └─ Sheet 05
└─ Assignment area 3
   └─ Sheet 06
```

Important rule:

```text
The task tree is its own image set.
It links to the lecture tree, but it is not a child of the lecture tree.
```

So the relation between both trees is a cross-reference:

```text
B_A: Task tree                              B_V: Lecture tree

Assignment sheet 03
├─ Task 1
├─ Task 2
└─ Task 3
        ------------------------------->    Network topologies
                                             spans: degree, diameter,
                                             connectivity, bisection width

Assignment sheet 06
├─ Task 1
└─ Task 2
        ------------------------------->    Parallelization
                                             spans: dependencies,
                                             Bernstein conditions,
                                             synchronization
```

Formally:

```text
f_V: U_V -> B_V
     lecture material maps to the lecture tree

f_A: U_A -> B_A
     task material maps to the task tree

h: B_A -> B_V
   task nodes link back to the lecture topics they practice
```

## 3. Combined Course Model

The website should treat both trees as first-class course outputs.

```text
Moodle course
├─ Course activity inventory U_M
│  ├─ files
│  ├─ links
│  ├─ forums
│  ├─ external tools
│  └─ labels / section text
│
├─ Lecture material U_V
│  └─ f_V -> Lecture tree B_V
│          └─ Script area
│
├─ Task material U_A
│  └─ f_A -> Task tree B_A
│          └─ Tasks area
│
└─ Cross-links
   └─ h: task nodes -> lecture nodes
```

This gives three useful outputs:

```text
1. Script
   generated from the lecture tree

2. Tasks
   generated from the task tree

3. Study links
   generated from task-to-lecture references
```

## 4. Automation Plan

The automated pipeline should follow this order:

```text
1. Read Moodle course page as the primary activity inventory
2. Extract all visible Moodle activities into U_M
3. List downloadable file resources as a subset of U_M
4. Label activities as lecture, assignment, solution, link, forum, tool, or label
5. Extract PDF text and useful page images
6. Pair assignment sheets with solution artifacts
7. Build B_V from lecture material
8. Build B_A from assignment and solution material
9. Link B_A nodes to B_V nodes
10. Generate script from B_V
11. Generate tasks view from B_A
12. Keep raw PDF-to-script output as a comparison baseline
```

The comparison baseline is important:

```text
Raw baseline:
PDF order -> direct script

Agenda pipeline:
PDF material -> lecture tree -> script
Task material -> task tree -> tasks
Task tree -> lecture links
```

The agenda pipeline wins only if it stays traceable and produces a better
study experience than the raw baseline.

## 5. Acceptance Criteria

The pipeline is working when:

- lecture and task trees stay separate
- each generated script section has source references
- each task keeps its assignment sheet and solution artifact or missing-solution state
- links, forums, tools, and labels are classified instead of silently ignored
- task nodes can link to relevant lecture nodes
- the raw baseline can be generated for comparison
- no material is silently lost
- generated output remains useful even when some PDFs have weak text extraction
