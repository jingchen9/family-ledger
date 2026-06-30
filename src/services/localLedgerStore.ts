import { defaultCategories } from "../data/defaultCategories";
import { toEur } from "../lib/money";
import type {
  Category,
  ExchangeRate,
  LedgerSnapshot,
  LedgerStore,
  LedgerTransaction,
  TransactionInput,
} from "../types";

const STORAGE_KEY = "family-ledger-v1";

function initialSnapshot(): LedgerSnapshot {
  return { categories: defaultCategories, transactions: [], exchangeRates: [] };
}

export class LocalLedgerStore implements LedgerStore {
  readonly mode = "local" as const;

  private read(): LedgerSnapshot {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialSnapshot();
    try {
      return JSON.parse(raw) as LedgerSnapshot;
    } catch {
      return initialSnapshot();
    }
  }

  private write(snapshot: LedgerSnapshot): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  async load(): Promise<LedgerSnapshot> {
    return this.read();
  }

  async addTransaction(input: TransactionInput): Promise<LedgerTransaction> {
    const snapshot = this.read();
    const now = new Date().toISOString();
    const transaction: LedgerTransaction = {
      ...input,
      id: crypto.randomUUID(),
      businessType: input.businessType ?? "daily",
      exchangeRate: input.exchangeRate ?? null,
      billedAmount: input.billedAmount ?? null,
      billedCurrency: input.billedCurrency ?? null,
      isCashTransaction: input.isCashTransaction ?? true,
      isFixed: input.isFixed ?? false,
      allocationStartMonth: input.allocationStartMonth ?? null,
      allocationMonths: input.allocationMonths ?? null,
      payerAccount: input.payerAccount ?? null,
      migrationId: input.migrationId ?? null,
      sourceSheet: input.sourceSheet ?? null,
      sourceCell: input.sourceCell ?? null,
      originalCategory: input.originalCategory ?? null,
      migrationStatus: input.migrationStatus ?? "manual",
      eurAmount: toEur(input.amount, input.currency, input.date, snapshot.exchangeRates, input.exchangeRate),
      createdAt: now,
      updatedAt: now,
    };
    snapshot.transactions.push(transaction);
    this.write(snapshot);
    return transaction;
  }

  async importTransactions(inputs: TransactionInput[]): Promise<number> {
    const snapshot = this.read();
    const existingIds = new Set(
      snapshot.transactions.map((item) => item.migrationId).filter((id): id is string => Boolean(id)),
    );
    const now = new Date().toISOString();
    const imported = inputs
      .filter((input) => !input.migrationId || !existingIds.has(input.migrationId))
      .map<LedgerTransaction>((input) => ({
        ...input,
        id: crypto.randomUUID(),
        businessType: input.businessType ?? "daily",
        exchangeRate: input.exchangeRate ?? null,
        billedAmount: input.billedAmount ?? null,
        billedCurrency: input.billedCurrency ?? null,
        isCashTransaction: input.isCashTransaction ?? true,
        isFixed: input.isFixed ?? false,
        allocationStartMonth: input.allocationStartMonth ?? null,
        allocationMonths: input.allocationMonths ?? null,
        payerAccount: input.payerAccount ?? null,
        migrationId: input.migrationId ?? null,
        sourceSheet: input.sourceSheet ?? null,
        sourceCell: input.sourceCell ?? null,
        originalCategory: input.originalCategory ?? null,
        migrationStatus: input.migrationStatus ?? "auto",
        eurAmount: toEur(input.amount, input.currency, input.date, snapshot.exchangeRates, input.exchangeRate),
        createdAt: now,
        updatedAt: now,
      }));
    snapshot.transactions.push(...imported);
    this.write(snapshot);
    return imported.length;
  }

  async updateTransaction(id: string, input: TransactionInput): Promise<LedgerTransaction> {
    const snapshot = this.read();
    const index = snapshot.transactions.findIndex((transaction) => transaction.id === id);
    if (index < 0) throw new Error("没有找到这笔交易");
    const updated: LedgerTransaction = {
      ...snapshot.transactions[index],
      ...input,
      businessType: input.businessType ?? "daily",
      exchangeRate: input.exchangeRate ?? null,
      billedAmount: input.billedAmount ?? null,
      billedCurrency: input.billedCurrency ?? null,
      isCashTransaction: input.isCashTransaction ?? true,
      isFixed: input.isFixed ?? false,
      allocationStartMonth: input.allocationStartMonth ?? null,
      allocationMonths: input.allocationMonths ?? null,
      payerAccount: input.payerAccount ?? null,
      migrationId: input.migrationId ?? null,
      sourceSheet: input.sourceSheet ?? null,
      sourceCell: input.sourceCell ?? null,
      originalCategory: input.originalCategory ?? null,
      migrationStatus: input.migrationStatus ?? "manual",
      eurAmount: toEur(input.amount, input.currency, input.date, snapshot.exchangeRates, input.exchangeRate),
      updatedAt: new Date().toISOString(),
    };
    snapshot.transactions[index] = updated;
    this.write(snapshot);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const snapshot = this.read();
    snapshot.transactions = snapshot.transactions.filter((transaction) => transaction.id !== id);
    this.write(snapshot);
  }

  async addCategory(input: Pick<Category, "name" | "direction" | "color">): Promise<Category> {
    const snapshot = this.read();
    const category: Category = {
      ...input,
      id: crypto.randomUUID(),
      active: true,
      sortOrder: snapshot.categories.filter((item) => item.direction === input.direction).length,
    };
    snapshot.categories.push(category);
    this.write(snapshot);
    return category;
  }

  async addExchangeRate(input: Omit<ExchangeRate, "id">): Promise<ExchangeRate> {
    const snapshot = this.read();
    const rate = { ...input, id: crypto.randomUUID() };
    snapshot.exchangeRates.push(rate);
    snapshot.transactions = snapshot.transactions.map((transaction) => ({
      ...transaction,
      eurAmount: toEur(
        transaction.amount,
        transaction.currency,
        transaction.date,
        snapshot.exchangeRates,
        transaction.exchangeRate,
      ),
      updatedAt: new Date().toISOString(),
    }));
    this.write(snapshot);
    return rate;
  }
}
