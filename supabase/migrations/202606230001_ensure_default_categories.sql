create or replace function public.ensure_default_categories(target_household_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_household_member(target_household_id) then
    raise exception 'Authentication required';
  end if;

  insert into public.categories (household_id, name, direction, color, sort_order)
  values
    (target_household_id, '超市', 'expense', '#56876d', 0),
    (target_household_id, '餐饮', 'expense', '#d49a58', 1),
    (target_household_id, '交通', 'expense', '#5e7791', 2),
    (target_household_id, '住房', 'expense', '#6c7aa1', 3),
    (target_household_id, '水电网', 'expense', '#5d8193', 4),
    (target_household_id, '医疗', 'expense', '#789e8d', 5),
    (target_household_id, '教育', 'expense', '#7c6f9f', 6),
    (target_household_id, '生活用品', 'expense', '#8a8f86', 7),
    (target_household_id, '人情礼物', 'expense', '#bf7a8d', 8),
    (target_household_id, '娱乐', 'expense', '#a67c52', 9),
    (target_household_id, '购物', 'expense', '#d97757', 10),
    (target_household_id, '其他', 'expense', '#7e7474', 11),
    (target_household_id, '收入', 'income', '#297a64', 0)
  on conflict (household_id, direction, name) do nothing;
end;
$$;

grant execute on function public.ensure_default_categories(uuid) to authenticated;
