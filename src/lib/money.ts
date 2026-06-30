import type { Currency, ExchangeRate } from "../types";

export function formatMoney(value: number, currency: Currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function findRate(
  rates: ExchangeRate[],
  currency: Currency,
  date: string,
): number | null {
  if (currency === "EUR") return 1;
  return (
    rates
      .filter((rate) => rate.currency === currency && rate.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]?.unitsPerEur ?? null
  );
}

export function toEur(
  amount: number,
  currency: Currency,
  date: string,
  rates: ExchangeRate[],
  transactionRate?: number | null,
): number | null {
  const rate = transactionRate ?? findRate(rates, currency, date);
  return rate ? amount / rate : null;
}
