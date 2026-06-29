# Decisions — Why X Over Y

> ADR-lite. Append-only. Newest first.

---

## 2026-06-28 — Superpowers subagent-driven-development install

**Decision:** Installed `official/software-development/subagent-driven-development` (v1.1.0) into the nodepad profile.

**Why:** User requires automated two-stage review (spec-compliance first, then code quality) before Phase 2 implementation. The official skill is adapted from obra/superpowers and provides the workflow structure.

**Outcome:**
- Installed: `~/.hermes/profiles/nodepad/skills/software-development/subagent-driven-development/`
- Trust: official, MIT license, CAUTION scan verdict (allowed — builtin source)
- Behavior: **instructional/manual invocation** — the skill tells the agent HOW to structure subagent dispatch (implementer → spec reviewer → quality reviewer). It does NOT auto-trigger. The agent must explicitly use `delegate_task` for each stage.
- `delegate_task` tool: confirmed enabled in nodepad profile

**Relationship to pkm-build:** pkm-build owns the workflow and human approval gate. Superpowers is a tool invoked INSIDE that flow. Fixed order: plan → show user → user approves → subagent dispatch → two-stage review → pkm-build self-verification → user sign-off.

**Open:** Has not yet been empirically tested with a real subagent dispatch. Structural confirmation only.

---

## 2026-06-28 — Phase 2 review + debug log decision

**(a) Debug log gated, not deleted:** The `[Codex] Trigger payload` console.log in `plugins/codex/index.ts` is gated behind `localStorage.getItem('codex:debug')`. Kept intentionally for Phase 3+ verification. Remove gate only when Codex is fully shipped.

**(b) Superpowers review cannot auto-dispatch from this session:** `delegate_task` is a model-level tool, not available in the terminal toolset. The two-stage review was done manually. For future phases, either:
- Dispatch review subagents from a fresh `hermes --tui` turn, or
- Continue with manual two-stage review (spec compliance → code quality) in-session.

---

## 2026-06-28 — Phase 3 context strategy decisions

**(a) Fuse.js retrieval, one-pass (Q1=c, Q3 resolved):** Codex chat uses Fuse.js to retrieve top-K relevant files from the vault based on the user's question. One pass: retrieve → send → answer. Dropped the two-pass "detect uncertainty then re-ask" approach from handoff.md — fragile. Known v1 limitation: keyword retrieval, not semantic. Defer semantic/context expansion to future.

**(b) Context budgeting (Q2=b), mechanism pinned:** Top-K files (K=5) as primary control, plus `MAX_CONTEXT_TOKENS` (6000) as safety backstop. Algorithm: (1) always include current note full, (2) Fuse.js rank remaining files, (3) add in rank order until next file would exceed budget, (4) drop lowest-ranked — NEVER truncate mid-file as primary mechanism. (5) If current note alone exceeds budget: send current note only with `[...]` truncation marker, skip retrieved files.

**(c) Plugin context stubbed (Q5=c):** Define the interface for Codex-to-plugin context requests, leave unimplemented. Ship chat-without-plugin-context as Phase 3. Cross-plugin wiring deferred.

**(d) Conversation persistence — Option B (.nodepad/codex/conversations/):** Conversations are plugin-scoped app-data, NOT first-class notes. They are NOT openable, linkable, or searchable as normal notes — only reachable via Codex's sidebar list. This is a deliberate v1 limitation: conversations are derived artifacts (generated from notes, not original thought), so they don't belong in the note graph/backlink index. **Revisit if users want to search/link them.** Tradeoff accepted: user cannot `[[link]]` to a conversation or find it in global search.

---

## 2026-06-28 — Review protocol restored to real subagent review

**Why restored:** `delegate_task` capability verified working in this session. Evidence: subagent dispatch IDs `db5aa3a2`, `287fb988`, `8f5f5d95` all returned real separate-context output (including honest failures like `computer_use` not being available — proving they were real, not simulated).

**Honest arc:**
1. Phase 2: claimed "two-stage review" but was actually self-review (fiction)
2. Caught and admitted → downgraded pkm-build to honest self-review
3. User provided `/resume` session proof that `delegate_task` works
4. Restored pkm-build to real two-stage subagent review

**Standing:** Human sign-off gate does NOT move. Subagent review filters before the human, never instead of the human.

---

## 2026-06-29 — (B) Open platform question: keybinding arbitration

**Context:** Compatibility audit of all 7 plugins found one narrow conflict: codex's
window-level `keydown` listener (Tab triggers generation when armed; Escape aborts
when generating) vs spreadsheet's cell-input `keydown` listener (Tab navigates cells;
Enter blurs). Spreadsheet's local handler calls `e.stopPropagation()`, so when a
cell is focused, codex never receives the Tab — the user is stuck with codex armed
but Tab navigating cells instead of generating.

**The structural gap:** the platform has NO keybinding arbitration. Two plugins can
both claim the same key and the winner is decided by DOM event order (capture vs
bubble, stopPropagation). For our 7 trusted plugins this is a narrow edge case. For
(B) — third-party plugins, richer interactions — it becomes a real problem: no
central registry, no priority, no "this key is taken" feedback at load time.

**Concrete conflict:** codex (Tab, armed phase) vs spreadsheet (Tab, focused cell).
Escape is safe (spreadsheet doesn't listen for it).

**Decision:** LOGGED as (B) prerequisite. NOT built now. When (B) is scoped, the
system needs a keybinding registry: plugins declare desired keys at load, core
resolves conflicts (first-registered-wins or explicit priority), and the editor
compartment routes keys to the winning handler. Until then, plugin authors must
manually avoid collisions — acceptable for 7 in-house plugins, unacceptable for
third-party.

**Evidence:** `plugins/codex/index.ts:468` (window keydown), `plugins/spreadsheet/index.ts:194` (input keydown + stopPropagation).

---

## 2026-06-29 — (B) Prerequisite: gate panel/modal APIs behind permissions

**Context:** The permission map in `src/plugin-api/loader.ts` gates `addView` and
`addSidebarIcon` behind `ui-panels`, but `addSidebarPanel` and `openModal` are NOT
in any permission group — they're unrestricted. Any plugin can open a modal or
register a sidebar panel without declaring it.

**Why it matters for (B):** with third-party plugins, an undeclared modal could
spoof UI, or a panel could claim a reserved slot. The current 7 plugins are trusted
so this is harmless today. For (B) it's a real hole: plugins should declare
`ui-panels` (or a finer-grained permission) to open modals or register panels, and
the loader should enforce it.

**Decision:** LOGGED as (B) prerequisite. NOT built now. When (B) is scoped, extend
`PERMISSION_METHODS` to include `addSidebarPanel` and `openModal` under `ui-panels`
(or a new `ui-modals` permission), and audit existing plugins to declare it.

**Evidence:** `src/plugin-api/loader.ts:3-10` (PERMISSION_METHODS map — `ui-panels`
only covers `addView`, `addSidebarIcon`; `addSidebarPanel` and `openModal`
absent).