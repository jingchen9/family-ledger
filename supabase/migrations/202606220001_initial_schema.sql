create extension if not exists pgcrypto;

create type public.transaction_direction as enum ('income', 'expense', 'neutral');
create type public.ledger_currency as enum ('EUR', 'CNY');
create type public.business_type as enum (
  'daily', 'resale', 'exchange', 'loan', 'repayment', 'transfer', 'investment'
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  direction public.transaction_direction not null check (direction <> 'neutral'),
  color text not null default '#56876d',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, direction, name),
  unique (household_id, id)
);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  effective_date date not null,
  currency public.ledger_currency not null check (currency <> 'EUR'),
  units_per_eur numeric(18, 8) not null check (units_per_eur > 0),
  source text not null default '',
  created_at timestamptz not null default now(),
  unique (household_id, effective_date, currency)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  transaction_date date not null,
  direction public.transaction_direction not null,
  category_id uuid not null,
  amount numeric(18, 2) not null check (amount > 0),
  currency public.ledger_currency not null default 'EUR',
  exchange_rate numeric(18, 8),
  eur_amount numeric(18, 2),
  detail text not null default '',
  business_type public.business_type not null default 'daily',
  is_cash_transaction boolean not null default true,
  is_fixed boolean not null default false,
  allocation_start_month date,
  allocation_months integer check (allocation_months between 1 and 120),
  payer_account text,
  migration_id text,
  source_sheet text,
  source_cell text,
  original_category text,
  migration_status text not null default 'manual'
    check (migration_status in ('auto', 'review', 'manual')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (allocation_start_month is null and allocation_months is null)
    or (allocation_start_month is not null and allocation_months is not null)
  ),
  foreign key (household_id, category_id)
    references public.categories(household_id, id)
);

create index transactions_household_date_idx
  on public.transactions (household_id, transaction_date desc);
create unique index transactions_household_migration_idx
  on public.transactions (household_id, migration_id)
  where migration_id is not null;
create index categories_household_idx on public.categories (household_id, direction, active);
create index exchange_rates_lookup_idx
  on public.exchange_rates (household_id, currency, effective_date desc);
create index household_members_user_idx on public.household_members (user_id, household_id);

create or replace function public.is_household_member(target_household_id uuid)
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
  );
$$;

create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.households (name)
  values (coalesce(nullif(trim(household_name), ''), '我的家庭'))
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  insert into public.categories (household_id, name, direction, color, sort_order)
  values
    (new_household_id, '超市', 'expense', '#56876d', 0),
    (new_household_id, '餐饮', 'expense', '#d49a58', 1),
    (new_household_id, '交通', 'expense', '#5e7791', 2),
    (new_household_id, '住房', 'expense', '#6c7aa1', 3),
    (new_household_id, '水电网', 'expense', '#5d8193', 4),
    (new_household_id, '医疗', 'expense', '#789e8d', 5),
    (new_household_id, '教育', 'expense', '#7c6f9f', 6),
    (new_household_id, '生活用品', 'expense', '#8a8f86', 7),
    (new_household_id, '人情礼物', 'expense', '#bf7a8d', 8),
    (new_household_id, '娱乐', 'expense', '#a67c52', 9),
    (new_household_id, '购物', 'expense', '#d97757', 10),
    (new_household_id, '其他', 'expense', '#7e7474', 11),
    (new_household_id, '收入', 'income', '#297a64', 0);

  return new_household_id;
end;
$$;

create or replace function public.prepare_transaction_amounts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.currency = 'EUR' then
    new.exchange_rate := 1;
    new.eur_amount := new.amount;
  else
    select units_per_eur into new.exchange_rate
    from public.exchange_rates
    where household_id = new.household_id
      and currency = new.currency
      and effective_date <= new.transaction_date
    order by effective_date desc
    limit 1;

    new.eur_amount := case
      when new.exchange_rate is null then null
      else round(new.amount / new.exchange_rate, 2)
    end;
  end if;
  return new;
end;
$$;

create trigger transactions_prepare_amounts
before insert or update of amount, currency, transaction_date, household_id
on public.transactions
for each row execute function public.prepare_transaction_amounts();

create or replace function public.refresh_transactions_after_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.transactions
  set amount = amount
  where household_id = new.household_id
    and currency = new.currency;
  return new;
end;
$$;

create trigger exchange_rates_refresh_transactions
after insert or update of units_per_eur, effective_date
on public.exchange_rates
for each row execute function public.refresh_transactions_after_rate();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.transactions enable row level security;

create policy "members read households" on public.households
  for select to authenticated using (public.is_household_member(id));
create policy "members read memberships" on public.household_members
  for select to authenticated using (user_id = auth.uid());

create policy "members read categories" on public.categories
  for select to authenticated using (public.is_household_member(household_id));
create policy "members create categories" on public.categories
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members update categories" on public.categories
  for update to authenticated using (public.is_household_member(household_id));

create policy "members read rates" on public.exchange_rates
  for select to authenticated using (public.is_household_member(household_id));
create policy "members create rates" on public.exchange_rates
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members update rates" on public.exchange_rates
  for update to authenticated using (public.is_household_member(household_id));

create policy "members read transactions" on public.transactions
  for select to authenticated using (public.is_household_member(household_id));
create policy "members create transactions" on public.transactions
  for insert to authenticated with check (
    public.is_household_member(household_id) and created_by = auth.uid()
  );
create policy "members update transactions" on public.transactions
  for update to authenticated using (public.is_household_member(household_id));
create policy "members delete transactions" on public.transactions
  for delete to authenticated using (public.is_household_member(household_id));

grant execute on function public.create_household(text) to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
