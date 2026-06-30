import type { Category } from "../types";

const expenseNames = [
  ["超市", "#56876d"],
  ["餐饮", "#d49a58"],
  ["交通", "#5e7791"],
  ["住房", "#6c7aa1"],
  ["水电网", "#5d8193"],
  ["医疗", "#789e8d"],
  ["教育", "#7c6f9f"],
  ["生活用品", "#8a8f86"],
  ["人情礼物", "#bf7a8d"],
  ["娱乐", "#a67c52"],
  ["购物", "#d97757"],
  ["其他", "#7e7474"],
] as const;

// Keep one generic income category so first-time users can record income immediately.
// Families can rename it or add their own income categories in Settings.
const incomeNames = [
  ["收入", "#297a64"],
] as const;

export const defaultCategories: Category[] = [
  ...expenseNames.map(([name, color], index) => ({
    id: `expense-${index + 1}`,
    name,
    color,
    direction: "expense" as const,
    sortOrder: index,
    active: true,
  })),
  ...incomeNames.map(([name, color], index) => ({
    id: `income-${index + 1}`,
    name,
    color,
    direction: "income" as const,
    sortOrder: index,
    active: true,
  })),
];
