import { todayIso } from "../lib/date";

interface DateSelectFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
}

interface MonthSelectFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
}

function currentYear(): number {
  return Number(todayIso().slice(0, 4));
}

function yearsAround(value: string): number[] {
  const selectedYear = Number(value.slice(0, 4)) || currentYear();
  const maxYear = Math.max(currentYear() + 1, selectedYear + 1);
  const minYear = Math.min(2020, selectedYear - 1);
  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function partsFromDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const fallback = todayIso().split("-").map(Number);
  return {
    year: year || fallback[0],
    month: month || fallback[1],
    day: day || fallback[2],
  };
}

function partsFromMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const fallback = todayIso().split("-").map(Number);
  return {
    year: year || fallback[0],
    month: month || fallback[1],
  };
}

function dateValue(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const months = Array.from({ length: 12 }, (_, index) => index + 1);

export function DateSelectField({ label, value, onChange }: DateSelectFieldProps) {
  const { year, month, day } = partsFromDate(value);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1);

  function changeYear(nextYear: number) {
    onChange(dateValue(nextYear, month, clampDay(nextYear, month, day)));
  }

  function changeMonth(nextMonth: number) {
    onChange(dateValue(year, nextMonth, clampDay(year, nextMonth, day)));
  }

  return (
    <fieldset className="date-select-field">
      <legend>{label}</legend>
      <div className="date-select-grid three-parts">
        <select aria-label={`${label} 年`} value={year} onChange={(event) => changeYear(Number(event.target.value))}>
          {yearsAround(value).map((item) => (
            <option key={item} value={item}>{item} 年</option>
          ))}
        </select>
        <select aria-label={`${label} 月`} value={month} onChange={(event) => changeMonth(Number(event.target.value))}>
          {months.map((item) => (
            <option key={item} value={item}>{item} 月</option>
          ))}
        </select>
        <select aria-label={`${label} 日`} value={day} onChange={(event) => onChange(dateValue(year, month, Number(event.target.value)))}>
          {days.map((item) => (
            <option key={item} value={item}>{item} 日</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

export function MonthSelectField({ label, value, onChange }: MonthSelectFieldProps) {
  const { year, month } = partsFromMonth(value);

  return (
    <fieldset className="date-select-field month-picker">
      <legend>{label}</legend>
      <div className="date-select-grid two-parts">
        <select aria-label={`${label} 年`} value={year} onChange={(event) => onChange(monthValue(Number(event.target.value), month))}>
          {yearsAround(value).map((item) => (
            <option key={item} value={item}>{item} 年</option>
          ))}
        </select>
        <select aria-label={`${label} 月`} value={month} onChange={(event) => onChange(monthValue(year, Number(event.target.value)))}>
          {months.map((item) => (
            <option key={item} value={item}>{item} 月</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
