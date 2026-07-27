-- v1.3: classic raffle redesign.
--
-- The wheel used to give each participant an individual instant prize on
-- registration. The real product is a classic raffle: everyone registers,
-- then the educator draws N winners at once from the full list of
-- registrants. This migration removes the per-segment wheel/prize model
-- entirely and replaces it with a per-sorteo prize pool + a draw event.
--
-- BREAKING: drops wheel_segments and recreates prize_codes/entries with a
-- new shape. Only test data exists in this project so far, so nothing of
-- value is lost.

drop function if exists public.spin_wheel(text, text, text, text, text);
drop view if exists public.public_wheel_segments;
drop view if exists public.my_entries;

drop table if exists public.entries;
drop table if exists public.prize_codes;
drop table if exists public.wheel_segments;

-- ============================================================================
-- sorteos: how many winners, and whether the draw already happened
-- ============================================================================

alter table public.sorteos
  add column winners_count int not null default 1 check (winners_count >= 1),
  add column drawn_at timestamptz;

-- ============================================================================
-- prize_codes ("cuentas bono") — belongs to a sorteo directly, no segment
-- ============================================================================

create table public.prize_codes (
  id uuid primary key default gen_random_uuid(),
  educator_id uuid not null references public.profiles(id) on delete cascade,
  sorteo_id uuid references public.sorteos(id) on delete set null,
  batch_id uuid references public.code_batches(id) on delete set null,
  code text not null,
  status text not null default 'unassigned' check (status in ('unassigned', 'available', 'issued', 'redeemed')),
  created_by uuid not null references public.profiles(id),
  source text not null check (source in ('admin_bulk', 'educator_csv', 'educator_manual')),
  issued_to uuid references public.participants(id),
  issued_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (educator_id, code),
  check ((status = 'unassigned') = (sorteo_id is null))
);

alter table public.prize_codes enable row level security;

create policy "prize_codes_select" on public.prize_codes
  for select using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

create policy "prize_codes_insert" on public.prize_codes
  for insert with check (
    created_by = auth.uid()
    and (educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id))
  );

create policy "prize_codes_update" on public.prize_codes
  for update using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  )
  with check (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

create policy "prize_codes_delete" on public.prize_codes
  for delete using (
    educator_id = auth.uid() or public.is_super_admin() or public.is_team_member_of(educator_id)
  );

-- ============================================================================
-- raffle_winners — one row per drawn winner (replaces the old "entries")
-- ============================================================================

create table public.raffle_winners (
  id uuid primary key default gen_random_uuid(),
  sorteo_id uuid not null references public.sorteos(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  prize_code_id uuid references public.prize_codes(id),
  position int not null,
  drawn_at timestamptz not null default now(),
  unique (sorteo_id, participant_id)
);

alter table public.raffle_winners enable row level security;

create policy "raffle_winners_owner_select" on public.raffle_winners
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.sorteos s
      where s.id = raffle_winners.sorteo_id
        and (s.educator_id = auth.uid() or public.is_team_member_of(s.educator_id))
    )
  );

-- No insert policy for anon/authenticated: winners are only written by the
-- draw_raffle_winners server action running as the authenticated owning
-- educator through a normal (RLS-checked) client — see below, this table
-- needs an INSERT policy for that owner too.
create policy "raffle_winners_owner_insert" on public.raffle_winners
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.sorteos s
      where s.id = raffle_winners.sorteo_id
        and (s.educator_id = auth.uid() or public.is_team_member_of(s.educator_id))
    )
  );

-- ============================================================================
-- my_entries — a participant's own wins across educators/sorteos (magic link)
-- ============================================================================

create view public.my_entries as
select
  rw.id as entry_id,
  rw.drawn_at as spun_at,
  s.name as sorteo_name,
  s.slug as sorteo_slug,
  p.display_name as educator_display_name,
  p.brand_name as educator_brand_name,
  'Ganador/a'::text as segment_label,
  pc.code,
  pc.status as code_status,
  pc.redeemed_at
from public.raffle_winners rw
join public.participants pt on pt.id = rw.participant_id
join public.sorteos s on s.id = rw.sorteo_id
join public.profiles p on p.id = s.educator_id
left join public.prize_codes pc on pc.id = rw.prize_code_id
where auth.email() is not null and lower(pt.email) = lower(auth.email());

grant select on public.my_entries to authenticated;

-- ============================================================================
-- register_participant() — replaces spin_wheel(); just signs someone up
-- ============================================================================

create or replace function public.register_participant(
  p_slug text,
  p_name text,
  p_email text,
  p_honeypot text default '',
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sorteo record;
  v_attempts int;
  v_already boolean;
begin
  if p_honeypot is not null and length(trim(p_honeypot)) > 0 then
    raise exception 'invalid submission';
  end if;

  if p_email is null or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'invalid email';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'invalid name';
  end if;

  select * into v_sorteo from public.sorteos where slug = p_slug;
  if not found or v_sorteo.status <> 'active' then
    raise exception 'sorteo not available';
  end if;
  if v_sorteo.starts_at is not null and v_sorteo.starts_at > now() then
    raise exception 'sorteo not started yet';
  end if;
  if v_sorteo.ends_at is not null and v_sorteo.ends_at < now() then
    raise exception 'sorteo has ended';
  end if;
  if v_sorteo.drawn_at is not null then
    raise exception 'sorteo has ended';
  end if;

  if p_ip_hash is not null then
    select count(*) into v_attempts
    from public.spin_attempts
    where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes';
    if v_attempts >= 8 then
      raise exception 'too many attempts, try again later';
    end if;
    insert into public.spin_attempts (ip_hash, sorteo_id) values (p_ip_hash, v_sorteo.id);
  end if;

  select exists(
    select 1 from public.participants
    where sorteo_id = v_sorteo.id and lower(email) = lower(p_email)
  ) into v_already;

  if v_already then
    return jsonb_build_object('already_registered', true);
  end if;

  insert into public.participants (sorteo_id, educator_id, name, email, ip_hash)
  values (v_sorteo.id, v_sorteo.educator_id, trim(p_name), lower(trim(p_email)), p_ip_hash);

  return jsonb_build_object('already_registered', false);
end;
$$;

grant execute on function public.register_participant(text, text, text, text, text) to anon, authenticated;
