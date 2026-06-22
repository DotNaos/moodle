# Naming Inspiration

This is a reference board for renaming the Moodle monorepo. It is not a list of
final name candidates. The goal is to collect useful naming patterns before
inventing or choosing a name.

## Product Context

The project is not only a Moodle client. It is a combined system for:

- course material intake
- PDF, task, script, recording, and calendar workflows
- web, mobile, and browser extension surfaces
- backend services and data pipelines
- personal study automation

The name should be able to carry both the app and the backend system.

## Naming Theory Notes

Useful naming categories:

- Descriptive: says what the product is.
- Suggestive: hints at a benefit, motion, object, or feeling.
- Metaphorical: borrows an image from another domain.
- Abstract: unrelated real word or invented word that can become the brand.
- Coined: made-up word, usually stronger for distinctiveness but easier to make
  sound fake or pharmaceutical.

For this project, descriptive names have been weak so far. `school`,
`moodle-suite`, `studyflow`, and similar names explain the category but do not
create a strong identity. The useful zone is probably suggestive, metaphorical,
or abstract.

## Strong Reference Names

### Developer Tools And Work Surfaces

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Linear | issue tracking | abstract real word | Precise, serious, directional. | A normal word can feel premium when it matches product behavior. |
| Raycast | command launcher | metaphor/action | Feels fast and directional without saying "launcher". | Motion and precision can carry a tool name. |
| Cursor | AI code editor | object/tool | Extremely direct but not generic. | A familiar interface object can become the whole product. |
| Warp | terminal | motion/action | Short, fast, slightly technical. | A motion verb can imply speed without sounding like marketing. |
| Zed | code editor | short abstract | Minimal, sharp, developer-native. | Very short names work if they feel confident. |
| Vercel | deployment platform | coined/abstract | Distinctive and infrastructure-grade. | Invented names can work when they avoid cute suffixes. |

Takeaway:

These names feel serious because they avoid explaining too much. They are short,
confident, and mostly not built from obvious category words.

### Knowledge, Notes, And Personal Systems

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Obsidian | knowledge base | material metaphor | Dark, durable, object-like. | Material names can make software feel tactile and permanent. |
| Notion | workspace/docs | abstract real word | Broad, flexible, calm. | A broad mental noun can stretch across many workflows. |
| Readwise | reading/highlights | compound/suggestive | Clear but not too childish. | Compounds can work if they are restrained. |
| Tana | notes/PKM | short abstract | Soft, memorable, not overexplained. | A short neutral name can become category-specific over time. |
| Capacities | object-based notes | conceptual | Describes a mental model, not a feature. | Naming the organizing principle can be stronger than naming the tool. |
| Anytype | object workspace | conceptual compound | Broad, technical, extensible. | A system name can imply flexible data shapes. |
| Logseq | local-first knowledge graph | technical compound | Developer-ish, graph/data feel. | More technical names are acceptable for power-user products. |
| Heptabase | visual knowledge base | coined compound | Systemic, structured, slightly technical. | "Base" names can imply a knowledge substrate. |

Takeaway:

The best knowledge-tool names do not say "study" or "learn". They name a
material, mental state, system shape, or organizing principle.

### Browsers, Canvases, And Work Environments

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Arc | browser | geometry/metaphor | Short, spatial, elegant. | Geometry words can imply interface structure. |
| Dia | browser | short abstract | Small, clean, personal. | Three-letter names can feel premium if not too cute. |
| Comet | browser | motion/object metaphor | Fast, memorable, cosmic. | Natural phenomena can imply movement and intelligence. |
| Atlas | browser | myth/object metaphor | Knowledge, navigation, world-scale. | Reference names work when they fit the product job. |
| Coda | docs/app platform | music/metaphor | Feels like composition and closure. | Creative-domain words can carry authoring tools. |
| Canvas | design/work surface | object/metaphor | Immediately spatial. | Surface names are useful when the product is an environment. |

Takeaway:

If this project is framed as a new study/work environment, place and surface
metaphors are worth exploring. Avoid names that sound like school software.

### Infrastructure And Backend Systems

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Railway | hosting platform | infrastructure metaphor | Clear path/deployment metaphor. | Infra names can be friendly without being childish. |
| Fly | app hosting | motion/action | Tiny, fast, memorable. | Short verbs can work when the product experience is speed. |
| Neon | database platform | visual/material | Bright, technical, modern. | Visual words can make infra memorable. |
| Supabase | backend platform | compound | Clearly evokes a base/backend layer. | Compounds can work when the second half is infrastructural. |
| Turso | database platform | coined | Distinctive, compact. | Abstract infra names can be short and hard-edged. |
| Upstash | serverless data | compound/action | Suggests storage and immediacy. | Action plus storage can work for backend tools. |
| Sentry | monitoring | role/metaphor | Protective, serious. | A role noun can describe what the system does. |
| PostHog | analytics | weird mascot-ish | Memorable and opinionated. | Weird can work, but only if the brand commits to it. |
| Resend | email API | action verb | Plain, developer-clear. | A simple command can become a strong devtool name. |
| Tailscale | networking | technical metaphor | Networking feel without saying VPN. | Technical metaphors can be distinctive and credible. |

Takeaway:

Backend/infrastructure names can be more technical and still brandable. This
matters because the repo will include a real backend, not only an app.

### Agentic And Automation Tools

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Claude | AI assistant | human name | Calm, high-trust, non-technical. | Human names make agents feel approachable, but less system-like. |
| Cursor | AI coding | object/tool | The AI is attached to the work surface. | Naming the interface object can be stronger than naming the AI. |
| v0 | UI generation | terse technical | Feels like a primitive or starting point. | Technical shorthand can work for builder tools. |
| Bolt | app generation | action/object | Fast and energetic. | High-energy names can work, but risk sounding generic. |
| Lovable | app generation | emotional adjective | Memorable, but polarizing. | Emotional names are risky for serious technical products. |
| Devin | coding agent | human name | Agent identity first. | Human names fit autonomous agents, less so a monorepo platform. |

Takeaway:

This project should probably not use an agent-person name. The agents are part
of the system, but the name should cover material, workspace, app, backend, and
automation together.

### Research, Literature, And Evidence Tools

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Zotero | reference manager | coined | Distinctive, academic without saying "paper". | A strange coined name can become trusted if the product is useful. |
| Mendeley | reference manager | surname-like coined | Feels scholarly and established. | Academic products can carry longer, softer names. |
| EndNote | reference manager | descriptive compound | Clear and field-specific. | Direct naming works when the category is already precise. |
| Paperpile | reference manager | object compound | Physical and concrete. | A pile/stack/archive metaphor fits PDF-heavy workflows. |
| ReadCube | paper manager | object/system compound | Reading plus structured container. | Container metaphors can make reading feel organized. |
| Elicit | AI research | action verb | Scholarly, precise, active. | A strong verb can imply extraction without saying "AI". |
| Scite | evidence research | altered spelling | Citation/science hint in a compact form. | Misspellings can work only when the root is obvious. |
| Consensus | evidence search | conceptual | Says "agreement/evidence", not "search". | Abstract research goals can become product names. |
| Semantic Scholar | research search | descriptive/conceptual | Serious and explicit. | Descriptive names can work in institutional contexts. |

Takeaway:

Research tools often name the output state: evidence, consensus, citation,
paper organization, or scholarly retrieval. For this project, this suggests
routes around trace, source, proof, index, recall, extraction, and material
organization.

### Capture, Memory, And Personal Context

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Granola | AI meeting notes | unrelated real word | Friendly, tactile, memorable. | A non-category word can work when the product voice is strong. |
| Rewind | memory capture | action metaphor | Instantly communicates replay and recall. | Time-control verbs fit memory products. |
| Limitless | memory/wearable AI | aspirational adjective | Big and broad. | Powerful but risky: can feel generic or overpromising. |
| Mem | notes/memory | shortened root | Extremely compact, memory-linked. | Short fragments can be strong if the root is obvious. |
| Reflect | notes | action/concept | Calm and thoughtful. | A mental action can fit personal knowledge tools. |
| Bear | markdown notes | unrelated object/animal | Warm and memorable. | Whimsical names work only with a clear product personality. |
| Craft | documents | work/action noun | Serious, creative, hands-on. | A creation verb/noun can support writing and documents. |
| RemNote | notes/flashcards | compound | Directly ties memory and notes. | Clear but less premium; useful as an anti-cringe boundary. |

Takeaway:

Memory tools split into two camps: calm mental actions (`Reflect`, `Rewind`) and
unexpected object names (`Granola`, `Bear`). For this project, mental-action
names may fit better than cute object names because the system includes backend
and automation work.

### Library, Archive, And Catalog Tools

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Calibre | ebook manager | measurement/quality word | Literary, serious, technical enough. | A word from a neighboring domain can feel natural. |
| DEVONthink | document database | compound/brand family | Strong "thinking archive" signal. | Document systems can use cognition/archive language. |
| Pinboard | bookmarking | object/work surface | Concrete and durable. | Old physical organization metaphors still work online. |
| Raindrop | bookmarking | natural object/metaphor | Soft but visual. | Natural metaphors can make collecting feel light. |
| Pocket | read-it-later | object/container | Obvious and tactile. | Container names are good for capture products. |
| Instapaper | read-it-later | speed/object compound | Slightly dated but clear. | "Paper" remains useful when material is central. |

Takeaway:

Archive products often use containers, surfaces, and library-adjacent words.
This project has a real archive/material angle, but the name should not sound
like only a bookmarking or note app.

### Typography, Text, And Document Systems

| Name | Product | Pattern | Why It Works | What To Learn |
|---|---|---|---|---|
| Noto | font family | coined with hidden meaning | Short, smooth, text-native. | Excellent sound direction, but too occupied as a candidate. |
| Inter | font | short abstract | Neutral and infrastructural. | Very plain names can become strong in technical contexts. |
| Sanity | content platform | abstract real word | Clear mental model: content should be sane. | A product can name the desired state. |
| Contentful | content platform | descriptive coined | Clear category signal. | Useful as an anti-pattern if the goal is less SaaS-like. |
| Ghost | publishing | metaphor | Minimal, memorable, writerly. | A strong metaphor can cover app and platform. |

Takeaway:

Text-system names are relevant because this project processes PDFs, scripts,
tasks, pages, and generated study artifacts. `Noto` is a good style reference,
but not a candidate because it is heavily occupied by Google's font family and
other apps.

## Patterns Worth Exploring

### 1. Material Names

Reference feel: `Obsidian`, `Neon`.

Why this fits:

- The product works with PDFs, scripts, tasks, recordings, and extracted
  artifacts.
- Material names make software feel durable and physical.
- This route avoids school/study cliches.

Watch out:

- Too elegant can become vague.
- Too literal can sound like a note app only.

### 2. Surface Or Workspace Names

Reference feel: `Arc`, `Dia`, `Canvas`, `Notion`.

Why this fits:

- The product is an alternate surface over Moodle.
- Web, mobile, extension, and backend can all belong to one workspace.
- It supports a brand that is more than a pipeline.

Watch out:

- Generic workspace names are crowded.
- Avoid names that sound like project management software.

### 3. Motion Or Transformation Names

Reference feel: `Raycast`, `Warp`, `Fly`, `Comet`.

Why this fits:

- The product transforms course material into usable study outputs.
- It has pipelines, extraction, conversion, and automation.

Watch out:

- Speed names can sound shallow if they ignore studying and trust.
- Avoid obvious flow names like `StudyFlow` or `CourseFlow`.

### 4. System / Substrate Names

Reference feel: `Vercel`, `Turso`, `Tailscale`, `Supabase`, `Anytype`.

Why this fits:

- The repo is a monorepo with apps, services, packages, scripts, and pipelines.
- It needs to sound credible as infrastructure, not only a UI.

Watch out:

- Coined system names can quickly sound fake.
- Avoid SaaS endings like `-ify`, `-ly`, and lazy `-io` naming.

### 5. Role Or Guardian Names

Reference feel: `Sentry`.

Why this fits:

- The product protects attention, organizes course chaos, and keeps track of
  study state.

Watch out:

- Role names can feel too serious or security-like.
- Human/assistant names probably do not fit the whole system.

## Anti-Inspiration

Avoid these directions:

- Direct school words: `school`, `study`, `learn`, `student`, `class`.
- Direct Moodle words unless the project should stay permanently Moodle-bound.
- Generic suite names: `moodle-suite`, `moodle-platform`, `study-hub`.
- Overexplained pipeline names: `courseflow`, `studyflow`, `learnstack`.
- Fake SaaS polish: names that sound like random smooth syllables with no
  anchor.
- Cute EdTech names.
- Names that only fit the frontend app but not backend services.
- Names that only fit the backend but not the user-facing app.

## Early Naming Routes To Try Later

These are not name candidates. They are routes for the next generation round.

| Route | Seed Concepts | Good Reference Names |
|---|---|---|
| Artifact / Material | page, sheet, grain, slate, archive, layer, trace | Obsidian, Neon |
| Study Surface | desk, room, field, pane, window, arc, lens | Arc, Dia, Canvas |
| Transformation | cast, warp, fold, extract, distill, route | Raycast, Warp, Comet |
| System Layer | base, stack, substrate, kernel, lattice, mesh | Vercel, Supabase, Tailscale |
| Memory / Recall | mark, trace, index, signal, recall, map | Readwise, Logseq, Notion |
| Guardian / Operator | sentry, keeper, scout, pilot, guide | Sentry |
| Evidence / Source | proof, cite, source, origin, claim, reference | Elicit, Scite, Consensus |
| Archive / Container | pocket, pile, stack, shelf, vault, capsule | Paperpile, Pocket, ReadCube |
| Text / Notation | note, glyph, mark, line, script, codex, folio | Noto, Inter, Ghost |

## Availability Guardrail

Do not promote a name from inspiration to candidate if it is already obviously
occupied by a major product, app, package, or platform in a nearby category.

Before a name becomes a serious candidate, check at least:

- web search
- GitHub organization and repository names
- npm package names if it could become a package scope
- App Store / Play Store if it sounds app-like
- obvious domain and trademark collisions

This is not a legal trademark review. It is only a first-pass filter so names
like `Noto`, `Zed`, `Arc`, `Atlas`, and `Notion` stay as inspiration, not
candidates.

## What A Good Name Should Do Here

- Sound like a real product, not a repo cleanup.
- Work for both app and backend.
- Avoid direct school/Moodle/study wording.
- Be pronounceable in German and English.
- Be short enough for a GitHub repo.
- Feel calm, sharp, and technical.
- Have enough meaning to guide identity, but not so much that it boxes the
  product in.

## Sources

- Linear: https://linear.app
- Raycast: https://www.raycast.com
- Cursor: https://cursor.com
- Warp: https://www.warp.dev
- Zed: https://zed.dev
- Vercel: https://vercel.com
- Obsidian: https://obsidian.md
- Notion: https://www.notion.com
- Readwise: https://readwise.io
- Tana: https://tana.inc
- Capacities: https://capacities.io
- Anytype: https://anytype.io
- Logseq: https://logseq.com
- Heptabase: https://heptabase.com
- Arc: https://arc.net
- Dia: https://www.diabrowser.com
- Comet: https://www.perplexity.ai/comet
- Atlas: https://chatgpt.com/atlas
- Coda: https://coda.io
- Railway: https://railway.com
- Fly: https://fly.io
- Neon: https://neon.com
- Supabase: https://supabase.com
- Turso: https://turso.tech
- Upstash: https://upstash.com
- Sentry: https://sentry.io
- PostHog: https://posthog.com
- Resend: https://resend.com
- Tailscale: https://tailscale.com
- Zotero: https://www.zotero.org
- Paperpile: https://paperpile.com
- Elicit: https://elicit.com
- Scite: https://scite.ai
- Semantic Scholar: https://www.semanticscholar.org
- Granola: https://www.granola.ai
- Bear: https://bear.app
- RemNote: https://www.remnote.com
- Noto: https://fonts.google.com/noto
- Brand-name type reference: https://howbrandsarebuilt.com/types-of-brand-names/
- Naming process reference: https://cliquestudios.com/clique-university/name-your-brand
- Trademark distinctiveness reference: https://en.wikipedia.org/wiki/Trademark_distinctiveness
