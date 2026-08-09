---
description: Audit RedyQuote's docs and AI-instruction files across three lenses — product alignment, factual drift, and redundancy/absorption
allowed-tools: Read, Glob, Grep, Bash, Edit
---

# Doc Audit

Read RedyQuote's documentation corpus **once** and run three independent lenses over it:

- **A — Align** — where terminology, metrics, acceptance criteria, goals, and scope don't cohere,
  and where a section is missing rather than wrong.
- **B — Drift** — where the docs contradict each other or contradict the code.
- **C — Absorb** — where two files say the same thing twice, and which copy is better.

The letters are the recommended run order. `align` first, because it settles concept names and the
other two passes produce sharper findings once terms are fixed. `absorb` last, because it is the
only pass that proposes deleting files and the least useful while terms are still unsettled.

This repo is vibe-coded against its docs: `CLAUDE.md` and `docs/` are loaded into context and drive
what gets built. A stale line there is not a typo — it is a wrong instruction that propagates into
code. `README.md` is the usual first casualty, because it restates facts it does not own.

Arguments (optional): `$ARGUMENTS`

- `align` · `drift` · `absorb` — run one pass only. No argument runs all three, in that order.
- `docs-only` — skip every code probe (step 4B). Fast, prose-only. Weakens `drift` badly and
  `absorb` slightly; `align` is nearly unaffected.
- `fix` — after reporting, apply the **Safe** tier (step 8). Never applies an `absorb` finding.
- a path (e.g. `docs/DATABASE.md`) — restrict to claims made **by or about** that file.

Combine freely: `/doc-audit align docs/PRD.md`, `/doc-audit drift fix`.

---

## 1. The corpus — read these, nothing else

Do not glob `**/*.md`; `node_modules/` holds 1,500+ markdown files and will drown the run. Read
exactly this set, once, and hold it for all three passes. Sharing this read is the reason the
three passes live in one command.

**Tier 1 — instruction files Claude loads automatically.** Highest blast radius: wrong here means
wrong in every session.

- `CLAUDE.md`
- `.claude/settings.json` (permissions, `env`, enabled plugins)
- `.claude/hooks/block-applied-migration.mjs`
- `.claude/commands/*.md` (including this file)
- `~/.claude/projects/d--vrp-repos-rr-redyquote/memory/MEMORY.md` and the memory files it indexes
  — read-only. A memory that contradicts the repo is a finding; **never edit one during an audit**,
  report it and let the user decide.

**Tier 2 — permanent source of truth.** `docs/PRODUCT.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`,
`docs/TECH-STACK.md`, `docs/PROJECT-STRUCTURE.md`, `docs/ENVIRONMENTS.md`,
`docs/DESIGN-SYSTEM.md`, `docs/DATABASE.md`

**Tier 3 — transient specs.** Same authority as Tier 2 for the slice they cover; each is deleted
when absorbed. `docs/DATABASE-SQL.md`, `docs/superpowers/specs/*.md`

**Tier 4 — ground truth the docs make claims about.** Not documentation. This is what step 4B
checks the prose against, and it always wins.

- `README.md` (owns nothing; restates everything — audit it as a claimant, not a source)
- `package.json` (scripts, dependencies, `engines.node`), `.nvmrc`
- `eslint.config.mjs`, `components.json`, `.prettierrc`, `.husky/pre-commit`
- `.impeccable/config.json`
- `supabase/migrations/*.sql`, `supabase/config.toml`, `src/lib/supabase/types.ts`
- `.env.example` — **read this one only.** Never open `.env` or `.env*.local`; they are denied in
  `.claude/settings.json` and hold the service-role key.

If a Tier 2/3 file exists on disk but is **not** listed in CLAUDE.md's "Source-of-truth docs"
section, that is itself a finding — CLAUDE.md's own rule is that nothing transient lands in
`docs/` unlisted.

## 2. Authority ladder — who wins when two files disagree

Apply top-down. The higher entry is right by construction; the lower one is the defect.

1. **Executable reality** — `package.json` scripts, `eslint.config.mjs` rules, hook code,
   `.impeccable/config.json`, generated `types.ts`. Code does not have opinions.
2. **Applied migrations** (`supabase/migrations/*.sql`) — the authoritative schema per
   ARCHITECTURE §5. Beats any prose description of the schema, including `docs/DATABASE-SQL.md`.
3. **Tier 3 specs**, for the slice they explicitly amend. The authorization-matrix spec amends
   PRD-010 and ARCHITECTURE §2/§7; the base text it amends is **superseded, not authoritative**.
   For tables not yet migrated (`0005` onward), `docs/DATABASE-SQL.md`'s DDL is the schema anchor —
   check its "Transcription status" for which blocks it still governs.
4. **Tier 2 docs** among themselves, by ownership — each fact has exactly one owner:
   stack → TECH-STACK · layout → PROJECT-STRUCTURE · schema model → DATABASE · tokens and the
   WCAG floor → DESIGN-SYSTEM · Supabase environment → ENVIRONMENTS · structural invariants →
   ARCHITECTURE · scope and requirements → PRD/PRODUCT. A restatement elsewhere loses to the owner.
5. **CLAUDE.md** — an adapter over the docs, plus AI-behavior rules it _does_ own. Where it
   restates a doc, the doc wins; where it states a working rule (banned commands, hook behavior,
   the Building-UI order), CLAUDE.md is the owner.
6. **README.md** — owns nothing. It loses every tie.

Three exceptions, all deliberate:

- **CLAUDE.md's "Project state" is a dated snapshot**, self-declared as such. Do not rule it
  authoritative over the filesystem — verify it, and treat a stale bullet as a finding against
  CLAUDE.md.
- **A doc that describes an _intent_ the code hasn't implemented yet is not wrong.** Distinguish
  "the doc lies about what exists" (finding) from "the doc specifies what should exist"
  (backlog — belongs in a GitHub Issue, not in this report). When unsure, say which reading you took.
- **The ladder ranks authority, not quality.** A lower-rung file can hold a _better_ explanation of
  a fact it doesn't own. That is not a drift finding — it is an `absorb` finding (step 5), and the
  fix runs upward, not downward. Never delete a superior explanation because of where it lives.

---

## PASS A — Align

_Skip entirely under `drift` or `absorb`. This pass judges coherence and completeness, not truth —
a corpus can pass Pass B cleanly and still fail here._

## 3A. Terminology — the schema is canon

**Rule: the database name wins.** For any concept with a table, column, or enum value, the
canonical prose term is the schema identifier de-snake-cased. `fab_tiers` → **fab tier**;
`price_history` → **price history**; the `quote_status` enum values fix the lifecycle labels.
Source in ladder order: applied migrations first, then `docs/DATABASE-SQL.md`'s DDL for tables not
yet transcribed (`0005` onward).

Build the term register, then check every prose use against it:

1. Extract candidate concept nouns from the schema.
2. `grep -i` each across the corpus, capturing every surface form (spaced, hyphenated, camel,
   pluralized, capitalized mid-sentence).
3. Report each cluster with its variants, counts, and file:line for the minority forms.

Three outcomes, and they are not interchangeable:

- **Cosmetic variant** — same concept, different spelling (`fab tier` / `fab-tier`). Low impact.
  Fix is mechanical, but note the legitimate exception: hyphenation is correct when the term is a
  compound modifier ("fab-tier pricing"), so do not report those as defects.
- **Competing term** — a second word for the same thing (`quantity tier` where the schema says
  `fab_tiers`). Medium-to-High impact: a reader cannot tell whether it is a synonym or a distinct
  entity, and neither can a code generator. **Known live case as of 2026-08-08:**
  `docs/PRD.md`, `docs/PRODUCT.md`, and `docs/DATABASE.md` use _fab tier_, _fab-tier_, and
  _quantity tier_ across six files. Resolve it or report it unresolved — do not silently pick.
- **No schema anchor** — a user-facing term with no column behind it (`rep`, `sales rep`,
  `component library`, `quote builder`). Fall back to first use in `docs/PRODUCT.md`. If PRODUCT.md
  doesn't use it either, report as **unresolved** and name who decides. Never invent a canon.

Same treatment for **status labels** (`Review` vs `pending_approval` vs `pending`) —
prose uses the display form, code uses the enum value, and a doc mixing them inside one sentence is
a finding.

## 3B. Metrics and acceptance criteria

- Every success criterion in `docs/PRODUCT.md` maps to at least one requirement in `docs/PRD.md`.
  An unmapped criterion is a goal nobody is building toward.
- Every `PRD-NNN` requirement has acceptance criteria, and they are **testable** — a number, a
  state, or an observable behavior. "Fast", "intuitive", "reliable" are findings.
- Numbers agree across files: thresholds, counts, timings, tier boundaries, the 2.5 markup cushion,
  anything in the NFR set. A number stated twice with two values is High impact by default.
- Acceptance criteria don't contradict a non-negotiable invariant. A criterion satisfiable by a
  UI-only check where ARCHITECTURE requires database enforcement is a **P0** — it authorizes the
  exact thing the invariant forbids.

## 3C. Missing sections

Pass B only compares things that exist. This is where a _gap_ gets caught.

- A requirement with no acceptance criteria, or no owning screen in PROJECT-STRUCTURE.
- A user flow with no error state, no empty state, and no loading state named anywhere.
- A table in DATABASE.md with no RLS policy described, or a status transition with no audit row.
- A screen listed in PROJECT-STRUCTURE with no requirement behind it — scope that arrived
  undocumented.
- A blocked decision (PRD §2A, PRD-007A) with no named decider and no statement of what unblocks it.

Report a gap as **Missing**, not as a contradiction, and say which file should own the new section.

## 3D. Goals vs. scope vs. implementation

Walk `PRODUCT.md` goals → `PRD.md` scope → `ARCHITECTURE.md` mechanism → what's built. Flag:

- A stated goal with no mechanism that achieves it.
- A mechanism in ARCHITECTURE serving no stated goal — usually scope that crept in.
- Scope in PRD contradicting a PRODUCT non-goal.
- A user-facing claim in README or PRODUCT the current implementation cannot support. Phrase it as
  the user would experience it, not as a doc diff.

## 3E. Impact and urgency

Every finding in **any** pass carries a second rating, independent of the P0–P2 correctness axis:

- **High** — a user hits a wrong result, a broken flow, or a false promise; or an engineer builds
  the wrong thing from it.
- **Medium** — costs review time, causes rework, or forces a reader to guess.
- **Low** — cosmetic; no decision changes.

State the impact as a **consequence**, not a category: _"a rep prices against the wrong tier because
'quantity tier' and 'fab tier' read as two things"_ — not _"terminology inconsistency."_

## 3F. Next steps

Close Pass A with three lists, each specific enough to act on without re-reading the report:

- **Tests to run** — the command, and what a pass would prove. Note where no test can exist yet
  (`npm run test` is `--passWithNoTests` with an empty suite; a green run is "not run").
- **Who decides** — for every unresolved item, the human who owns it. PRD §2A and PRD-007A are
  product decisions, not coding tasks; say so rather than proposing a default.
- **Replacement snippets** — for each High finding, the exact sentence to substitute, written to
  drop in. Not a description of the edit — the text.

---

## PASS B — Drift

_Skip entirely under `align` or `absorb`._

## 4A. Doc vs. doc

For each fact class, extract every statement across the corpus and compare. These are the classes
where this repo has actually drifted or is structurally likely to:

- **Invariant mechanisms.** How is the approval gate enforced — trigger or RLS? ARCHITECTURE and
  DATABASE-SQL insist `WITH CHECK` cannot see the old row, so a file saying "RLS-enforced" for a
  _transition_ is describing a mechanism that cannot exist.
- **Role model.** Which roles, and what may each write? The authorization-matrix spec is the
  amendment; anything still describing the pre-amendment model is superseded text.
- **Quote lifecycle.** The state list and the transitions out of `Review`. Both exits
  are admin-only; any file listing only one is incomplete, not merely terse.
- **Approved stack and cuts.** Versions, and the v1 cut list (Resend, Sentry, PostHog, `pgmq`,
  `pg_cron`, Edge Functions). A tool mentioned as available anywhere but absent from TECH-STACK.md
  is a finding.
- **Open product decisions.** PRD §2A (pricing formula) and PRD-007A (category list). Every file
  that references them must agree they are still open, and agree on what they block.
- **Placement rules.** Directory claims in PROJECT-STRUCTURE vs. paths referenced elsewhere.
- **Design system.** Font names, the token rule, the WCAG level. DESIGN-SYSTEM.md owns all three.
- **Tooling posture.** Which plugins are enabled, which commands are banned, the Building-UI step
  order. CLAUDE.md and README both state this; they must match in substance.
- **Cross-references.** Every relative link and every `§`/`PRD-NNN` citation: does the target file
  exist, and does the cited section actually say what the citing file claims? A link that resolves
  to a renumbered section is worse than a broken one — it reads as verified.

## 4B. Doc vs. reality _(skipped under `docs-only`)_

Each probe turns a prose claim into a command. Run the probe; the output wins.

| Claim in prose                             | Probe                                                                                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A named `npm run X` exists                 | read `scripts` in `package.json` — do not trust CLAUDE.md's script list                                                                                           |
| Node version                               | `.nvmrc` and `engines.node` agree with every doc that names a version                                                                                             |
| Migration set and numbering                | `Get-ChildItem supabase/migrations` — compare filenames and count to every doc that enumerates them                                                               |
| "Applied to the linked project"            | `git log --oneline -- supabase/migrations/` plus `supabase/.temp/project-ref` exists. This repo pushes then commits, so committed ⇒ applied                       |
| `types.ts` is current                      | its table/column names cover every table the migrations create                                                                                                    |
| impeccable suppression list                | `.impeccable/config.json` `detector.ignoreRules` — compare the **count and the exact rule names** to every doc that describes them                                |
| impeccable context is pinned               | `env.IMPECCABLE_CONTEXT_DIR` in `.claude/settings.json`                                                                                                           |
| Permissions are machine-enforced           | `permissions.deny` / `permissions.ask` in `.claude/settings.json` really contain the patterns the docs claim                                                      |
| The migration hook fires                   | the hook file exists **and** uses the shell form (`"command": "node path/to.mjs"`). The exec form silently never fires — indistinguishable from one that approved |
| Lint bans hex literals and palette classes | the `no-restricted-syntax` block in `eslint.config.mjs`                                                                                                           |
| "15 primitives in `src/components/ui/`"    | count the files                                                                                                                                                   |
| "Nothing talks to the database"            | `src/server/` and `src/lib/pricing/` absent; `grep -r "use server" src/` empty                                                                                    |
| Mock-only reads                            | `src/lib/mock/` and `src/components/prototype/` still exist and are still imported                                                                                |
| shadcn style/config                        | `components.json` (`style`, `cssVariables`)                                                                                                                       |
| Fonts self-hosted via `next/font`          | `grep -r "next/font" src/` — and no Google Fonts `<link>`                                                                                                         |
| Test suite proves something                | `npm run test`'s script string. `--passWithNoTests` with zero test files means a green run is "not run"                                                           |
| `e2e/` / CI / `vitest.config.ts` exist     | check the paths before repeating any claim about them                                                                                                             |

**Date staleness.** Every `Last verified:` / `Last updated:` / `verified YYYY-MM-DD` stamp: compare
it to the last commit touching the file it vouches for. A stamp older than the thing it certifies
is a finding on its own — CLAUDE.md's own words are that a stale snapshot is worse than none.

---

## PASS C — Absorb

_Skip entirely under `align` or `drift`. This is the only pass that proposes deletions, and none of
its output is ever auto-applied._

## 5A. Find the duplicates

Pass B finds files that **disagree**. This finds files that **agree** — which is its own defect,
because two copies of one fact drift on the next edit and only one of them will get updated.

For each fact class in step 4A, ask a different question: how many files _state_ it, versus the one
that _owns_ it (ladder rung 4)? Flag any fact stated substantively in two or more places. The usual
sources here are `README.md` restating `docs/`, `CLAUDE.md` restating a doc it doesn't own, and a
Tier 3 spec restating what it has already fed into a permanent doc.

Not every restatement is a defect — a one-line pointer with a link is the correct pattern. The line
is **whether a reader could act on the copy alone**. If yes, it is a duplicate and will drift.

## 5B. Compare quality, not position

For each duplicate cluster, judge which copy is actually better on:

- **Completeness** — covers the edge cases, the failure mode, the exception.
- **The "why"** — states the reason, not just the rule. This repo's convention is that rationale
  travels with the rule (see any `src/components/ui/` file, or the `$comment` in
  `.impeccable/config.json`).
- **Currency** — reflects the newer state of the code.
- **Precision** — names the mechanism rather than gesturing at it.

**The better copy frequently sits in the lower-authority file.** README and the specs get rewritten
more often than the owner docs. When that happens the fix is a **merge upward**: move the superior
content into the owner, reduce the duplicate to a one-line pointer. Ruling the richer text "wrong
because README" would destroy the best explanation in the repo — that is the failure mode this pass
exists to prevent.

## 5C. Absorption candidates

Tier 3 specs are transient by design: each is deleted when its content lands in what it feeds.
For each spec, determine per-section whether it is **fully absorbed**, **partly absorbed**, or
**not yet**. `docs/DATABASE-SQL.md` carries its own "Transcription status" — use it, and verify it
against the migration files rather than trusting it.

A spec is deletable only when **every** section has landed. Deleting it means removing its entry
from CLAUDE.md's source-of-truth list **in the same change** — propose both halves or neither.

Also flag the reverse: a spec section that contradicts what actually landed. The landed artifact
wins (ladder rungs 1–2), and the spec text needs correcting before anyone reads it as current.

---

## 6. Known-open findings, for calibration

Open as of **2026-08-08**. Confirm each still reproduces before reporting it, and **delete this
section once all three are fixed** — a stale calibration list is the exact failure this command
exists to catch.

1. **[Align] Tier terminology.** _fab tier_ / _fab-tier_ / _quantity tier_ across `docs/PRD.md`,
   `docs/PRODUCT.md`, `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT-STRUCTURE.md`, and
   the authorization-matrix spec. Schema anchor is `fab_tiers` (DATABASE-SQL.md DDL — not yet
   migrated). Unresolved: whether _quantity tier_ is a synonym or names the quantity break itself,
   which would be a distinct concept deserving its own term.
2. **[Drift] Suppression count.** `README.md` §"Claude Code Setup" says `.impeccable/config.json`
   holds **one** suppression (`cramped-padding`). `CLAUDE.md` and the file itself carry **three**
   (`+ nested-cards`, `+ clipped-overflow-container`). README is stale — dated 2026-07-31, the
   config entries 2026-08-08. **Ruling:** README loses to both the config file (rung 1) and
   CLAUDE.md (rung 5).
3. **[Drift] Approval-gate mechanism.** `README.md` "Key Concepts" labels it _RLS-enforced_ and
   attributes the `Review → Approved` restriction to RLS. `CLAUDE.md` and
   `docs/DATABASE-SQL.md` §3 say the mechanism is the `validate_quote_status_transition` **trigger**,
   because `WITH CHECK` cannot see the old row and therefore cannot express a transition.
   **Ruling:** README is wrong about a non-negotiable invariant — the worst class of finding, since
   it teaches a mental model under which someone could weaken the trigger believing RLS backs it up.

## 7. Report format

One report, sectioned by pass, in A → B → C order. Within each section, order by blast radius —
**a wrong instruction outranks a wrong description.**

Two axes, both stated. They are not the same thing and a finding can be P2/High or P0/Low:

- **Correctness priority** — P0: contradicts a non-negotiable invariant, or would produce wrong
  code if followed. Anything in Tier 1 is P0 by default. · P1: factual drift a developer would act
  on. · P2: cosmetic.
- **Product impact** — High / Medium / Low per step 3E, stated as a consequence.

Per finding, exactly this:

```text
[B-P0 · High] <one-line claim in conflict>
  Says X:  path/to/file.md:LINE — "<quote>"
  Says Y:  path/to/other:LINE — "<quote>"
  Ruling:  <which is authoritative, and which ladder rung says so>
  Impact:  <what goes wrong for a user or an engineer, concretely>
  Fix:     <the exact replacement text>
  Tier:    Safe | Approval
```

Prefix the code with the pass: `A-` align, `B-` drift, `C-` absorb. Pass A gaps use `MISSING`
instead of a priority code. Pass C findings use `DUPLICATE`, `MERGE-UP`, or `ABSORBED`.

End with: findings by pass and priority · **files audited vs. files in the corpus** — if you skipped
one, name it · the three Pass A next-step lists (3F) · a one-line recommended fix order.

A report that silently covered less than it claims is the same defect as the docs it is auditing.

## 8. Fixes — two tiers, and the line between them

**Safe** (applied under `fix`, reported otherwise): edits inside `README.md`, a stale date stamp, or
a broken relative link — cases where the losing file is provably restating an owner and the fix is
to copy the owner's wording. README is the common case: it owns nothing, so correcting it is
transcription, not a decision.

**Approval** (never auto-applied, even under `fix`): anything editing `docs/`, `CLAUDE.md`, or
`.claude/settings.json`; every terminology rename; and **every Pass C finding without exception**.
CLAUDE.md's rule is explicit — a change to a source-of-truth doc is a deliberate decision, called
out and approved on its own, never folded into other work.

Pass C is Approval-only because its two operations are the destructive ones: deleting a file, and
rewriting an owner doc with content merged from elsewhere. Present each as a diff and stop.

## Never

- Read, print, or quote `.env` or `.env*.local`. `.env.example` only.
- Edit a file under `supabase/migrations/` committed to `HEAD`. The `PreToolUse` hook blocks it,
  but the rule stands on its own: a wrong applied migration is fixed by a **new** migration.
- Rewrite a doc to match the code when the doc is a **specification** of work not yet done. That
  erases the requirement. Route it to a GitHub Issue instead. Deferred **structural** work
  (a directory that doesn't exist yet, a `[tmp]` folder awaiting deletion) belongs in
  `docs/PROJECT-STRUCTURE.md` §6 instead, where its trigger is recorded alongside the tree.
- Delete a Tier 3 spec on partial absorption, or without also removing its CLAUDE.md entry.
- Discard the better explanation because it sits in the lower-authority file. Merge it upward.
- Pick a canonical term with no schema anchor and no PRODUCT.md precedent. Report it unresolved.
- Edit a memory file under `~/.claude/projects/.../memory/`. Report the conflict; the user owns it.
- Create `DESIGN.md`, or add YAML frontmatter to `DESIGN-SYSTEM.md`, to satisfy a tool. That needs
  approval and is a design-system decision, not an audit fix.
- Resolve a contradiction by inventing a third answer. If neither side is verifiable from code,
  report it as **unresolved** and name what evidence would settle it.
