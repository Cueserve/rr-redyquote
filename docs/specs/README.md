# Design specs

Dated, transient design specs: authoritative for the slice they cover, deleted once their
content lands in whatever they feed.

**A spec in this folder is designed but not built.** Once its design ships as code it moves to
[`implemented/`](implemented/README.md) — same filename, same date — because a shipped spec
sitting here reads as pending work and gets rebuilt. It is deleted only after every durable
claim in it has a permanent home.

Naming is `YYYY-MM-DD-<slug>.md`, date first, so a directory listing sorts chronologically —
which is how these are read. No `-design` suffix: everything here is a design spec, so the
suffix carries no information.

Every file here **must** also be listed in [CLAUDE.md](../../CLAUDE.md) under "Approved design
specs", and removed from that list in the same change that deletes it. A spec that is not in
that list has no declared authority; a spec still in the list after its content landed is a
second copy free to drift.

See [docs/PROJECT-STRUCTURE.md](../PROJECT-STRUCTURE.md) §5 for the full document-kind table.
