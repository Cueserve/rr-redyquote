#!/usr/bin/env node
/**
 * PreToolUse guard: refuse edits to Supabase migration files that have already been
 * merged to `main`.
 *
 * Why: `supabase db push` compares recorded *versions*, not file contents. Editing a
 * migration that the linked project has already applied is skipped silently on the next
 * push while reading as though it landed — the repo and the hosted schema diverge with
 * no error. RedyQuote develops against a hosted Supabase project, so there is no
 * `db reset` to recover with (docs/ENVIRONMENTS.md §1).
 *
 * "Applied" proxy: present in `origin/main` (or local `main`). This repo's workflow is
 * merge-then-push — a migration lands via PR, and is applied to the hosted project from
 * an up-to-date `main`. So merged ⇒ applied, while a migration still on a feature branch
 * stays editable even after it is committed. Checking `HEAD` instead would deny edits to
 * migrations still under review, which is the normal case during development.
 *
 * The union of `origin/main` and `main` is deliberate: whichever ref is ahead wins, so a
 * missing fetch or a not-yet-pushed local merge both still trip the guard.
 *
 * NOT exact — the authority is `supabase_migrations.schema_migrations` on the linked
 * project. The known gap is a stale `origin/main`: if someone else merged a migration and
 * this clone has not fetched, the guard allows an edit it should deny. Run `git fetch`
 * before editing migrations. Chosen anyway over the exact check because it needs no
 * network, no credentials, and no hardcoded version list to go stale.
 *
 * Fails open (allows the edit) if stdin is unparseable or git is unavailable:
 * a broken guard must not make migration authoring impossible.
 */
import { execFileSync } from "node:child_process";

const MIGRATION_RE = /(supabase\/migrations\/[^/]+\.sql)$/;

function read(stream) {
  return new Promise((resolve) => {
    let buf = "";
    stream.setEncoding("utf8");
    stream.on("data", (d) => (buf += d));
    stream.on("end", () => resolve(buf));
  });
}

const raw = await read(process.stdin);

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0); // fail open
}

const filePath = input?.tool_input?.file_path ?? "";
// Windows paths arrive backslashed; the git pathspec needs forward slashes.
const match = String(filePath).replace(/\\/g, "/").match(MIGRATION_RE);
if (!match) process.exit(0);

const relPath = match[1];

// Whichever ref is ahead wins — see the union note in the header.
const APPLIED_REFS = ["origin/main", "main"];

let mergedIn = null;
for (const ref of APPLIED_REFS) {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}:${relPath}`], {
      stdio: "ignore",
    });
    mergedIn = ref;
    break;
  } catch {
    // ref missing, or file absent from it — keep looking
  }
}

if (!mergedIn) process.exit(0); // feature-branch or brand-new migration — allow

const reason =
  `${relPath} is present in \`${mergedIn}\`, which this repo treats as "already applied to ` +
  `the linked Supabase project" — and applied migrations are immutable. ` +
  `\`supabase db push\` tracks recorded versions, not file contents, so an edit here is ` +
  `silently skipped on push while appearing to have landed. ` +
  `Author a NEW migration file (next sequential number) with the change instead, ` +
  `then apply it with /db-migrate. ` +
  `If this migration is merged but genuinely NOT yet applied to the linked project, ` +
  `say so and the user can approve the edit directly.`;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }),
);
