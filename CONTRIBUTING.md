# Contributing to RedyQuote

This document defines the **governance layer** for RedyQuote: how work is branched,
committed, reviewed, and merged. Every contributor and AI tool follows these rules.

> The **tooling layer** (test/lint/build commands, hooks) is appended later, once the
> tech stack is decided (Step-05). Only governance is defined here.

RedyQuote is **solo / process-enforced**: one person holds both the Product Owner and
Architect hats. There is **no host-enforced required-reviewer policy** — no second
reviewer blocks a merge. The gate is the **self-review checklist** below, which the
author completes before merging.

---

## Branching strategy

- `main` only ever holds finalized, approved work. **Never push directly to `main`.**
- Every change is made on a branch created off an up-to-date `main`.
- Branch state _is_ draft-vs-final: work-in-progress lives on its branch; merging to
  `main` is what makes it final. There are no draft files or status frontmatter to track.

### Branch naming

- Ongoing work uses a short, descriptive prefix matching the commit type:
  `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.

---

## Review flow

1. Create a branch off the latest `main`.
2. Do the work; commit using the convention below.
3. Open a **Pull Request (PR)** targeting `main` — one PR per branch.
4. Complete the self-review checklist.
5. Merge to `main`. **A merged change is the only "final" change.**

Open PRs from the CLI (`gh pr create`) or the GitHub web UI.

## Self-review checklist

This is the merge gate. There is no required reviewer, so this list is what stands between a
change and `main`. Complete it against the actual diff, not against memory of what you meant to
do.

- [ ] `git diff main...HEAD --stat` reviewed file by file. Every changed file is one I meant to
      change; nothing arrived by accident.
- [ ] `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run test` all pass
      locally, on the merge state — not just on the last file I edited.
- [ ] Every change traces to a requirement, an approved spec, or an explicit instruction. No
      invented scope, no opportunistic refactor, no "while I was in there".
- [ ] No source-of-truth document under `docs/`, nor `CLAUDE.md`, nor this file, is touched in
      this PR — unless the PR is _only_ that documentation change (see "Documentation changes").
- [ ] No secret, key, connection string, or `.env*` value appears anywhere in the diff, in a
      code comment, or in a fixture.
- [ ] No dependency added or removed without the corresponding `docs/TECH-STACK.md` change
      landing first, in its own PR.
- [ ] Any schema change is a **new** migration file. No already-merged migration was edited.
- [ ] Any new external input — Server Action argument, form payload, URL parameter — is
      validated against a Zod schema server-side before it reaches the database.
- [ ] Comments explain _why_, not _what_. Anything non-obvious carries its reason.
- [ ] Commit messages follow the convention below and describe the change, not the process that
      produced it.

If a box cannot be ticked, the PR is not ready. Fix it, or say why in the PR description — an
explicit, reasoned exception is fine; a silently unticked box is not.

---

## Development-phase governance

Initiation is complete; these are the rules for ongoing development.

- **Team size:** solo. One person holds the Product Owner and Architect hats.
- **Review model:** self-review against the checklist above. No second reviewer blocks a merge,
  because there is no second reviewer.
- **CI gate:** `lint`, `typecheck`, `format:check`, `test`, on every PR to `main` and every push
  to `main` (`.github/workflows/ci.yml`). CI runs the checks on the real merge state; the
  checklist is the human gate. Neither replaces the other.
- **Release/versioning:** none. `main` is the only artifact — there are no tags, no changelog,
  and no versioned releases. `package.json` carries `0.1.0` as a placeholder, not a claim.
  If that changes, it changes here first.
- **Environments:** see [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

---

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short summary>
```

The scope is optional for repo-wide changes and expected otherwise — it is what makes a log
skimmable in a repo with several route groups.

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`.

Examples:

- `docs: add repo governance baseline`
- `feat(intake): add the submission retry queue`
- `fix(pipeline): handle an empty payload on stage move`

---

## Documentation changes

The source-of-truth documents in `docs/`, plus this file and `CLAUDE.md`, are authoritative.
Changing one is a **standalone change, never folded into feature work**:

1. Propose the edit as a diff.
2. Name the downstream documents it affects — each document's header carries a `Downstream:`
   line listing them.
3. Get explicit approval.
4. Land it in its own commit.

Keep acronyms defined on first use in any new document, and match the writing standard already
in `docs/`.

---

## Direct-push rule

- **Never push to `main`.** All changes land through a PR.
- Never force-push to shared branches.

---

## Branch protection

Branch protection on `main` (block direct push / require a PR before merge) is
**best-effort**. Enable it in GitHub repository settings if the plan allows; on free-plan
private repos it may be unavailable. If it cannot be set, the self-review checklist above
is the gate that matters — its absence does not weaken the process.

---

# Tooling layer

Added in Step-05 once the stack was locked. Every command below uses only technologies
approved in [`docs/TECH-STACK.md`](docs/TECH-STACK.md). Do not introduce a command for a
tool that is not listed there — add it to `TECH-STACK.md` first.

## Required versions

Match the versions pinned in `docs/TECH-STACK.md`:

- **Node.js** 24 Long-Term Support (LTS) — the Active LTS line, and the Vercel runtime.
  Pinned in `.nvmrc` and enforced by `engines.node` plus `.npmrc engine-strict=true`.
- **npm** — bundled with Node.js 24; the project package manager. Do not use pnpm or yarn.
- **Supabase CLI** — links the repo to the hosted project and applies migrations.
- **Docker** — not required, and not installed. Development runs against a hosted Supabase
  project with no local stack ([docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) §1).

## Run commands

The `scripts` block in [`package.json`](package.json) is the authority on what commands exist.
Do not invent a script, and do not document one here that is not in that file — a command table
in prose is a second source of truth that rots the moment a script is renamed.

The five everyday checks, which are exactly what CI runs, are listed in
[README.md](README.md) § Everyday Checks.

Supabase operations that are not npm scripts:

| Task                                         | Command                                        |
| -------------------------------------------- | ---------------------------------------------- |
| Link the repo to the hosted Supabase project | `npx supabase link`                            |
| Apply pending migrations                     | `/db-migrate` (never a bare `npm run db:push`) |

## Pre-commit hooks

Husky + lint-staged run on every commit:

- **lint-staged** runs Prettier (format) and ESLint (fix) on staged files.
- A commit MUST NOT be pushed if lint or format fails; fix and re-stage.

Install the hooks once after `npm install`:

```bash
npm run prepare
```

## Continuous integration

GitHub Actions runs on every PR to `main` (see `docs/TECH-STACK.md` §3). Two jobs:

- **Gate (blocking):** `npm run lint`, a TypeScript type-check (`tsc --noEmit`), and
  `npm run test` (Vitest). A failure here means the PR is not ready to merge.

CI is a self-discipline net: it runs the full suite on the actual merge state, catching what
the staged-files-only pre-commit hooks miss. It complements — does not replace — the
self-review checklist, which remains the merge gate for this solo / process-enforced repo.
The workflow file (`.github/workflows/`) is added when the repository is scaffolded.

## Environment

Which Supabase environment development runs against, the working rules that follow from that,
the migration-ordering rule, and the required configuration are in
[`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

Environment topology is not governance — it changes when infrastructure changes, not when
process changes — so it lives in `docs/` beside the other source-of-truth documents rather than
in the middle of this file. RedyQuote carries the same file at the same path.
