-- v1.5: let a participant find out if they won without logging in / mail.
--
-- register_participant() now also returns the participant's own id, and a
-- new check_participant_prize() lets the browser (holding that id in
-- localStorage) ask "did I win?" — scoped to exactly that one participant,
-- never leaking any other registrant's data.

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
  v_existing_id uuid;
  v_new_id uuid;
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

  select id into v_existing_id
  from public.participants
  where sorteo_id = v_sorteo.id and lower(email) = lower(p_email);

  if v_existing_id is not null then
    return jsonb_build_object('already_registered', true, 'participant_id', v_existing_id);
  end if;

  insert into public.participants (sorteo_id, educator_id, name, email, ip_hash)
  values (v_sorteo.id, v_sorteo.educator_id, trim(p_name), lower(trim(p_email)), p_ip_hash)
  returning id into v_new_id;

  return jsonb_build_object('already_registered', false, 'participant_id', v_new_id);
end;
$$;

grant execute on function public.register_participant(text, text, text, text, text) to anon, authenticated;

-- ============================================================================
-- check_participant_prize() — a participant's own result, nothing more
-- ============================================================================

create or replace function public.check_participant_prize(
  p_slug text,
  p_participant_id uuid
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
begin
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

grant execute on function public.check_participant_prize(text, uuid) to anon, authenticated;
