grant usage on schema public to authenticated;

grant select on public.households to authenticated;
grant select on public.household_members to authenticated;

grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.exchange_rates to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
