create or replace function public.delete_unused_category(target_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select household_id
  into target_household_id
  from public.categories
  where id = target_category_id;

  if target_household_id is null then
    raise exception 'category not found';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'not allowed';
  end if;

  if exists (
    select 1
    from public.transactions
    where household_id = target_household_id
      and category_id = target_category_id
  ) then
    raise exception 'category is used by transactions';
  end if;

  delete from public.categories
  where id = target_category_id
    and household_id = target_household_id;
end;
$$;

grant execute on function public.delete_unused_category(uuid) to authenticated;

notify pgrst, 'reload schema';
