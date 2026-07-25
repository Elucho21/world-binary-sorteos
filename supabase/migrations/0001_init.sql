-- World Binary Sorteos — initial schema
-- Tables, RLS policies, helper functions, spin_wheel() RPC, profile-creation trigger.

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

-- ============================================================================
-- profiles
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'educator' check (role in ('super_admin', 'educator')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  display_name text,
  brand_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());

create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

-- Non-admins may update their own display fields but never their own role/status.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (used for the initial super-admin bootstrap and other
  -- trusted server-side operations) has no auth.uid(), so is_super_admin()
  -- would always read false for it — let it through unconditionally.
  -- NOTE: must check auth.role(), not current_user — inside a SECURITY
  -- DEFINER function current_user is always the function's owner, never
  -- the actual calling role.
  if auth.role() <> 'service_role' and not public.is_super_admin() then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'not authorized to change role or status';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_profile_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- sorteos
-- ============================================================================

create table public.sorteos (
  id uuid primary key default gen_random_uuid(),
  educator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  mechanic_type text not null default 'wheel',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  max_entries int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sorteos enable row level security;

create policy "sorteos_owner_all" on public.sorteos
  for all using (educator_id = auth.uid() or public.is_super_admin())
  with check (educator_id = auth.uid() or public.is_super_admin());

-- A sorteo can only go 'active' if its educator is approved; also stamps updated_at.
create or replace function public.enforce_sorteo_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_educator_status text;
begin
  if new.status = 'active' then
    select status into v_educator_status from public.profiles where id = new.educator_id;
    if v_educator_status is distinct from 'approved' then
      raise exception 'educator must be approved before activating a sorteo';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_enforce_sorteo_activation
  before insert or update on public.sorteos
  for each row execute function public.enforce_sorteo_activation();

-- ============================================================================
-- wheel_segments
-- ============================================================================

create table public.wheel_segments (
  id uuid primary key default gen_random_uuid(),
  sorteo_id uuid not null references public.sorteos(id) on delete cascade,
  label text not null,
  color text not null default '#6366f1',
  weight numeric not null default 1 check (weight >= 0),
  prize_tier text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_consolation boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.wheel_segments enable row level security;

create policy "wheel_segments_owner_all" on public.wheel_segments
  for all using (
    public.is_super_admin()
    or exists (select 1 from public.sorteos s where s.id = wheel_segments.sorteo_id and s.educator_id = auth.uid())
  )
  with check (
    public.is_super_admin()
    or exists (select 1 from public.sorteos s where s.id = wheel_segments.sorteo_id and s.educator_id = auth.uid())
  );

-- ============================================================================
-- participants
-- ============================================================================

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  sorteo_id uuid not null references public.sorteos(id) on delete cascade,
  educator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text not null,
  consent boolean not null default true,
  ip_hash text,
  created_at timestamptz not null default now()
);

create unique index participants_sorteo_email_key on public.participants (sorteo_id, lower(email));

alter table public.participants enable row level security;

-- Only the owning educator / super admin can read participant rows directly;
-- participants themselves read their own results through the my_entries view below.
create policy "participants_owner_select" on public.participants
  for select using (educator_id = auth.uid() or public.is_super_admin());

-- No insert/update/delete policies here on purpose: all public writes go through
-- spin_wheel(), which runs SECURITY DEFINER and bypasses RLS as the function owner.

-- ============================================================================
-- code_batches
-- ============================================================================

create table public.code_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  educator_id uuid not null references public.profiles(id) on delete cascade,
  origin text not null check (origin in ('admin', 'educator')),
  method text not null check (method in ('file', 'manual')),
  total_codes int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.code_batches enable row level security;

create policy "code_batches_select" on public.code_batches
  for select using (educator_id = auth.uid() or public.is_super_admin());

create policy "code_batches_insert" on public.code_batches
  for insert with check (
    created_by = auth.uid() and (educator_id = auth.uid() or public.is_super_admin())
  );

-- ============================================================================
-- prize_codes ("cuentas bono")
-- ============================================================================

create table public.prize_codes (
  id uuid primary key default gen_random_uuid(),
  educator_id uuid not null references public.profiles(id) on delete cascade,
  segment_id uuid references public.wheel_segments(id) on delete set null,
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
  check ((status = 'unassigned') = (segment_id is null))
);

alter table public.prize_codes enable row level security;

create policy "prize_codes_select" on public.prize_codes
  for select using (educator_id = auth.uid() or public.is_super_admin());

create policy "prize_codes_insert" on public.prize_codes
  for insert with check (
    created_by = auth.uid() and (educator_id = auth.uid() or public.is_super_admin())
  );

create policy "prize_codes_update" on public.prize_codes
  for update using (educator_id = auth.uid() or public.is_super_admin())
  with check (educator_id = auth.uid() or public.is_super_admin());

create policy "prize_codes_delete" on public.prize_codes
  for delete using (educator_id = auth.uid() or public.is_super_admin());

-- ============================================================================
-- entries (spins)
-- ============================================================================

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  sorteo_id uuid not null references public.sorteos(id) on delete cascade,
  segment_id uuid not null references public.wheel_segments(id),
  prize_code_id uuid references public.prize_codes(id),
  spun_at timestamptz not null default now()
);

alter table public.entries enable row level security;

create policy "entries_owner_select" on public.entries
  for select using (
    public.is_super_admin()
    or exists (select 1 from public.sorteos s where s.id = entries.sorteo_id and s.educator_id = auth.uid())
  );

-- ============================================================================
-- admin_settings (single row)
-- ============================================================================

create table public.admin_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'World Binary Sorteos',
  support_email text,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings (id) values (true);

alter table public.admin_settings enable row level security;

create policy "admin_settings_select" on public.admin_settings for select using (true);
create policy "admin_settings_update" on public.admin_settings for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================================
-- spin_attempts (rate-limit ledger, touched only by spin_wheel())
-- ============================================================================

create table public.spin_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  sorteo_id uuid not null references public.sorteos(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index spin_attempts_lookup_idx on public.spin_attempts (ip_hash, sorteo_id, created_at);

alter table public.spin_attempts enable row level security;
-- Intentionally no policies: only spin_wheel() (SECURITY DEFINER) touches this table.

-- ============================================================================
-- banners
-- ============================================================================

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  placement text not null check (placement in ('public_sorteo_page', 'participant_dashboard')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy "banners_admin_all" on public.banners
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================================
-- Public-safe views
-- ============================================================================

-- Active sorteos, safe columns only, for the public landing page.
create view public.public_sorteos as
select
  s.id, s.name, s.slug, s.description, s.status, s.starts_at, s.ends_at,
  p.display_name as educator_display_name, p.brand_name as educator_brand_name
from public.sorteos s
join public.profiles p on p.id = s.educator_id
where s.status = 'active'
  and (s.starts_at is null or s.starts_at <= now())
  and (s.ends_at is null or s.ends_at >= now());

grant select on public.public_sorteos to anon, authenticated;

-- Active wheel segments for an active sorteo (no weight/prize_tier exposed).
create view public.public_wheel_segments as
select ws.id, ws.sorteo_id, ws.label, ws.color, ws.sort_order
from public.wheel_segments ws
join public.sorteos s on s.id = ws.sorteo_id
where ws.is_active = true and s.status = 'active'
order by ws.sort_order asc;

grant select on public.public_wheel_segments to anon, authenticated;

-- Active banners, safe columns only.
create view public.active_banners as
select id, title, image_url, link_url, placement, sort_order
from public.banners
where is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
order by sort_order asc;

grant select on public.active_banners to anon, authenticated;

-- A participant's own prizes across every educator/sorteo, matched by their
-- authenticated (magic-link) email. Runs with owner rights so it can join
-- tables the caller has no direct RLS access to, but the email filter below
-- is what actually scopes the result to the caller.
create view public.my_entries as
select
  e.id as entry_id,
  e.spun_at,
  s.name as sorteo_name,
  s.slug as sorteo_slug,
  p.display_name as educator_display_name,
  p.brand_name as educator_brand_name,
  ws.label as segment_label,
  pc.code,
  pc.status as code_status,
  pc.redeemed_at
from public.entries e
join public.participants pt on pt.id = e.participant_id
join public.sorteos s on s.id = e.sorteo_id
join public.profiles p on p.id = s.educator_id
join public.wheel_segments ws on ws.id = e.segment_id
left join public.prize_codes pc on pc.id = e.prize_code_id
where auth.email() is not null and lower(pt.email) = lower(auth.email());

grant select on public.my_entries to authenticated;

-- ============================================================================
-- spin_wheel() — the only way anon traffic can write participants/entries/prize_codes
-- ============================================================================

create or replace function public.spin_wheel(
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
  v_participant record;
  v_existing_entry_id uuid;
  v_existing_segment_id uuid;
  v_existing_segment_label text;
  v_existing_code text;
  v_segment record;
  v_code record;
  v_attempts int;
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

  if p_ip_hash is not null then
    select count(*) into v_attempts
    from public.spin_attempts
    where ip_hash = p_ip_hash and created_at > now() - interval '10 minutes';
    if v_attempts >= 8 then
      raise exception 'too many attempts, try again later';
    end if;
    insert into public.spin_attempts (ip_hash, sorteo_id) values (p_ip_hash, v_sorteo.id);
  end if;

  select e.id, e.segment_id, ws.label, pc.code
    into v_existing_entry_id, v_existing_segment_id, v_existing_segment_label, v_existing_code
  from public.entries e
  join public.participants pt on pt.id = e.participant_id
  left join public.wheel_segments ws on ws.id = e.segment_id
  left join public.prize_codes pc on pc.id = e.prize_code_id
  where e.sorteo_id = v_sorteo.id and lower(pt.email) = lower(p_email)
  limit 1;

  if found then
    return jsonb_build_object(
      'already_played', true,
      'segment_id', v_existing_segment_id,
      'segment_label', v_existing_segment_label,
      'code', v_existing_code
    );
  end if;

  insert into public.participants (sorteo_id, educator_id, name, email, ip_hash)
  values (v_sorteo.id, v_sorteo.educator_id, trim(p_name), lower(trim(p_email)), p_ip_hash)
  returning * into v_participant;

  with eligible as (
    select
      ws.id, ws.label, ws.weight, ws.is_consolation,
      sum(ws.weight) over (order by ws.sort_order, ws.id rows unbounded preceding) as cum_weight,
      sum(ws.weight) over () as total_weight
    from public.wheel_segments ws
    where ws.sorteo_id = v_sorteo.id
      and ws.is_active = true
      and ws.weight > 0
      and (
        ws.is_consolation
        or exists (select 1 from public.prize_codes pc where pc.segment_id = ws.id and pc.status = 'available')
      )
  ),
  roll as (
    select random() * (select total_weight from eligible limit 1) as r
  )
  select eligible.* into v_segment
  from eligible, roll
  where roll.r <= eligible.cum_weight
  order by eligible.cum_weight asc
  limit 1;

  if v_segment.id is null then
    raise exception 'no prizes available for this sorteo right now';
  end if;

  v_code := null;
  if not v_segment.is_consolation then
    update public.prize_codes
    set status = 'issued', issued_to = v_participant.id, issued_at = now()
    where id = (
      select id from public.prize_codes
      where segment_id = v_segment.id and status = 'available'
      for update skip locked
      limit 1
    )
    returning * into v_code;
  end if;

  insert into public.entries (participant_id, sorteo_id, segment_id, prize_code_id)
  values (v_participant.id, v_sorteo.id, v_segment.id, v_code.id);

  return jsonb_build_object(
    'already_played', false,
    'segment_id', v_segment.id,
    'segment_label', v_segment.label,
    'code', v_code.code
  );
end;
$$;

grant execute on function public.spin_wheel(text, text, text, text, text) to anon, authenticated;
