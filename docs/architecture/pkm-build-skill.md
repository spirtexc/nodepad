<!-- BACKUP COPY of the live skill at ~/.hermes/profiles/nodepad/skills/software-development/pkm-build/SKILL.md. The profile version is authoritative (Hermes loads from there). This repo copy is for version history + off-disk backup. After editing the live skill, copy it here verbatim (cp, not edit) and commit + push. Do NOT edit this copy and expect the live skill to follow. -->
---
name: pkm-build
description: >
  Build workflow, map/routing protocol, filing rules, and self-verification for
  the Nodepad PKM app. Load before implementing, extending, or reviewing any
  feature or plugin, or before writing to docs/, _agent/, INDEX.md, or any
  MANIFEST. Architecture invariants are defined in CLAUDE.md (treat as law);
  this skill is the HOW, not the WHAT.
version: 3.8.0
metadata:
  hermes:
    tags: [pkm, nodepad, workflow, map, routing, architecture]
    category: software-development
---

# Nodepad Build

## When to Use
Load before writing or reviewing any code in this repo, adding/changing a
plugin, or writing to docs/, _agent/, INDEX.md, or a MANIFEST.

## Authority & precedence
Architecture invariants live in CLAUDE.md and are LAW. This skill is the HOW.
Precedence: the human's direct instructions and CLAUDE.md > this skill > any
other skill (incl. Superpowers) > defaults. If a task seems to require breaking
an invariant, STOP and flag it — never work around it.

## The thesis (why the rules exist)
The core is a deliberately minimal file-substrate + plugin host. PLUGINS ARE THE
PRODUCT. The plugin API (docs/architecture/plugin-api.md) is the project's spine
— every addition to it is a permanent contract other plugins build on.
The load-bearing question on every plan: "is this a plugin, or is it core?"
A capability belongs in core ONLY if it is general (another plugin would want
it too). A capability shaped to one plugin's needs is a thesis violation.

### Exposing core capabilities to plugins (the DOOR pattern)

When a plugin needs something the core ALREADY maintains (VaultSearch,
BacklinkIndex, TagsIndex, etc.): add a one-line delegation method to the App
interface, re-export the type, grant it under the right permission. Test:
"would another plugin want this?" If yes → plugin API. Implementation that's
just `this.coreObject.method()` = door (correct). Implementation that's >5 lines
= probably building new logic (suspect). See `references/search-api-design.md`
for the Phase 3 pattern (search() delegation + context budget + persistence).

#### Return shape for search APIs: path + excerpt, not path + content

When exposing a search capability, return `{ path, name, score, excerpt? }` —
NOT path+content. Rationale: the consumer calls `readFile()` ONLY for the files
it actually uses (top-K on demand). This makes the context budget work: retrieve
paths first, read until budget exhausted, drop the rest. Returning full content
for every hit would force reading every result upfront and break the "read only
what you use" budget model. Excerpt covers previews/lightweight ranking without
wasted reads. See DECISIONS.md "Phase 3 search()" for the full rationale.

## Known (B) prerequisites (deferred, do not build until (B) is scoped)

These were surfaced during (A) and Phase 3 work. Logged in DECISIONS.md. Do NOT
implement in Phase 3 or earlier — they are platform-level features for (B):

1. **Keybinding arbitration** — no registry; two plugins claiming the same key
   wins by DOM event order. codex armed-Tab vs spreadsheet cell-Tab is the
   concrete collision. (B) needs a keybinding registry: plugins declare desired
   keys at load, core resolves conflicts, routes to winner.
2. **Permission gating for panels/modals** — `addSidebarPanel` and `openModal`
   are unrestricted (not in any permission group). Aspirational `ui-panels`
   declarations today are not enforced. (B) must extend PERMISSION_METHODS and
   audit existing plugins.
3. **getLoadedPlugins() / capability registry** — no API for a plugin to ask "is
   X loaded?" or "what can X provide?" The plugin-context stub returns null
   until this exists. (B) needs either a registry query or an inter-plugin
   event bus.

When logging a new finding that matches one of these shapes, reference the
existing (B) prerequisite instead of creating a new one.

## Map protocol (semantic routing)
Navigate through the map so you never read the whole codebase. Layers:
  INDEX.md (root map) → docs/plugins/<name>/MANIFEST.md (per-plugin map:
  What it does + How / key files) → target code file.
Read in that order; read only what the task needs.

RULE 1 — Map updates are part of the task, not after it.
A task is NOT complete if code changed but the map (INDEX + affected MANIFEST)
wasn't updated to match. Updating the map is the same action as writing code.

RULE 1b — The map's targets must EXIST. A map that points at a non-existent file
is a map that lies (worse than no map — it routes the reader into a 404).
After any map edit, verify every target path resolves:
  test -f <path> for each MANIFEST / doc the INDEX and MANIFESTs reference.
A stale reference isn't "close enough" — it's a broken door. Fix it before
moving on, same as Rule 1.

RULE 1c — Verify before tick: a checkbox flips on EVIDENCE, not on commit.

A checkbox / "done" status is a CLAIM ("this is done"). It may only be set when
there is CAPTURED EVIDENCE the thing actually works — not the belief it was done,
not the fact that a commit exists. The tick points at proof, not at confidence.

- "Verified" means evidence, not a second claim. Writing "done ✓" or "verified"
  without the underlying evidence is NOT verification — it's a second claim
  stacked on the first.
- Evidence by task type:
  - Code feature → captured output showing the behavior runs (the actual log /
    test result), not "logic implemented."
  - Move/refactor → a diff proving behavior unchanged.
  - Doc/map/status update → read the file back and confirm it matches reality
    (the fresh-session guide test).
- "It compiles" / "it builds" is necessary but NEVER sufficient to tick a feature
  box. Compiling is the floor, not proof of correctness.
- THE FALLBACK: if evidence can't be produced, the box stays UNCHECKED and the
  gap is flagged. An honest [ ] beats a false [x]. A false [x] is worse than a
  blank one — it tells the next reader "don't look here, this is finished" when
  it isn't.

After every phase commit, the agent's working-memory files must be current:
TASKS.md ("Current:" header + "Active phase") and each plugin's _todo.md
(checkboxes + "Last reconciled" line). But the checkbox flip is gated on the
evidence gathered during verification (step 6 of the workflow), NOT on the commit
itself. If verification produced real output → tick. If it didn't → leave [ ]
and flag the gap in blockers.md.

RULE 2 — When the map and code disagree, code wins.
If a MANIFEST points to a file/symbol that no longer matches the code, STOP. Do
not guess from the map. Correct the map to match the code and report the
discrepancy. A wrong map is more dangerous than no map — never follow one
silently.

## Migration verification

When a commit claims to "port/move/relocate" code from path A to path B and both
trees still exist, verify faithfulness BEFORE building on top of it:

1. `git diff <sign-off-commit> HEAD -- <path>` — empty output = byte-identical to
   sign-off = clean move. The sign-off commit (the commit that shipped/reviewed
   the work) is the ONLY ground truth for "what we approved."
2. If you don't know the sign-off commit, ASK. Do not assume.
3. `diff -rq <new> <old>` can supplement (shows WHAT changed between old and
   new) but must NEVER be used to judge correctness — "old" trees are stale by
   definition (that's why they were moved away from), and comparing against them
   inverts the verdict (calls progress "regression").
4. Report: byte-identical-to-sign-off / cleaned-up-and-disclosed / silently-gutted.

A clean build (tsc + vite) is necessary but NOT sufficient — a gutted file
still compiles. The diff against the sign-off commit is the evidence. See
`references/migration-verification.md` for the full technique and the 2026-06-29
port audit where the first analysis compared against nodepad_old and produced
exactly the wrong verdict.

### File-level diff vs function-level diff

When the user asks "is feature X untouched?" (e.g. "Phase 2 is untouched"),
a file-level `git diff <sign-off> HEAD -- <file>` may be NON-empty even when
the feature's logic is byte-identical — because shared code was extracted into
a helper module, imports were added, or a new feature was wired into the same
file. This is what happened in this session: index.ts differed from 5b2bd8a at
the file level (crypto extracted to config.ts, chat panel imported) but the
inline-trigger function bodies (detectTrigger, generate, codexExtension,
TriggerWidget, handleKeydown) were byte-identical.

To verify "feature X is untouched," diff the FUNCTION-SPECIFIC lines, not the
whole file:
  git diff <sign-off> HEAD -- <file> | grep -E "^[-+].*detectTrigger|^[-+].*generate|..."
If the only changes are imports, extracted helpers, and new-feature wiring, the
original feature is untouched. Report BOTH: "file differs at the file level
(extraction + new wiring) but the Phase 2 inline logic is byte-identical."

## Workflow — every phase / task, in order (do NOT skip to coding)
1. Route: read INDEX.md → relevant MANIFEST → CLAUDE.md → _agent/TASKS.md →
   tail of _agent/PROGRESS.md. Read only the code the task needs.
2. If anything is ambiguous, ask the human FIRST.
3. Write a short, dependency-ordered plan. List affected modules and smallest
   coherent steps. For limits/budgets (token caps, truncation, edge cases),
   state the exact mechanism — never leave them as vague prose.
4. STOP and show the plan. Write no implementation code until it's approved.
5. Implement ONE task at a time, smallest coherent change per step.
6. Verify against the task's "done when" checks AND the checklist below.
   Re-state which boxes you checked, with concrete evidence (captured output),
   not just claims. See `references/verification-evidence.md` for the evidence
   standard (paste raw output, isolate the claim, show the negative).
7. Update the map (Rule 1) and the journal. Update the plugin's _todo / _changes.
8. Push to the remote: `git push`. The remote (`origin/main`) is the real
   backup; the local disk is just the working copy. A phase isn't truly done
   until it's pushed — a remote three phases stale isn't a real backup.
8b. Skill backup: if you edited this skill (pkm-build SKILL.md), copy the live
   version into the repo as a tracked backup:
     cp ~/.hermes/profiles/nodepad/skills/software-development/pkm-build/SKILL.md \
        docs/architecture/pkm-build-skill.md
   then `git add` + commit + push. The profile version is authoritative; the
   repo copy is for version history + off-disk safety. Without this step, the
   skill that defines how you work is a single-disk asset.
9. Hand off as a reviewable branch/diff, never a silent edit.

### Verification style (user preference — do not deviate)

The user demands EVIDENCE, not claims. "tsc clean" is necessary but never
sufficient. For every verification step:

- **Paste raw tool output** — `ls`, `find`, `git diff`, test stdout — not a
  summary of what the output said. If the output is long, paste the relevant
  excerpt, but paste it.
- **Isolate the claim.** When proving "feature X is untouched," do NOT rely on
  a file-level diff if the file also contains new wiring. Extract the specific
  function bodies and diff those in isolation (see "File-level diff vs
  function-level diff" above and `references/isolated-function-diff.md`). A
  clean build does not prove behavior is unchanged — a gutted file still
  compiles.
- **Show the negative case.** When a branch handles an error/edge case, prove
  it fires: construct the input that triggers it and show the output. Don't
  just assert "the branch exists."
- **Real data over mock claims.** If a search returns ranked results, show the
  actual ranked output with scores. If a budget branch truncates, show the
  `[...]` marker in the actual output.
- **Distinguish inherited from introduced.** When claiming "no `any`" or "no
  dead code" or "no new dependency," verify the claim against the PREVIOUS
  version (the sign-off commit), not just the current state. Pre-existing
  issues are not your regressions — but claiming credit for a clean slate when
  the slate was already dirty is a lie. Report: "no NEW `any` introduced; two
  pre-existing `catch (err: any)` inherited from 5b2bd8a."

### Map-as-fresh-session guide test (run before declaring a phase done)

Before signing off on a phase, verify the map works as a STANDALONE guide for a
fresh session with no memory of the work. Simulate it:
  1. Read ONLY INDEX.md.
  2. Route strictly through INDEX → MANIFEST → _todo → PROGRESS. Do NOT read
     conversation memory or DECISIONS.md for context.
  3. Answer four questions from the map alone:
     - What is this project?
     - What's built so far (phases, plugins)?
     - What's the next task / current state?
     - Where in the code would you go to continue the next phase?
If any answer is wrong or stale, the map has a gap. Fix it before sign-off.
This test caught TASKS.md and _todo.md going stale when Phase 3 shipped — the
code was done but the working-memory files still said "Phase 3 not started."

## Scope discipline: log vs build vs fix

When an audit or review surfaces a problem, the user decides its disposition.
Three distinct actions — do not collapse them:

- **LOG**: record the issue (usually in DECISIONS.md) as a prerequisite for a
  future phase (B). The issue is real but deferred by choice. The log entry
  must name the concrete impact, the mechanism, and what (B) must provide.
- **BUILD**: implement the fix now. The user explicitly asks for it.
- **FIX THE INSTANCE**: patch the specific narrow bug now while deferring the
  structural fix to (B). Example: the codex/spreadsheet Tab collision — the
  structural fix is a keybinding registry (B); the instance fix is a one-off
  guard so the armed-Tab doesn't get swallowed by a focused spreadsheet cell.

PITFALL: do not defer a concrete bug fix the user explicitly asked for by
bundling it under "logged for (B)." If the user says "fix the Tab bug," fix the
Tab bug. If the user says "log the structural gap," log the structural gap. When
in doubt, ask: "patch the instance now, or wait for (B)?" — do not decide
unilaterally and call it "reasonable."

### Log the pattern, not just the instance

When a finding is the Nth occurrence of a recurring shape (not the first),
don't log it as a one-off. Elevate it to a pattern note in DECISIONS.md so the
future phase inherits the GENERAL rule, not a list of specific cases. Format:
"<Instance X> and <instance Y> are the SAME duplication — both re-implement a
capability the core already maintains. This is now N instances of one pattern:
<general rule>. One of (B)'s core jobs is <general fix>." The user explicitly
prefers this — a pattern note is cheaper for (B) to scope than re-discovering
each instance.

### Don't build platform infrastructure before it has citizens

When scoping a "platform" phase (B) — plugin API, registry, permission system,
event bus — the first question is: does it have external plugin authors yet, or
is it still just the original developer + the agent? If no external authors:
scope = "write the rules + gate the two APIs that need gating" (small). If
external authors exist: scope = "build a platform" (large). Do not over-build
a platform before it has citizens. The user will answer this question before (B)
is designed; do not assume the answer.

## Plugin compatibility verification (Layer 2)

"Each plugin compiles" (Layer 1) is NOT "all plugins work together." When adding,
reviewing, or asserting plugin coexistence, audit the REAL conflict points —
grep the source, don't reason from "should be fine":

1. **Editor extensions:** all `addEditorExtension()` plugins share one CM Compartment.
   Confirm each owns its own StateField (no name collisions, no `provide` overrides).
2. **Sidebar/UI:** confirm unique panel/icon ids, independent DOM slots.
3. **Keybindings:** find every `addEventListener('keydown')` — global (window) vs local
   (element). Watch for `preventDefault`/`stopPropagation` starving another handler.
4. **Event hooks:** emitter pub/sub — multiple subscribers don't double-fire or
   depend on order. Verify the emitter doesn't short-circuit on first return value.
5. **Permissions:** cross-check each plugin's declared permissions against the
   permission→method map in src/plugin-api/loader.ts. Note unrestricted methods.
6. **Cross-plugin help** (separate question): do plugins assist each other? grep for
   direct .nodepad/ access (back door), inter-plugin imports, shared events.
   Zero = fully isolated; (B) would be greenfield through the core API (the door).

Report: "A vs B at <mechanism> → <outcome>". See
`references/plugin-compatibility-audit.md` for the full 7-plugin audit technique
and the 2026-06-29 results (one narrow armed-Tab conflict found; otherwise clean).

## Stub purity: no filesystem sniffing for plugin discovery

When a feature depends on "is plugin X loaded?" or "what context can plugin X
provide?", the CORRECT path is a core API (e.g. a future getLoadedPlugins() or
an inter-plugin event bus). A stub MUST be a pure null-object: define the typed
interface, return null/empty, and NOTHING else.

NEVER let a stub "probe" by sniffing .nodepad/<plugin>.yaml, reading another
plugin's config files, or checking for another plugin's side effects. That is
the exact cross-plugin back-door pattern the (A) audit forbids — hidden coupling
through the filesystem. If the discovery API doesn't exist yet, the stub
returns null and the API gap is logged as a (B) prerequisite (same shelf as
keybinding arbitration, permission gating, getLoadedPlugins()).

This session's example: the Phase 3 plugin-context stub (getPluginContext) was
initially planned with a probe() that sniffed graph.yaml/mindmap.yaml in
.nodepad/. Killed on review. The stub returns { mindmap: null, graph: null }
with a fully-typed (but empty) interface. getLoggedPlugins() logged as (B).

## Self-verification checklist
- [ ] No CLAUDE.md invariant violated.
- [ ] Plugin-vs-core boundary respected: nothing core-bound that's plugin-shaped;
      any core/API addition is GENERAL (another plugin would want it).
- [ ] No new dependency without justification; no frontend framework crept in.
- [ ] Note content reads/writes as plain .md via File System Access API.
- [ ] IndexedDB used only for snapshots, never canonical store.
- [ ] App-specific data stays in .nodepad/ — NO proprietary metadata written into
      user note .md files (keeps notes clean/Obsidian-readable).
- [ ] Plugin code uses the contract in plugin-api.md; does not redefine/fork it.
- [ ] If sync touched: offline-timeline and cloud-sync stayed decoupled; the
      tick-to-accept diff-review UI still works.
- [ ] Field/symbol names mean what they say (no "lineStart" holding char offsets).
- [ ] TypeScript compiles clean; no `any` to silence errors.
- [ ] Map updated: INDEX + affected MANIFEST point correctly to what I changed;
      no stale file/symbol references.
- [ ] Behavior matches the approved plan; deviations flagged, not hidden.
- [ ] Pushed to origin — `git log origin/main..HEAD` is empty (work is backed
      up off-disk, not just committed locally).
- [ ] If a plugin was added/changed: Layer 2 compatibility audit run (editor
      extensions, sidebar, keybindings, event hooks, permissions, cross-plugin
      isolation) — not just "compiles."

## Where things go (filing rules — never state a fact twice; link with [[ ]])
- INDEX.md = root router. Short. One line per plugin + link to its MANIFEST.
- docs/ = human-readable, per-feature, polished (the reading layer).
  - Cross-cutting design (spans plugins + core) → docs/architecture/. Never bloat
    main.md; main.md is an index that links out.
  - The plugin contract lives ONLY in docs/architecture/plugin-api.md. Plugins
    reference it; never redefine it.
  - Per-plugin: docs/plugins/<name>/ holds MANIFEST.md, <name>.md (detail spec),
    <name>_todo.md, <name>_changes.md. A trivial plugin may be a single
    docs/plugins/<name>.md — promote to a folder when it grows.
- _agent/ = the agent's cross-cutting working memory (write ONLY here + docs/,
  never the user's real notes): TASKS.md (master queue), PROGRESS.md (append-only
  log), DECISIONS.md, blockers.md, sessions/.

## Asking questions
- About one plugin → "## Open Questions" in that plugin's <name>.md.
- Project-wide blockers → _agent/blockers.md.
- ALWAYS also surface anything blocking to the human in chat. Writing a question
  to a file is NOT permission to guess and keep going.

## Journal / memory protocol
- At task start: read TASKS.md + tail of PROGRESS.md to resume with context.
- During: keep TASKS.md status current (todo / in-progress / done / blocked).
- At task end: APPEND to PROGRESS.md — what changed, why, files touched, which
  checks you verified, anything surprising. Never rewrite past entries.
- Non-obvious choices → append to DECISIONS.md (context, options, choice, why).

## Damage recovery & path resolution

When the user suspects something is "missing" (files, skills, config), do NOT
declare it gone until you have checked BOTH the repo AND the Hermes profile.
The most common failure mode is "wrong path," not "deleted."

### Canonical locations (this profile)
- SOUL.md → `/root/.hermes/profiles/nodepad/SOUL.md` (NOT in the repo root).
- Active skills → `/root/.hermes/profiles/nodepad/skills/<category>/<name>/SKILL.md`.
  The default-profile path `~/.hermes/skills/<name>/` is a DIFFERENT profile; a
  skill can be listed by `hermes skills list` but have its backing file under
  the profile path. Always verify with `find / -name SKILL.md -path "*<name>*"`.
- Repo code → `/home/spi/nodepad/`. Old restore point → `/home/spi/nodepad_old/`
  (intact on disk; also referenced by git commits b1800d6, 2ab53b2).

### Recovery drill (follow in order; do NOT commit or move anything until done)
1. Establish what's actually on disk: `ls` the target, then `find` the whole
   filesystem by name. Trust disk over memory.
2. Identify the ONE thing that can't be rebuilt from elsewhere (usually the
   user's own code/notes, not git-tracked files). Prioritize it.
3. For unstaged deletions in a git working tree: `git restore <files>` — they
   come back from the index, no commit needed.
4. For git-tracked files you need from history: `git show <commit>:<path>` or
   `git log --all --diff-filter=D --name-only` to find when it vanished.
5. Only after the above, report plainly: "X is gone" vs. "X was at the wrong
   path, here it is." Paste the raw `ls`/`find`/`git` output — see the
   "### Verification style (user preference — do not deviate)" section above
   for the paste-raw-output standard (paste tool output, not a summary of what
   it said).
   > Note: this references the Verification style section by its ### heading —
   > don't rename that heading without updating this pointer.

### Rule
A file the registry points to but that 404s is a pathing bug, not a loss. Find
it before you mourn it. See `references/recovery-drill.md` for the full
step-by-step from the 2026-06-29 damage check.

## Review protocol

After implementation, dispatch a real two-stage subagent review via `delegate_task`:

**Stage 1 — Spec compliance:** A fresh subagent reads the diff against the approved plan and checks: does the code do what the plan said? Are there deviations, missed edge cases, or spec violations?

**Stage 2 — Code quality:** A second subagent checks code quality: dead code, misleading names, type safety, invariant violations, missing error handling.

Both subagents return structured verdicts. Surface the diff + verification evidence + both review verdicts together for human sign-off.

The subagent review filters noise before it reaches the human; it is NOT permission to skip showing the plan or the diff. The human remains the final independent gate. Fixed order, never skipped: plan → human approves → build → subagent two-stage review → human final sign-off.

If `delegate_task` is unavailable in the current session type, fall back to an explicit self-review (labeled honestly as such) and note the limitation.
