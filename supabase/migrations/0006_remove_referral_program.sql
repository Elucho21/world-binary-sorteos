-- Revert the referral program added in 0005 (product feedback: not wanted).
-- Kept as its own migration instead of editing 0005 since that one may
-- already have been applied.

drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid() or public.is_super_admin() or managed_by = auth.uid()
  );

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

alter table public.profiles drop column if exists referred_by;
