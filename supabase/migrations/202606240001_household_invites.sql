create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role text not null default 'member' check (role = 'member'),
  invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index household_invites_pending_email_idx
  on public.household_invites (household_id, email)
  where accepted_at is null;

alter table public.household_invites enable row level security;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.invite_household_member(target_household_id uuid, target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(target_email));
  invite_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_household_owner(target_household_id) then
    raise exception 'Only household owners can invite members';
  end if;

  if normalized_email = '' or position('@' in normalized_email) <= 1 then
    raise exception 'Valid email is required';
  end if;

  if exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) = normalized_email
  ) then
    raise exception 'You are already a member of this household';
  end if;

  insert into public.household_invites (household_id, email, invited_by)
  values (target_household_id, normalized_email, auth.uid())
  on conflict (household_id, email) where accepted_at is null
  do update set invited_by = excluded.invited_by, created_at = now()
  returning id into invite_id;

  return invite_id;
end;
$$;

create or replace function public.accept_household_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_email text;
  accepted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select lower(email) into current_email
  from auth.users
  where id = auth.uid();

  if current_email is null or current_email = '' then
    return 0;
  end if;

  insert into public.household_members (household_id, user_id, display_name, role)
  select household_id, auth.uid(), current_email, role
  from public.household_invites
  where email = current_email
    and accepted_at is null
  on conflict (household_id, user_id) do nothing;

  update public.household_invites
  set accepted_by = auth.uid(), accepted_at = now()
  where email = current_email
    and accepted_at is null;

  get diagnostics accepted_count = row_count;
  return accepted_count;
end;
$$;

create or replace function public.list_household_members(target_household_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select members.user_id,
    coalesce(users.email, members.display_name, '') as email,
    members.display_name,
    members.role,
    members.created_at
  from public.household_members as members
  left join auth.users as users on users.id = members.user_id
  where members.household_id = target_household_id
    and public.is_household_member(target_household_id)
  order by members.role desc, members.created_at asc;
$$;

create or replace function public.list_household_invites(target_household_id uuid)
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select invites.id, invites.email, invites.role, invites.created_at
  from public.household_invites as invites
  where invites.household_id = target_household_id
    and invites.accepted_at is null
    and public.is_household_owner(target_household_id)
  order by invites.created_at desc;
$$;

create policy "owners read household invites" on public.household_invites
  for select to authenticated using (public.is_household_owner(household_id));
create policy "invitees read own pending invites" on public.household_invites
  for select to authenticated using (
    accepted_at is null
    and email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

grant select on public.household_invites to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.invite_household_member(uuid, text) to authenticated;
grant execute on function public.accept_household_invites() to authenticated;
grant execute on function public.list_household_members(uuid) to authenticated;
grant execute on function public.list_household_invites(uuid) to authenticated;
