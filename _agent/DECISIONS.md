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
