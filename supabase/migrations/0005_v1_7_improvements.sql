-- v1.7: prize tiers, referral program, verifiable draws, automatic runner-up,
-- and closing the rate-limit asymmetry on check_participant_prize().

-- ============================================================================
-- Referral program: an educator can refer another educator at signup
-- ============================================================================

alter table public.profiles add column referred_by uuid references public.profiles(id);

-- Let a referrer see the profiles (status/name only, via this same table) of
-- the educators they referred, so the "Referidos" dashboard page can list them.
drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_super_admin()
    or managed_by = auth.uid()
    or referred_by = auth.uid()
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_by uuid;
begin
  v_referred_by := nullif(new.raw_user_meta_data ->> 'referred_by', '')::uuid;
  if v_referred_by is not null and not exists (select 1 from public.profiles where id = v_referred_by) then
    v_referred_by := null;
  end if;

  insert into public.profiles (id, display_name, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    v_referred_by
  );
  return new;
end;
$$;

-- ============================================================================
-- Prize tiers: a sorteo can mix one big prize with several smaller ones.
-- Lower tier_priority draws first, so position 1 gets the top-tier code.
-- ============================================================================

alter table public.prize_codes add column tier text;
alter table public.prize_codes add column tier_priority int not null default 100;

comment on column public.prize_codes.tier is 'Free-text label shown to the educator (e.g. "Premio grande"); null = untiered.';
comment on column public.prize_codes.tier_priority is 'Lower draws first — position 1 gets the lowest tier_priority available code.';

-- ============================================================================
-- Verifiable draw: the seed and a hash of the exact participant order used,
-- so the shuffle in drawWinners() can be reproduced and checked independently.
-- ============================================================================

alter table public.sorteos add column draw_seed text;
alter table public.sorteos add column draw_participants_hash text;

comment on column public.sorteos.draw_seed is 'Hex seed for the mulberry32 PRNG used to shuffle participants at draw time.';
comment on column public.sorteos.draw_participants_hash is 'sha256 of the ordered participant id list (created_at asc, id asc) fed into the shuffle.';

-- ============================================================================
-- Automatic runner-up: an unclaimed prize can be reassigned once to the next
-- eligible participant (see netlify/functions/reassign-unclaimed-prizes.mts).
-- ============================================================================

alter table public.raffle_winners add column original_participant_id uuid references public.participants(id);
alter table public.raffle_winners add column reassigned_at timestamptz;

comment on column public.raffle_winners.original_participant_id is 'Set only when this row was reassigned: who was originally drawn for this position.';

-- ============================================================================
-- spin_attempts: tag the kind of attempt so check_participant_prize polling
-- can have its own (much more generous) budget without eating into the
-- register_participant budget that shares the same ip_hash bucket.
-- ============================================================================

alter table public.spin_attempts add column kind text not null default 'register' check (kind in ('register', 'check_prize'));

-- ============================================================================
-- check_participant_prize(): close the rate-limit asymmetry noted in v1.7 —
-- register_participant() already throttles by ip_hash, this didn't.
-- ============================================================================

drop function if exists public.check_participant_prize(text, uuid);

create or replace function public.check_participant_prize(
  p_slug text,
  p_participant_id uuid,
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
  v_winner record;
  v_attempts int;
begin
  if p_ip_hash is not null then
    select count(*) into v_attempts
    from public.spin_attempts
    where ip_hash = p_ip_hash and kind = 'check_prize' and created_at > now() - interval '10 minutes';
    -- Generous on purpose: legitimate use is a client polling its own result
    -- every ~27s, often from many devices behind one shared/event wifi IP.
    if v_attempts >= 200 then
      raise exception 'too many attempts, try again later';
    end if;
    insert into public.spin_attempts (ip_hash, sorteo_id, kind)
    select p_ip_hash, s.id, 'check_prize' from public.sorteos s where s.slug = p_slug;
  end if;

  select * into v_sorteo from public.sorteos where slug = p_slug;
  if not found then
    return jsonb_build_object('drawn', false, 'won', false, 'code', null);
  end if;

  if v_sorteo.drawn_at is null then
    return jsonb_build_object('drawn', false, 'won', false, 'code', null);
  end if;

  select * into v_participant
  from public.participants
  where id = p_participant_id and sorteo_id = v_sorteo.id;

  if not found then
    return jsonb_build_object('drawn', true, 'won', false, 'code', null);
  end if;

  select rw.*, pc.code into v_winner
  from public.raffle_winners rw
  left join public.prize_codes pc on pc.id = rw.prize_code_id
  where rw.sorteo_id = v_sorteo.id and rw.participant_id = v_participant.id;

  if not found then
    return jsonb_build_object('drawn', true, 'won', false, 'code', null);
  end if;

  return jsonb_build_object('drawn', true, 'won', true, 'code', v_winner.code);
end;
$$;

grant execute on function public.check_participant_prize(text, uuid, text) to anon, authenticated;
