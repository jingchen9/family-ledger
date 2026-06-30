export function parseDecimalInput(value: string): number {
  const normalized = cleanDecimalInput(value).trim().replaceAll(",", ".");
  if (!normalized || normalized === ".") return Number.NaN;
  return Number(normalized);
}

export function cleanDecimalInput(value: string): string {
  return value.replace(/[^\d,.]/g, "");
}
