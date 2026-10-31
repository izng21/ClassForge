<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# Project rules

## Notes vault

The Obsidian vault is `notes/`. It is the project's memory.

### Before starting work

- Read `notes/overview.md` first. Treat it as the source of truth for stack,
  structure, commands, and feature status.
- If the code contradicts the overview, trust the code and flag the mismatch.

### After finishing work

Before you end a task, check whether anything changed that the overview
describes. Update `notes/overview.md` if you:

- added, removed, or changed a feature, or moved its status (e.g. QR scanner done)
- changed the stack, dependencies, env var names, or run commands
- added or moved key folders or changed the DB schema
- made an architecture decision (also add a short dated note in `notes/decisions/`)

How to update:

- Make small, targeted edits to the relevant section. Never rewrite the whole file.
- Keep the existing headings and the "Status" lines accurate.
- Skip the update for bug fixes, styling tweaks, and refactors that change nothing above.
- Mention in your final reply what you changed in the overview.

### Boundaries

- You may edit `notes/overview.md` and write to `notes/decisions/` and `notes/agent/`.
- Do not edit or delete any other note without asking.
- Never put secrets or `.env` values in notes.

## UI work

For any UI change, read `.agents/skills/classforge-design/SKILL.md` first and
follow it exactly. Do not invent new colors, fonts, or spacing. Reuse existing
components. If a design rule is missing, ask or extend the skill file.

<!-- END:nextjs-agent-rules -->
