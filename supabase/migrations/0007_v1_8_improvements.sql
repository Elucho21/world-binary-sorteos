-- v1.8: security hardening, editable participants/banners, batch actions,
-- and the indexes the query patterns below actually need.

-- ============================================================================
-- 1. Close admin_settings read: webhook_url is an internal CRM endpoint, not
-- public data. The two legitimate readers (admin/settings page, and the
-- best-effort webhook fire in app/api/register/route.ts) both move to an
-- authenticated/service-role client in this same release.
-- ============================================================================

drop policy "admin_settings_select" on public.admin_settings;
create policy "admin_settings_select" on public.admin_settings
  for select using (public.is_super_admin());

-- ============================================================================
-- 2. Rate limit magic-link requests (/mis-premios). Reuses spin_attempts —
-- sorteo_id becomes optional since a magic-link request isn't scoped to one.
-- ============================================================================

alter table public.spin_attempts alter column sorteo_id drop not null;

alter table public.spin_attempts drop constraint if exists spin_attempts_kind_check;
alter table public.spin_attempts add constraint spin_attempts_kind_check
  check (kind in ('register', 'check_prize', 'magic_link'));

create or replace function public.register_magic_link_attempt(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
begin
  select count(*) into v_attempts
  from public.spin_attempts
  where ip_hash = p_ip_hash and kind = 'magic_link' and created_at > now() - interval '10 minutes';

  if v_attempts >= 5 then
    return false;
  end if;

  insert into public.spin_attempts (ip_hash, kind) values (p_ip_hash, 'magic_link');
  return true;
end;
$$;

grant execute on function public.register_magic_link_attempt(text) to anon, authenticated;

-- ============================================================================
-- 3. Let the owning educator correct a participant's email before a draw —
-- same ownership rule as every other educator-owned table, no new writes
-- opened up beyond what the owner already reads via participants_owner_select.
-- Enforcing "not drawn yet" is done application-side (server action checks
-- sorteo.drawn_at before allowing the edit).
-- ============================================================================

create policy "participants_owner_update" on public.participants
  for update using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  )
  with check (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

-- ============================================================================
-- 17. Missing indexes: prize_codes filtered by (sorteo_id, status) on every
-- draw/Premios-page/activation check, and participants matched by email on
-- every Mis Premios login (my_entries view join).
-- ============================================================================

create index if not exists prize_codes_sorteo_status_idx on public.prize_codes (sorteo_id, status);
create index if not exists participants_email_lower_idx on public.participants (lower(email));

-- ============================================================================
-- 20. Early Supabase-quota warning: exposes just the DB size (bytes) needed
-- by netlify/functions/check-quota.mts to warn before the free-tier 500MB
-- cap is hit. service_role (the scheduled function) has no auth.uid(), same
-- carve-out as prevent_profile_privilege_escalation() in 0001_init.sql.
-- ============================================================================

create or replace function public.get_database_size_bytes()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.is_super_admin() then
    raise exception 'not authorized';
  end if;
  return pg_database_size(current_database());
end;
$$;

grant execute on function public.get_database_size_bytes() to authenticated;
