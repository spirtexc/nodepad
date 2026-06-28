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
