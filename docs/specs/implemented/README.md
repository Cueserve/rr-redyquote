# Implemented design specs

Specs whose design has **shipped as code**, kept here because part of their prose has no
permanent home yet.

## Why this folder exists

`docs/specs/` holds transient specs that are deleted once absorbed. That rule assumed one
transition — design, then delete. In practice there are two, and conflating them is what put
a wrong instruction into [CLAUDE.md](../../../CLAUDE.md) for four days:

| State           | Meaning                                                 | Lives in                  |
| --------------- | ------------------------------------------------------- | ------------------------- |
| **Designed**    | Approved, not built. Reading it tells you what to build | `docs/specs/`             |
| **Implemented** | Built and merged. Reading it tells you what exists      | `docs/specs/implemented/` |
| **Absorbed**    | Every durable claim has a permanent home                | nowhere — deleted         |

A spec sitting in `docs/specs/` reads as pending work. Once the code has shipped, that is a
false instruction — an agent will build what is already there. Moving the file is what makes
the distinction visible in a directory listing, without deleting rationale that is not
recorded anywhere else yet.

## Rules for a file in here

1. **Its header states `Status: Implemented`**, names the PR that shipped it, and carries a
   `§0` block listing exactly which of its sections are not yet absorbed and where each one
   must land.
2. **It is still listed in [CLAUDE.md](../../../CLAUDE.md)** under "Design specs", marked
   implemented. Being in this folder does not remove it from that list — it changes what the
   list says about it.
3. **Nothing in it is a task.** If a section describes work still to do, the spec is not
   implemented and does not belong here.
4. **Deletion is still the goal.** Move each unabsorbed section to its permanent home,
   repoint every inbound link, then delete the file and its CLAUDE.md entry in one change —
   the two-step rule in [PROJECT-STRUCTURE.md](../../PROJECT-STRUCTURE.md) §5 applies
   unchanged.

Naming stays `YYYY-MM-DD-<slug>.md`, keeping the original date so the two folders read as one
chronological series.

## Current contents

**One file, and it is already deletable.** `2026-08-09-list-sort-pagination.md` was fully
absorbed on 2026-08-15 — its §0 maps every section to its permanent home. It is kept only
because deleting a `docs/` file is a human decision, not because anything in it is still the
only copy.

That is the expected steady state for this folder: usually empty, occasionally holding a spec
for the short window between "the code merged" and "the rationale found a home." A file sitting
here for months means step 4 above never happened.
