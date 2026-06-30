export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function currentMonth(): string {
  return todayIso().slice(0, 7);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T12:00:00`));
}

export function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return `${year} 年 ${month} 月`;
}

export function monthDistance(start: string, target: string): number {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [targetYear, targetMonth] = target.split("-").map(Number);
  return (targetYear - startYear) * 12 + targetMonth - startMonth;
}
