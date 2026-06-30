alter table public.transactions
  add column if not exists billed_amount numeric(18, 2),
  add column if not exists billed_currency public.ledger_currency;

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
    if new.exchange_rate is null then
      select units_per_eur into new.exchange_rate
      from public.exchange_rates
      where household_id = new.household_id
        and currency = new.currency
        and effective_date <= new.transaction_date
      order by effective_date desc
      limit 1;
    end if;

    new.eur_amount := case
      when new.exchange_rate is null then null
      else round(new.amount / new.exchange_rate, 2)
    end;
  end if;

  if new.billed_amount is null then
    new.billed_currency := null;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_prepare_amounts on public.transactions;
create trigger transactions_prepare_amounts
before insert or update of amount, currency, exchange_rate, billed_amount, billed_currency, transaction_date, household_id
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
  set exchange_rate = new.units_per_eur,
      eur_amount = round(amount / new.units_per_eur, 2)
  where household_id = new.household_id
    and currency = new.currency
    and transaction_date >= new.effective_date
    and billed_amount is null;
  return new;
end;
$$;

notify pgrst, 'reload schema';
