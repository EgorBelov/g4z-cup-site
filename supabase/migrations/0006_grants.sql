-- ============================================================================
-- Explicit privileges for the public roles.
--
-- Supabase normally grants these automatically through default privileges, but
-- that depends on which role runs the migration. Spelling them out makes the
-- schema self-sufficient: it applies the same way to a Supabase project, a local
-- `supabase db reset`, and a plain Postgres instance in CI.
--
-- RLS (0004) is what actually restricts *which rows* these roles see. This file
-- only decides which relations they may touch at all.
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- Tables and views alike; row filtering is handled by the RLS policies.
grant select on all tables in schema public to anon, authenticated;

-- Anything added by a later migration should behave the same way.
alter default privileges in schema public
  grant select on tables to anon, authenticated;

-- …except the operational tables, which stay completely out of reach.
revoke all on public.login_attempts from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;
