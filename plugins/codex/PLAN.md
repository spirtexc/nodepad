# Codex Plugin — Planning Document

A plugin that lets you type `//your prompt` in the editor and receive AI-generated
output inline, like GitHub Copilot but driven by a prompt you write yourself.

Fill in your answers under each question. When done, hand this back and the plugin will be built to spec.

---

## 1. Trigger Syntax

How should the plugin detect that you want AI output?

**Options:**

- `//` at the start of a line — e.g. `// summarise the paragraph above`
- `//` anywhere inline — e.g. `The capital of France is //answer`
- A keyboard shortcut (e.g. `Ctrl+Space`) to trigger on the current line
- A command palette entry (Ctrl+P → "Ask AI")

> **Your answer:**

- `//` anywhere inline — e.g. `The capital of France is //answer`

---

## 2. Output Style

Where and how should the result appear?

**Options:**

- **Ghost text** — faint text appears after the `//` line as you type, `Tab` to accept (like Copilot)
- **Replace in place** — `//` line is deleted and replaced with the AI output when confirmed
- **Insert below** — output is inserted on the next line(s), `//` line stays until you delete it
- **Floating popup** — small popup appears below the cursor, click or press `Enter` to insert

> **Your answer:**
>
> While the user is still typing on the `//` line (or across multiple lines), show a small
> **trigger indicator symbol** (e.g. `⏎` or `▶`) at the end of the last line as a widget.
> The user can either:
>
> - **Click** the symbol to start generation
> - Press **`Tab`** to start generation
>
> Once triggered, the `//prompt` text is **replaced in place** with the AI output (streaming or full).
> The indicator disappears as soon as generation starts.

---

## 3. Context Sent to the AI

What content should be included in the prompt besides the `//` command?

**Options:**

- Only the `//` line text (minimal, fast)
- The entire current note
- N lines above the `//` line (e.g. 20 lines for local context)
- The note's frontmatter + the `//` line
- A mix: short notes → full note, long notes → surrounding N lines

> **Your answer:**
>
> **Explicit line range syntax** — user can type a range inline:
>
> ```
> // can you explain more on this part (line 1-10)
> ```
>
> The plugin parses `(line X-Y)` out of the prompt, pulls those lines from the note,
> and sends them as context alongside the prompt text.
>
> **Auto-suggest while typing** — as soon as the user types `//`, show a faint gray
> hint at the end of the line suggesting the nearest relevant range, e.g.:
>
> ```
> // |                          (line 14-27) ←  gray ghost suggestion
> ```
>
> The suggested range is the surrounding paragraph or the last N lines above the cursor.
> The user can accept the suggestion with `→` (right arrow) or ignore it and type their own range.

---

## 3b. Context — Follow-up Details

**3b-i. How is the auto-suggested line range calculated?**

- Lines of the surrounding paragraph (blank-line bounded)
- Fixed window: e.g. 10 lines above the `//` line
- The last heading section (from the nearest `#` above to the next `#`)
- Smart: short note → whole note, long note → surrounding paragraph

> **Your answer:**

---

**3b-ii. If no range is given at all (bare `// summarise this`), what context is sent?**

- Whole note
- Surrounding paragraph only
- No context — prompt only
- Same as the auto-suggested range (whatever was shown in gray)

> **Your answer:**

---

**3b-iii. Is the `(line X-Y)` syntax stripped from the prompt before sending to the AI?**

- Yes — clean prompt sent, line content injected separately as a context block
- No — sent as-is and the AI figures it out

> **Your answer:**

---

## 4. AI Provider

Which AI backend should the plugin call?

**Options:**

- **Claude (Anthropic API)** — needs an API key; browser `fetch` is blocked by CORS so requires a local proxy or Electron
- **OpenAI (GPT-4o / GPT-4o-mini)** — same CORS issue as Claude
- **Ollama (local)** — runs on `localhost:11434`, no CORS issue, fully offline, no API key needed
- **Custom endpoint** — user provides their own URL + key in plugin settings

> **Your answer:**

- **Custom endpoint** — user provides their own URL + key in plugin settings

---

## 5. API Key / Configuration

How should the user provide credentials?

**Options:**

- Hardcoded during development (just for testing, remove before shipping)
- A settings panel inside the plugin (stored in `localStorage` or `IndexedDB`)
- Read from a `.env` file at the vault root (e.g. `CODEX_API_KEY=sk-...`)
- Prompt the user once on first use and remember it

> **Your answer:**
>
> **Settings panel inside the plugin**, credentials stored in the vault at:
> ```
> .nodepad/codex.yaml     ← AES-256-GCM encrypted
> ```
>
> **Encryption approach:**
> - Algorithm: AES-256-GCM via browser Web Crypto API (`crypto.subtle`) — no extra library needed
> - Key: random 256-bit key generated on first run, stored in IndexedDB under `codex:encryption-key`
> - Protects the file at rest — if the vault is shared or cloud-synced, the raw API key
>   is never readable from the file alone
>
> **Flow:**
> 1. First run → plugin generates encryption key → saves to IndexedDB
> 2. User opens settings panel → enters API endpoint URL + API key
> 3. Plugin encrypts credentials → writes `.nodepad/codex.yaml` via File System Access API
> 4. On every load → reads key from IndexedDB + reads file → decrypts → uses credentials

---

## 5b. `.nodepad/` — Standard Plugin Config Folder

> **Architectural decision: applies to ALL Nodepad plugins, not just Codex.**

All plugins that need to persist configuration should use a single hidden folder
in the vault root, one YAML file per plugin:

```
vault-root/
└── .nodepad/
    ├── codex.yaml          ← Codex (API credentials, AES-256 encrypted)
    ├── timeline.yaml       ← Timeline plugin settings (future)
    ├── graph.yaml          ← Graph View settings (future)
    └── cloud-sync.yaml     ← Cloud Sync credentials (future, also encrypted)
```

**Conventions:**
- Folder: `.nodepad/` — hidden, follows `.obsidian/`, `.git/`, `.vscode/` convention
- Format: YAML — human-readable if the user needs to inspect or hand-edit
- Sensitive values (API keys, tokens): AES-256-GCM encrypted
- Non-sensitive values (UI prefs, toggles): plaintext YAML
- Users with the vault in a git repo should add `.nodepad/` to `.gitignore`

**Why not IndexedDB only?**
IndexedDB is tied to the browser origin. If the user opens the vault in a
different browser or machine, or clears browser data, all settings are lost.
Storing in the vault folder means config travels with the vault — same
behaviour as Obsidian's `.obsidian/` folder.

---

## 6. Streaming vs Wait

Should the response appear word-by-word as it streams, or only after the full response arrives?

**Options:**

- **Streaming** — tokens appear progressively (feels alive, good for long outputs)
- **Wait for full response** — simpler to implement, shows all at once
- **Wait with loading indicator** — a spinner or `…` placeholder while waiting

> **Your answer:**

- **Streaming** — tokens appear progressively (feels alive, good for long outputs) when streaming a spinner or `…` placeholder while waiting disappears when streaming is done.

---

## 7. Multi-line Output

If the AI returns multiple paragraphs or a list, how should that be handled?

**Options:**

- Insert as-is (raw text, possibly multi-line)
- Insert as a Markdown block (e.g. wrap in a blockquote or code fence)
- Only accept single-line responses; truncate at the first newline

> **Your answer:**

- Insert as a Markdown block (e.g. wrap in a blockquote or code fence)

---

## 8. Cancellation

Should the user be able to cancel a pending request?

**Options:**

- `Escape` key cancels and removes the ghost text / loading indicator
- No cancellation — wait for the response or navigate away
- Timeout after N seconds and show an error

> **Your answer:**

- `Escape` key cancels and removes the ghost text / loading indicator

---

## 9. Note Context Awareness

Should the plugin know about other notes in the vault?

**Options:**

- No — only the current note
- Yes — include backlinks or `[[wikilinks]]` referenced in the current note
- Yes — allow `//summarise [[other-note]]` style cross-note prompts

> **Your answer:**

- Yes — include backlinks or `[[wikilinks]]` referenced in the current note

---

## 10. Error Handling

What should happen when the API call fails (network error, bad key, rate limit)?

**Options:**

- Show a small inline error message where the ghost text would appear
- Show a toast / status bar message
- Log to console only (silent fail)
- Show a modal with the error detail

> **Your answer:**

- Show a toast / status bar message with the error detail

---

## 11. History

Should the plugin remember past `//` prompts and their outputs?

**Options:**

- No history
- Remember the last N prompts in `localStorage` (accessible via a small UI)
- Integrate with the offline-timeline plugin (each AI response saved as a snapshot)

> **Your answer:**

---

## 12. Scope

Should this plugin only work in the main note editor, or also in other places?

**Options:**

- Main editor only
- Also in any CodeMirror instance (e.g. spreadsheet cells if they use CM)
- A dedicated "AI scratchpad" panel in the sidebar

> **Your answer:**

## Should this plugin only work in the main note editor

## 2b. Trigger Indicator — Follow-up Details

Based on your answer to Q2, a few details need pinning down:

**2b-i. What does the indicator look like?**

- A small inline icon widget at the end of the line (e.g. `▶ Generate`)
- Just a blinking cursor-style symbol
- A subtle pill button with text, e.g. `[ ↵ generate ]`

> **Your answer:**

---

**2b-ii. Multi-line `//` prompts — how does that work?**

Example — does this mean the prompt is lines 2–3?

```
Some existing text
// Write a haiku about
// the ocean at night
More existing text
```

- Yes — consecutive `//` lines are treated as one combined prompt
- No — only the single line where the cursor sits is the prompt

> **Your answer:**

---

**2b-iii. After generation — what happens to the `//` prefix?**

If the prompt was `The capital of France is //answer` and the AI returns `Paris`:

- Option A: Full line becomes `The capital of France is Paris` (prefix removed)
- Option B: Line becomes `The capital of France is //answer → Paris` (shows origin)
- Option C: `//answer` is replaced, `//` marker removed, result inserted inline

> **Your answer:**

- Option C: `//answer` is replaced, `//` marker removed, result inserted inline

---

**2b-iv. If the output is multi-line, where does it go?**

If the prompt was on a single inline `//` and the AI returns 3 sentences:

- Insert all 3 sentences replacing the `//prompt` inline (may break the sentence)
- Insert the output on new lines below the current line
- Truncate to one line for inline triggers; use line-start `//` for multi-line output

> **Your answer:**

---

---

## 13. AI Assistance Modes — Build Phases

Beyond the `//` inline trigger, there are four distinct ways AI can help users.
Decide which phases you want and in what order.

---

### Mode 1 — Reactive Inline (Phase 1, what you are planning now)

User explicitly asks inside the editor using `//`.

```
The capital of France is //answer
// summarise this section
// explain (line 1-10)
```

**Solves:** Writing assistance, on-demand answers while editing.
**Limitation:** User has to think to use it.

> **Include in build?** Yes — this is Phase 1.

---

### Mode 2 — Conversational Chat Sidebar (Phase 2)

A persistent chat panel in the sidebar that knows the entire vault.
User can ask questions in natural language without touching the editor.

```
You:  What did I decide about the database last month?
AI:   In meeting-notes/2024-11.md you decided to use PostgreSQL
      because of the team's existing expertise. risks.md also notes
      that migration from SQLite is the main blocker.

You:  What is blocking the Q1 launch?
AI:   Based on your notes: risks.md lists 3 open blockers,
      q1-plan.md has 4 unchecked tasks, and your last meeting note
      mentions "waiting on design approval".
```

**Solves:** Your vault becomes queryable like a second brain — not just
searchable by keyword but understandable by meaning across all files.
**This is the highest day-to-day value** — users would use it constantly
without changing how they write.

> **Include in build?**
>
> **Your answer:** yes, this is the second option to do a conversation with asking what i have in my notes and get a answer from the ai.

---

**13a. Chat context source — which files does the chat panel search?**

- Current file only
- All files in the vault (full index)
- User selects a folder scope per conversation
- Hybrid: starts with current file, expands to vault if no answer found

> **Your answer:**

- Hybrid: starts with current file, expands to vault if no answer found

---

**13b. Chat history — is the conversation saved?**

- Session only (cleared on refresh)
- Saved per vault in IndexedDB
- Saved as a `.md` note in the vault (so it becomes part of your knowledge base)

> **Your answer:**

- Saved as a `.md` note in the vault (so it becomes part of your knowledge base)

---

### Mode 3 — Ambient / Proactive Suggestions (Phase 3)

AI watches passively and surfaces insights without being asked.
Runs on file open, file save, or on a background timer.

| Event                       | AI notices                      | What user sees                               |
| --------------------------- | ------------------------------- | -------------------------------------------- |
| Open a note                 | Similar notes exist             | _"3 related notes"_ badge in sidebar         |
| Write a concept             | You wrote about it before       | _"You mentioned this in meeting-2024-03.md"_ |
| Create a new note           | Title overlaps existing content | _"This overlaps with project-alpha.md"_      |
| Note not opened in 60+ days | Potentially stale               | _"This note may be outdated"_                |
| Paste a URL                 | —                               | Inline AI summary below the link             |

**Solves:** Forgotten notes, duplicate thinking, unconnected ideas — the
core problem of large vaults where things get lost.

> **Include in build?**
>
> **Your answer:**

---

**13c. How intrusive should ambient suggestions be?**

- Silent badge only (number on sidebar icon)
- Inline hint text at the top of the note (dismissable)
- A dedicated "Insights" panel in the sidebar
- Notification toast in the status bar

> **Your answer:**

---

### Mode 4 — Structural Organisation (Phase 4)

AI helps maintain and improve the vault's knowledge graph itself.

```
// auto-tag this note          → suggests frontmatter tags
// find duplicates             → scans vault, shows similar notes
// suggest links               → finds [[wikilinks]] you haven't made yet
// create index of this folder → generates a Map of Content note
// split this note             → long note broken into linked smaller notes
```

**Solves:** Vault entropy — over time notes become disorganised,
unlinked, and inconsistent. AI acts as a vault gardener.

> **Include in build?**

> **Your answer:**yes

---

### Mode 5 — Plugin Context Sources (Phase 2+)

Other installed plugins can feed structured context into the AI,
making answers significantly more accurate than raw text alone.

| Plugin                | What it contributes             | How                                         |
| --------------------- | ------------------------------- | ------------------------------------------- |
| **Mindmap**           | Heading tree of any note        | `parseHeadings()` → outline sent as context |
| **Graph View**        | `[[wikilink]]` relationship map | Which files connect to the current one      |
| **Graphiti** (future) | Temporal knowledge graph        | Entity relationships + history across vault |

**How it works:** Before calling the AI, Codex checks which context
plugins are loaded and assembles a richer prompt:

```
[Topic structure from Mindmap]
# Project Alpha > Risks > Infrastructure

[Related notes from Graph View]
risk-register.md, q1-review.md

[User prompt]
// what are the risks in this project?
```

> **Which context plugins should Codex use if available?**
>
> **Your answer:**

---

## Build Order Summary

Fill in your priority (1 = build first, skip = not needed):

| Phase  | Feature                                 | Priority      |
| ------ | --------------------------------------- | ------------- |
| 1      | `//` inline trigger in editor           | 1 — confirmed |
| 2      | Chat sidebar panel                      |               |
| 3      | Ambient proactive suggestions           |               |
| 4      | Structural organisation commands        |               |
| 2+     | Plugin context sources (mindmap, graph) |               |
| Future | Graphiti knowledge graph backend        |               |

---

## Summary Checklist

Once you fill in the answers above, confirm the items below so nothing is missed:

- [ ] Trigger syntax decided
- [ ] Output style decided
- [ ] AI provider + API key approach decided
- [ ] Streaming preference decided
- [ ] CORS / proxy strategy decided (if not using Ollama)
- [ ] Cancellation behaviour decided
- [ ] Error display decided
- [ ] AI assistance modes and build order decided
- [ ] Chat sidebar scope and history decided
- [ ] Ambient suggestions intrusiveness level decided
- [ ] Plugin context sources decided
