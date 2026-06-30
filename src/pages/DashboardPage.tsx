import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLedger } from "../context/LedgerContext";
import { MonthSelectField } from "../components/DateFields";
import { calculateMonthMetrics, categoryExpenseData, latestConversionRates, yearTrend } from "../lib/analytics";
import { formatMonth } from "../lib/date";
import { formatMoney } from "../lib/money";
import type { AnalysisCurrency, AnalysisScope, Currency } from "../types";

interface DashboardPageProps {
  month: string;
  onMonthChange(month: string): void;
}

interface BarLabelProps {
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  value?: unknown;
  index?: unknown;
}

function niceAxisMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 100;
  const padded = value * 1.16;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 4 ? 4 : normalized <= 6 ? 6 : normalized <= 8 ? 8 : 10;
  return niceNormalized * magnitude;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia(query).matches
  ));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

export function DashboardPage({ month, onMonthChange }: DashboardPageProps) {
  const { transactions, categories, exchangeRates } = useLedger();
  const [analysisCurrency, setAnalysisCurrency] = useState<AnalysisCurrency>("EUR");
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>("all_cash");
  const [showDefinitions, setShowDefinitions] = useState(false);
  const isNarrowChart = useMediaQuery("(max-width: 640px)");
  const year = month.slice(0, 4);
  const displayCurrency: Currency = analysisCurrency === "CNY" ? "CNY" : "EUR";
  const scopeLabel = analysisScope === "all_cash" ? "全部流水" : "家庭日常";
  const analysisNoun = analysisScope === "all_cash" ? "流水" : "家庭";
  const monthlyIncomeLabel = `${analysisNoun}月收入`;
  const monthlyExpenseLabel = `${analysisNoun}月支出（含均摊）`;
  const monthlyBalanceLabel = `${analysisNoun}月结余`;
  const monthlyCashExpenseLabel = `${analysisNoun}月支出（实际）`;
  const yearlyBalanceLabel = `${year} 年${analysisNoun}结余`;
  const currencyLabel = analysisCurrency === "EUR_CONVERTED"
    ? "折算 EUR"
    : displayCurrency;
  const scopeDescription = analysisScope === "all_cash"
    ? "全部流水包含代购、理财、转账等所有现金记录。"
    : "家庭日常会排除代购、理财、转账、贷款和换汇。";
  const currencyDescription = analysisCurrency === "EUR_CONVERTED"
    ? "当前把 CNY 按统一报表汇率折成 EUR 后合并查看。"
    : `当前只看 ${displayCurrency} 记录，不做汇率折算。`;
  const conversionRates = useMemo(() => latestConversionRates(exchangeRates), [exchangeRates]);
  const cnyReportRate = useMemo(
    () => exchangeRates
      .filter((rate) => rate.currency === "CNY")
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null,
    [exchangeRates],
  );
  const metrics = useMemo(
    () => calculateMonthMetrics(transactions, month, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, conversionRates, month, transactions],
  );
  const categoryData = useMemo(
    () => categoryExpenseData(transactions, categories, month, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, categories, conversionRates, month, transactions],
  );
  const trend = useMemo(
    () => yearTrend(transactions, year, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, conversionRates, transactions, year],
  );
  const yearBalance = trend.reduce((sum, item) => sum + item.income - item.allocatedExpense, 0);
  const monthlyCost = metrics.allocatedExpense;
  const monthlyBalance = metrics.income - monthlyCost;
  const signedMoney = (value: number) => {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${formatMoney(Math.abs(value), displayCurrency)}`;
  };
  const signedClass = (value: number) => value >= 0 ? "metric-positive" : "metric-negative";
  const expenseMoney = (value: number) => signedMoney(-Math.abs(value));
  const barMoney = (value: unknown) => expenseMoney(Math.abs(Number(value)));
  const categoryChartHeight = Math.max(330, categoryData.length * 34);
  const categoryAxisMax = niceAxisMax(Math.max(0, ...categoryData.map((item) => item.value)));
  const categoryChartData = useMemo(
    () => categoryData.map((item) => ({ ...item, expenseValue: -item.value })),
    [categoryData],
  );
  const categoryChartMargin = isNarrowChart
    ? { left: 78, right: 0, top: 4, bottom: 4 }
    : { left: 94, right: 6, top: 4, bottom: 4 };
  const categoryAxisWidth = isNarrowChart ? 68 : 76;
  const categoryTickFontSize = isNarrowChart ? 11 : 12;
  const chartTickStyle = { fontSize: categoryTickFontSize, fontFamily: "inherit" };
  const renderCategoryBarLabel = ({ x, y, width, height, value, index }: BarLabelProps) => {
    const labelX = Number(x);
    const labelY = Number(y);
    const labelWidth = Number(width);
    const labelHeight = Number(height);
    if (![labelX, labelY, labelWidth, labelHeight].every(Number.isFinite)) return <g />;
    const leftEdge = Math.min(labelX, labelX + labelWidth);
    const rowIndex = Number(index);
    const labelColor = Number.isInteger(rowIndex) ? categoryChartData[rowIndex]?.color ?? "#56655f" : "#56655f";
    return (
      <text
        x={leftEdge - 10}
        y={labelY + labelHeight / 2}
        className="bar-value-label"
        fill={labelColor}
        textAnchor="end"
        dominantBaseline="middle"
      >
        {barMoney(value)}
      </text>
    );
  };
  const trendData = useMemo(
    () => trend.map((item) => ({
      ...item,
      expense: -item.allocatedExpense,
      balance: item.income - item.allocatedExpense,
    })),
    [trend],
  );
  const signedAxisMoney = (value: unknown) => {
    const numeric = Number(value);
    const sign = numeric < 0 ? "-" : "";
    return `${sign}${displayCurrency === "CNY" ? "¥" : "€"}${Math.round(Math.abs(numeric))}`;
  };
  const trendTooltip = (value: unknown, name: unknown) => {
    const numeric = Number(value);
    const label = String(name);
    if (label.includes("支出")) return [expenseMoney(Math.abs(numeric)), label] as [string, string];
    return [signedMoney(numeric), label] as [string, string];
  };

  return (
    <div className="page dashboard-page">
      <header className="page-header split-header">
        <div>
          <div className="dashboard-title-row">
            <p className="eyebrow">分析</p>
            <button
              type="button"
              className="definition-button"
              aria-label="查看分析口径说明"
              onClick={() => setShowDefinitions(true)}
            >
              i
            </button>
          </div>
          <h1>{formatMonth(month)}</h1>
          <p>{scopeDescription}{currencyDescription}</p>
        </div>
        <div className="dashboard-filters">
          <MonthSelectField label="分析月份" value={month} onChange={onMonthChange} />
          <fieldset className="segmented-field currency-view">
            <legend>统计范围</legend>
            <div className="segmented-control">
              {([['all_cash', '全部流水'], ['household', '家庭日常']] as const).map(([value, label]) => (
                <button key={value} type="button" className={analysisScope === value ? "active" : ""} onClick={() => setAnalysisScope(value)}>{label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="segmented-field currency-view">
            <legend>统计口径</legend>
            <div className="segmented-control three-options">
              {([['EUR', 'EUR'], ['CNY', 'CNY'], ['EUR_CONVERTED', '折算 EUR']] as const).map(([value, label]) => (
                <button key={value} type="button" className={analysisCurrency === value ? "active" : ""} onClick={() => setAnalysisCurrency(value)}>{label}</button>
              ))}
            </div>
          </fieldset>
        </div>
      </header>

      {showDefinitions && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowDefinitions(false)}>
          <section
            className="surface definition-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-definitions-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title">
              <div>
                <p className="eyebrow">统计定义</p>
                <h2 id="analysis-definitions-title">这些数字怎么算</h2>
              </div>
              <button type="button" className="text-button" onClick={() => setShowDefinitions(false)}>关闭</button>
            </div>
            <dl className="definition-list">
              <div>
                <dt>EUR / CNY</dt>
                <dd>只统计原始币种就是 EUR 或 CNY 的记录，不做汇率折算。</dd>
              </div>
              <div>
                <dt>折算 EUR</dt>
                <dd>把 CNY 记录按设置里的统一报表汇率折成 EUR，再和 EUR 记录合并查看。</dd>
              </div>
              <div>
                <dt>月支出（实际）</dt>
                <dd>这个月真实发生的现金支出，按付款日期统计；年费、季度费会全部落在实际付款月。</dd>
              </div>
              <div>
                <dt>月支出（含均摊）</dt>
                <dd>用于预算观察的月成本：普通支出按当月计入，年费/季度费按均摊规则分到每个月。</dd>
              </div>
              <div>
                <dt>月结余</dt>
                <dd>月收入 - 月支出（含均摊）。它不是纯现金流水结余。</dd>
              </div>
              <div>
                <dt>全部流水 / 家庭日常</dt>
                <dd>全部流水包含代购、理财等现金流；家庭日常会排除代购、理财、转账、贷款、换汇。</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {analysisCurrency === "EUR_CONVERTED" && cnyReportRate && (
        <div className="info-banner">
          折算 EUR 使用统一报表汇率：1 EUR = {cnyReportRate.unitsPerEur.toFixed(4)} CNY（{cnyReportRate.effectiveDate}）。
        </div>
      )}

      {analysisCurrency === "EUR_CONVERTED" && metrics.pendingConversion > 0 && (
        <div className="warning-banner">缺少 CNY 折算汇率，{metrics.pendingConversion} 笔人民币流水暂未计入折算 EUR；原币统计不受影响。</div>
      )}

      <section className="kpi-grid">
        <article className="kpi-card income-card"><span>{monthlyIncomeLabel}</span><strong className="metric-positive">{signedMoney(metrics.income)}</strong></article>
        <article className="kpi-card book-expense-card"><span>{monthlyExpenseLabel}</span><strong className="metric-negative">{expenseMoney(monthlyCost)}</strong></article>
        <article className="kpi-card balance-card"><span>{monthlyBalanceLabel}</span><strong className={signedClass(monthlyBalance)}>{signedMoney(monthlyBalance)}</strong></article>
        <article className="kpi-card cash-payment-card"><span>{monthlyCashExpenseLabel}</span><strong className="metric-negative">{expenseMoney(metrics.expense)}</strong></article>
      </section>

      <section className="surface year-summary-card">
        <span>{yearlyBalanceLabel}</span>
        <strong className={signedClass(yearBalance)}>{signedMoney(yearBalance)}</strong>
        <small>{scopeLabel} · {currencyLabel}</small>
      </section>

      <div className="chart-grid">
        <section className="surface chart-card">
          <div className="section-title"><div><p className="eyebrow">支出去向</p><h2>分类支出金额</h2></div></div>
          {categoryData.length === 0 ? (
            <div className="empty-chart">本月有支出后，这里会显示分类占比。</div>
          ) : (
            <ResponsiveContainer width="100%" height={categoryChartHeight}>
              <BarChart data={categoryChartData} layout="vertical" margin={categoryChartMargin}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8e3d8" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickFormatter={signedAxisMoney}
                  domain={[-categoryAxisMax, 0]}
                  tick={chartTickStyle}
                />
                <ReferenceLine x={0} stroke="#9a9387" strokeWidth={1.2} />
                <YAxis
                  dataKey="name"
                  type="category"
                  orientation="right"
                  width={categoryAxisWidth}
                  tickMargin={8}
                  interval={0}
                  tick={chartTickStyle}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => [expenseMoney(Math.abs(Number(value))), "支出"]} />
                <Bar dataKey="expenseValue" radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="expenseValue" content={renderCategoryBarLabel} />
                  {categoryChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="surface chart-card">
          <div className="section-title"><div><p className="eyebrow">全年走势</p><h2>每月收支结余</h2></div></div>
          <ResponsiveContainer width="100%" height={330}>
            <LineChart data={trendData} margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d8" />
              <XAxis dataKey="month" interval={0} tick={chartTickStyle} />
              <YAxis tickFormatter={signedAxisMoney} width={68} allowDecimals={false} tick={chartTickStyle} />
              <Tooltip formatter={trendTooltip} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="plainline"
                wrapperStyle={{ fontFamily: "inherit", fontSize: `${categoryTickFontSize}px`, paddingBottom: 8 }}
              />
              <ReferenceLine y={0} stroke="#9a9387" strokeWidth={1.2} />
              <Line type="monotone" dataKey="income" name={`${analysisNoun}月收入`} stroke="#297a64" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="expense" name={`${analysisNoun}月支出（含均摊）`} stroke="#c7664c" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="balance" name={`${analysisNoun}月结余`} stroke="#4f7896" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}
