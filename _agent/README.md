# `_agent/` — Agent Working Memory

This folder is the agent's cross-cutting working memory for the whole project.
The human reads `docs/` for polished, per-feature notes; the agent writes here.

## What lives here

| File | Purpose |
|---|---|
| `README.md` | This file — what the folder is |
| `TASKS.md` | Master queue across the whole project |
| `PROGRESS.md` | Append-only chronological log of all sessions |
| `DECISIONS.md` | Why X over Y (ADR-lite) |
| `blockers.md` | Project-wide open questions needing human input |
| `sessions/` | Optional, one note per work session |

## Rules

- The agent writes ONLY inside `_agent/` and `docs/`.
- Never duplicate a fact — link with `[[wikilinks]]` to `docs/` for the canonical version.
- `PROGRESS.md` is append-only: never edit past entries, only add new ones at the end.
