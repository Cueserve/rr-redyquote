-- ============================================================================
-- TEMPORARY ACCEPTANCE PROBE for .github/workflows/db-replay.yml. DO NOT MERGE.
--
-- Deliberately broken. It alters a table that no earlier migration creates, so
-- `supabase db reset` must fail here. This is the acceptance test for the
-- replay job: with this file present the job is red, and with it deleted the
-- job is green. It is removed in a later commit on the same branch, so it never
-- reaches `main`.
-- ============================================================================

alter table public.replay_probe_missing add column probe boolean;
