# Contributing to RedyQuote

This document defines the **governance layer** for RedyQuote: how work is branched,
committed, reviewed, and merged. Every contributor and AI tool follows these rules.

> The **tooling layer** (test/lint/build commands, hooks) is appended later, once the
> tech stack is decided (Step-05). Only governance is defined here.

RedyQuote has **one author and a host-enforced approving review**. One person holds the
Product Owner and Architect hats and writes the code; `main` then requires **one approving
review from someone who is not the author** before a pull request can merge. That requirement
lives in the repository ruleset described under [Branch protection](#branch-protection), not in
this file — GitHub enforces it, and no amount of process discipline substitutes for it.

The **self-review checklist** below is therefore **preparation for that review, not a
replacement for it**. Complete it before asking anyone to look.

> This corrected a live contradiction. Until 2026-08-16 this file said there was no required
> reviewer and that the checklist was the merge gate. The ruleset had required an approving
> review since 2026-08-05. The ruleset was right; every merge surfaced the mismatch.

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
4. Complete the self-review checklist, in the PR description.
5. **Get one approving review.** You cannot approve your own PR — GitHub refuses it — and
   pushing to the branch after an approval dismisses that approval, so push first and ask second.
6. Resolve every review thread. Unresolved threads block the merge.
7. Merge to `main` with **squash or rebase**. **A merged change is the only "final" change.**

Open PRs from the CLI (`gh pr create`) or the GitHub web UI.

## Self-review checklist

**This is not the merge gate — an approving review is** (see [Branch
protection](#branch-protection)). This list is what you owe the reviewer: it is preparation, and
it is what makes a review cheap enough to be worth asking for. Complete it against the actual
diff, not against memory of what you meant to do, and put it in the PR description so the
reviewer can see which boxes you actually ticked.

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

If a box cannot be ticked, the PR is not ready to ask for review. Fix it, or say why in the PR
description — an explicit, reasoned exception is fine; a silently unticked box is not.

---

## Development-phase governance

Initiation is complete; these are the rules for ongoing development.

- **Team size:** one author. The Product Owner and Architect hats sit with that person; the
  approving review comes from someone else.
- **Review model:** self-review against the checklist above, **then** one approving review, which
  the repository ruleset requires and GitHub enforces. The checklist prepares the review; it does
  not stand in for it.
- **CI gate:** `lint`, `typecheck`, `format:check`, `test`, on every PR to `main` and every push
  to `main` (`.github/workflows/ci.yml`). CI runs the checks on the real merge state; the
  checklist plus the approving review are the human gate. Neither side replaces the other.
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

`main` is protected by an **active repository ruleset**, `RepoLevelRule - Main Branch
Protection`, applying to `main` and the default branch. It is not best-effort and it is not
optional. Verified against the GitHub API on 2026-08-16:

| Rule                              | Effect                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| Pull request required, 1 approval | A direct push to `main` is refused. You cannot approve your own PR.                     |
| Dismiss stale reviews on push     | Pushing after an approval **dismisses it**. Push first, then request review.            |
| Review thread resolution required | Every conversation must be resolved before merge.                                       |
| Code-owner review required        | **Currently inert** — there is no `CODEOWNERS` file. Adding one silently tightens this. |
| Linear history required           | No merge commits. Squash or rebase.                                                     |
| Deletion and non-fast-forward     | `main` cannot be deleted or force-pushed.                                               |

**One bypass exists, and using it is the thing to avoid.** The `OrgOwnerTeam` team is a bypass
actor with mode `always`, so an org owner _can_ merge without an approval. A control that its
only user routinely bypasses is decorative. Treat the bypass as a break-glass path, and say in
the PR why it was used.

**If the review requirement is ever judged wrong, change the ruleset, not this file.** Dropping
`required_approving_review_count` to 0 is a deliberate decision someone makes in repository
settings. Documentation that disagrees with the host is how this section got out of step in the
first place.

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

CI runs the full suite on the actual merge state, catching what the staged-files-only pre-commit
hooks miss. It complements — does not replace — either the self-review checklist or the
approving review: a green check says the code builds and passes, not that anyone read it.
The workflow file (`.github/workflows/`) is added when the repository is scaffolded.

## Environment

Which Supabase environment development runs against, the working rules that follow from that,
the migration-ordering rule, and the required configuration are in
[`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

Environment topology is not governance — it changes when infrastructure changes, not when
process changes — so it lives in `docs/` beside the other source-of-truth documents rather than
in the middle of this file. RedyQuote carries the same file at the same path.
