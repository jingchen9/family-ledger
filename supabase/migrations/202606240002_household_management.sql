create or replace function public.rename_household(target_household_id uuid, next_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := trim(coalesce(next_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_household_owner(target_household_id) then
    raise exception 'Only household owners can rename this household';
  end if;

  if normalized_name = '' then
    raise exception 'Household name is required';
  end if;

  update public.households
  set name = normalized_name
  where id = target_household_id;
end;
$$;

create or replace function public.update_household_member_name(
  target_household_id uuid,
  target_user_id uuid,
  next_display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_household_owner(target_household_id) then
    raise exception 'Only household owners can edit member names';
  end if;

  update public.household_members
  set display_name = left(trim(coalesce(next_display_name, '')), 80)
  where household_id = target_household_id
    and user_id = target_user_id;

  if not found then
    raise exception 'Household member was not found';
  end if;
end;
$$;

create or replace function public.delete_empty_household(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  transaction_count integer;
  accessible_household_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_household_owner(target_household_id) then
    raise exception 'Only household owners can delete this household';
  end if;

  select count(*) into transaction_count
  from public.transactions
  where household_id = target_household_id;

  if transaction_count > 0 then
    raise exception 'Only empty households can be deleted';
  end if;

  select count(*) into accessible_household_count
  from public.household_members
  where user_id = auth.uid();

  if accessible_household_count <= 1 then
    raise exception 'Cannot delete your only household';
  end if;

  delete from public.households
  where id = target_household_id;
end;
$$;

grant execute on function public.rename_household(uuid, text) to authenticated;
grant execute on function public.update_household_member_name(uuid, uuid, text) to authenticated;
grant execute on function public.delete_empty_household(uuid) to authenticated;

notify pgrst, 'reload schema';
