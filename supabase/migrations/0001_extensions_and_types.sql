-- ============================================================================
-- 0001: Extensions, enums, shared triggers
--
-- Transcribed from docs/DATABASE-SQL.md §1 (block "0001"). All four enums are
-- created here even though only user_role has a consumer yet -- keeping this a
-- faithful transcription is what lets DATABASE-SQL.md be deleted later without
-- a line-by-line diff audit (ARCHITECTURE §5 makes these files the schema).
-- ============================================================================

create extension if not exists pgcrypto;

create type user_role as enum ('rep', 'admin');
create type quote_status as enum ('draft', 'pending_approval', 'approved', 'sent');
create type environment_type as enum ('any', 'indoor', 'outdoor');
create type quote_environment as enum ('indoor', 'outdoor');

-- Shared updated_at trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
