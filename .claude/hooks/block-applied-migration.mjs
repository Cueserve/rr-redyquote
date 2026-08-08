#!/usr/bin/env node
/**
 * PreToolUse guard: refuse edits to Supabase migration files that are already
 * committed to HEAD.
 *
 * Why: `supabase db push` compares recorded *versions*, not file contents, so
 * editing an applied migration is skipped silently while reading as though it
 * landed (see CLAUDE.md — migration 0004 exists because that happened once).
 *
 * "Applied" proxy: present in `git HEAD`. This repo's workflow is push-then-commit,
 * so a committed migration is an applied one, and a newly authored migration stays
 * editable until it is committed. Not exact — the authority is
 * `supabase_migrations.schema_migrations` on the remote — but it needs no network,
 * no credentials, and no hardcoded version list to go stale.
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

let committed = false;
try {
  execFileSync("git", ["cat-file", "-e", `HEAD:${relPath}`], {
    stdio: "ignore",
  });
  committed = true;
} catch {
  committed = false; // untracked/new migration, or no git — allow
}

if (!committed) process.exit(0);

const reason =
  `${relPath} is committed to HEAD, so it is an applied migration and is immutable. ` +
  `\`supabase db push\` tracks recorded versions, not file contents — an edit here is ` +
  `silently skipped on push while appearing to have landed. ` +
  `Author a NEW migration file (next sequential number) with the change instead, ` +
  `then apply it with /db-migrate.`;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }),
);
