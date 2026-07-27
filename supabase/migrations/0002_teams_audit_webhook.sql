-- v1.2: educator sub-accounts (teams), audit log, CRM webhook setting.

-- ============================================================================
-- audit_log
-- ============================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log_select" on public.audit_log
  for select using (public.is_super_admin());

create policy "audit_log_insert" on public.audit_log
  for insert with check (public.is_super_admin());

-- ============================================================================
-- Educator sub-accounts ("Mi equipo")
-- ============================================================================

alter table public.profiles add column managed_by uuid references public.profiles(id);

create or replace function public.is_team_member_of(owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and managed_by = owner_id
  );
$$;

-- Let an owner see their own team members' profile rows (for the "Mi equipo" list).
drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_super_admin() or managed_by = auth.uid());

-- Extend ownership checks across the educator data model to include team members.
drop policy "sorteos_owner_all" on public.sorteos;
create policy "sorteos_owner_all" on public.sorteos
  for all using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  )
  with check (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

drop policy "wheel_segments_owner_all" on public.wheel_segments;
create policy "wheel_segments_owner_all" on public.wheel_segments
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.sorteos s
      where s.id = wheel_segments.sorteo_id
        and (s.educator_id = auth.uid() or public.is_team_member_of(s.educator_id))
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.sorteos s
      where s.id = wheel_segments.sorteo_id
        and (s.educator_id = auth.uid() or public.is_team_member_of(s.educator_id))
    )
  );

drop policy "participants_owner_select" on public.participants;
create policy "participants_owner_select" on public.participants
  for select using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

drop policy "code_batches_select" on public.code_batches;
create policy "code_batches_select" on public.code_batches
  for select using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

drop policy "code_batches_insert" on public.code_batches;
create policy "code_batches_insert" on public.code_batches
  for insert with check (
    created_by = auth.uid()
    and (educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id))
  );

drop policy "prize_codes_select" on public.prize_codes;
create policy "prize_codes_select" on public.prize_codes
  for select using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

drop policy "prize_codes_insert" on public.prize_codes;
create policy "prize_codes_insert" on public.prize_codes
  for insert with check (
    created_by = auth.uid()
    and (educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id))
  );

drop policy "prize_codes_update" on public.prize_codes;
create policy "prize_codes_update" on public.prize_codes
  for update using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  )
  with check (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

drop policy "prize_codes_delete" on public.prize_codes;
create policy "prize_codes_delete" on public.prize_codes
  for delete using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

drop policy "entries_owner_select" on public.entries;
create policy "entries_owner_select" on public.entries
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.sorteos s
      where s.id = entries.sorteo_id
        and (s.educator_id = auth.uid() or public.is_team_member_of(s.educator_id))
    )
  );

-- ============================================================================
-- CRM webhook setting
-- ============================================================================

alter table public.admin_settings add column webhook_url text;
