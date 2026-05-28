import { useMemo } from 'react';
import { Expense, Allowance, BudgetStats } from '../types';
import { TrendingUp, AlertCircle, Sparkles, Activity, CheckCircle, Flame, DollarSign, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface SpendingChartsProps {
  expenses: Expense[];
  allowance: Allowance | null;
}

export default function SpendingCharts({ expenses, allowance }: SpendingChartsProps) {
  const allowanceAmount = allowance?.amount || 0;

  // Calculate stats
  const stats: BudgetStats = useMemo(() => {
    const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const remaining = allowanceAmount - totalSpent;

    // Daily totals
    const daily: { [date: string]: number } = {};
    expenses.forEach((e) => {
      daily[e.date] = (daily[e.date] || 0) + (Number(e.amount) || 0);
    });

    // Category totals
    const categories: { [category: string]: number } = {};
    expenses.forEach((e) => {
      categories[e.category] = (categories[e.category] || 0) + (Number(e.amount) || 0);
    });

    let highestCat = 'None';
    let highestAmt = 0;
    Object.entries(categories).forEach(([cat, amt]) => {
      if (amt > highestAmt) {
        highestAmt = amt;
        highestCat = cat;
      }
    });

    // Weekly totals - group days into chunks of 7 days
    const activeMonth = allowance?.month || '2026-05';
    const weeklySpent: { weekNum: number; dates: string[]; total: number }[] = [
      { weekNum: 1, dates: [`${activeMonth}-01`, `${activeMonth}-07`], total: 0 },
      { weekNum: 2, dates: [`${activeMonth}-08`, `${activeMonth}-14`], total: 0 },
      { weekNum: 3, dates: [`${activeMonth}-15`, `${activeMonth}-21`], total: 0 },
      { weekNum: 4, dates: [`${activeMonth}-22`, `${activeMonth}-31`], total: 0 },
    ];

    expenses.forEach((e) => {
      const expDate = e.date;
      if (expDate >= `${activeMonth}-01` && expDate <= `${activeMonth}-07`) {
        weeklySpent[0].total += Number(e.amount);
      } else if (expDate >= `${activeMonth}-08` && expDate <= `${activeMonth}-14`) {
        weeklySpent[1].total += Number(e.amount);
      } else if (expDate >= `${activeMonth}-15` && expDate <= `${activeMonth}-21`) {
        weeklySpent[2].total += Number(e.amount);
      } else if (expDate >= `${activeMonth}-22` && expDate <= `${activeMonth}-31`) {
        weeklySpent[3].total += Number(e.amount);
      }
    });

    const percentage = allowanceAmount > 0 ? (totalSpent / allowanceAmount) * 100 : 0;

    return {
      totalBudgetForMonth: allowanceAmount,
      totalSpentThisMonth: totalSpent,
      remainingBudget: remaining,
      dailySpent: daily,
      weeklySpent,
      categoryTotals: categories,
      highestCategory: highestCat,
      highestCategoryAmount: highestAmt,
      percentageSpent: percentage,
    };
  }, [expenses, allowanceAmount, allowance]);

  // Rolling 14-days total for context relative to active selected month endpoint
  const rollingTwoWeeksTotal = useMemo(() => {
    const activeMonth = allowance?.month || '2026-05';
    const startRange = `${activeMonth}-01`;
    const endRange = `${activeMonth}-31`;

    return expenses.reduce((sum, e) => {
      if (e.date >= startRange && e.date <= endRange) {
        return sum + (Number(e.amount) || 0);
      }
      return sum;
    }, 0);
  }, [expenses, allowance]);

  const maxCategoryCap = useMemo(() => {
    const values = Object.values(stats.categoryTotals);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [stats]);

  const maxWeeklyCap = useMemo(() => {
    const values = stats.weeklySpent.map((w) => w.total);
    return Math.max(...values, 1);
  }, [stats]);

  // Generate dynamic, complete day-by-day continuous data array for Recharts Line Chart
  const lineChartData = useMemo(() => {
    const monthKey = allowance?.month || '2026-05';
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr) || 2026;
    const month = parseInt(monthStr) || 5;

    // Get exact days count of active Month
    const daysInMonth = new Date(year, month, 0).getDate();
    const dataList = [];
    let cumulativeSum = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const paddedDay = day.toString().padStart(2, '0');
      const fullDateStr = `${monthKey}-${paddedDay}`;

      // Sum all costs logged precisely for this date
      const daysExpensesSum = expenses
        .filter((e) => e.date === fullDateStr)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      cumulativeSum += daysExpensesSum;

      // Project into array
      dataList.push({
        dayLabel: `${monthStr}/${paddedDay}`,
        textDate: fullDateStr,
        'Daily Spent': daysExpensesSum,
        'Cumulative Spend': cumulativeSum,
      });
    }

    return dataList;
  }, [expenses, allowance]);

  // Calculate Average Burn Rate parameters
  const chartAverageBurnRate = useMemo(() => {
    if (lineChartData.length === 0) return 0;
    const totalDaysCount = lineChartData.length;
    return Math.round(stats.totalSpentThisMonth / totalDaysCount);
  }, [lineChartData, stats.totalSpentThisMonth]);

  // Tooltip custom builder component
  const PremiumTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-white shadow-xl select-none">
          <p className="text-[10px] font-mono font-bold text-slate-405 uppercase tracking-wider mb-2">
            📅 Ledger Date: {dataPoint.textDate}
          </p>
          <div className="space-y-1.5 font-sans">
            <p className="text-xs">
              🔥 Daily Burn Rate: <span className="font-mono font-black text-amber-500">{Number(dataPoint['Daily Spent']).toLocaleString()} Birr</span>
            </p>
            <p className="text-xs">
              💼 Cumulative Spent: <span className="font-mono font-black text-cyan-400">{Number(dataPoint['Cumulative Spend']).toLocaleString()} Birr</span>
            </p>
            {allowanceAmount > 0 && (
              <p className="text-[10px] text-slate-400 border-t border-slate-850 pt-1 mt-1">
                Pacing: {((dataPoint['Cumulative Spend'] / allowanceAmount) * 100).toFixed(0)}% of month cap
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">

      {/* RECHARTS HIGH-PERFORMANCE VISUALIZATION CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between" id="burn-rate-rechart-card">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-750">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 font-sans tracking-tight">
                  Daily Burn Rate & Spend Velocity
                </h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                  Month-wide cumulative trend and trajectory analysis
                </p>
              </div>
            </div>

            {/* Quick Average Widget */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 self-start sm:self-auto select-none">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider leading-none">
                  Average / Day
                </span>
                <span className="text-[13px] font-mono font-black text-indigo-950">
                  {chartAverageBurnRate.toLocaleString()} Birr
                </span>
              </div>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
          </div>

          {/* Actual Recharts Element */}
          <div className="w-full h-[220px]">
            {lineChartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
                No active days registered.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={lineChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="dayLabel" 
                    tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val.toLocaleString()} Br`}
                  />
                  <Tooltip content={<PremiumTooltip />} />
                  
                  {/* Visual warning limit ceiling line representing target allowance */}
                  {allowanceAmount > 0 && (
                    <ReferenceLine 
                      y={allowanceAmount} 
                      stroke="#EF4444" 
                      strokeDasharray="4 4" 
                      label={{ 
                        value: 'Budget Cap Alert', 
                        fill: '#EF4444', 
                        fontSize: 9, 
                        fontWeight: 'bold', 
                        position: 'top',
                        fontFamily: 'JetBrains Mono'
                      }} 
                    />
                  )}

                  {/* Gradient area showing running totals */}
                  <Area 
                    type="monotone" 
                    dataKey="Cumulative Spend" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorSpend)" 
                  />

                  {/* Flame dots showing individual daily spikes */}
                  <Area 
                    type="natural"
                    dataKey="Daily Spent" 
                    stroke="#f59e0b" 
                    strokeWidth={1}
                    fillOpacity={0.2}
                    fill="#f59e0b"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Legend block bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-[10px] select-none text-slate-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block" />
              <span>Cumulative Spending Velocity</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
              <span>Individual Daily Spikes (Birr/Day)</span>
            </span>
          </div>

          <span className="text-slate-400 font-mono font-medium">
            Active Period: {allowance?.month || 'No period active'}
          </span>
        </div>
      </div>

      {/* ORIGINAL INDIVIDUAL SPEEDOMETER GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        
        {/* CARD 1: BUDGET FLOW SPEEDOMETER */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Allowance Utilization
              </h3>
              <span className="p-1 px-2 text-[9px] font-mono rounded bg-slate-50 text-slate-500 font-bold border border-slate-100 uppercase">
                {allowance?.month || 'N/A'}
              </span>
            </div>

            <div className="text-center py-4">
              <span className="text-3xl font-display font-black text-slate-800 tracking-tight">
                {stats.percentageSpent.toFixed(0)}%
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider leading-none">
                Birr Consumed
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3 p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.percentageSpent > 85
                    ? 'bg-rose-500 shadow-3xs'
                    : stats.percentageSpent > 60
                    ? 'bg-amber-500 shadow-3xs'
                    : 'bg-blue-600 shadow-3xs'
                }`}
                style={{ width: `${Math.min(stats.percentageSpent, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono mt-3.5 leading-tight">
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[9px]">Spent:</span>
                <span className="font-bold text-slate-800">{stats.totalSpentThisMonth.toLocaleString()} Br</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-bold block uppercase text-[9px]">Remaining:</span>
                <span className={`font-bold ${stats.remainingBudget < 2000 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {stats.remainingBudget.toLocaleString()} Br
                </span>
              </div>
            </div>
          </div>

          {/* Warning Badge */}
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            {allowanceAmount === 0 ? (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-150 text-slate-650 text-[11px]">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Budget Set Pending</p>
                  <p className="text-slate-500 mt-0.5 leading-snug">Ask Abebe (Father) to configure the starting cycle budget envelope.</p>
                </div>
              </div>
            ) : stats.percentageSpent > 85 ? (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 text-[11px]">
                <AlertCircle className="w-4 h-4 text-rose-650 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Budget Runout Warning!</p>
                  <p className="text-rose-600 mt-0.5 leading-snug">Costs are pacing extremely fast. Only {stats.remainingBudget.toLocaleString()} Br remains.</p>
                </div>
              </div>
            ) : stats.percentageSpent > 60 ? (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-[11px]">
                <AlertCircle className="w-4 h-4 text-amber-655 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pacing Watchlist</p>
                  <p className="text-amber-600 mt-0.5 leading-snug">Loaded family index. Hold off optional cost additions.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-[11px]">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Healthy Budget Status</p>
                  <p className="text-blue-600 mt-0.5 leading-snug">Receipt allocations correspond safely within optimal bounds.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: CATEGORY SPLIT DIAGRAM */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Spending by Category
            </h3>

            <div className="space-y-2.5">
              {Object.keys(stats.categoryTotals).length === 0 ? (
                <div className="text-center py-10 text-slate-450 text-xs italic">
                  No categorical costs logged for this month.
                </div>
              ) : (
                Object.entries(stats.categoryTotals).map(([cat, amount]) => {
                  const widthRatio = (amount / maxCategoryCap) * 100;
                  const globalRatio = stats.totalSpentThisMonth > 0 ? (amount / stats.totalSpentThisMonth) * 100 : 0;

                  return (
                    <div key={cat} className="space-y-0.5">
                      <div className="flex justify-between items-center text-[11px] leading-none">
                        <span className="font-bold text-slate-700 capitalize">
                          {cat}
                        </span>
                        <span className="font-mono text-slate-400 font-semibold">
                          <span className="text-slate-800 font-bold">{amount.toLocaleString()} Br</span> ({globalRatio.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            cat === 'groceries'
                              ? 'bg-blue-600'
                              : cat === 'utility'
                              ? 'bg-red-500'
                              : cat === 'transport'
                              ? 'bg-emerald-500'
                              : cat === 'emergency'
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${widthRatio}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {stats.highestCategory !== 'None' && stats.highestCategoryAmount > 0 && (
            <div className="mt-4 p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-xs flex justify-between items-center text-blue-900 leading-none">
              <span className="flex items-center gap-1 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                Main cluster:
              </span>
              <span className="font-black capitalize">{stats.highestCategory}</span>
            </div>
          )}
        </div>

        {/* CARD 3: WEEKLY SPENDING SPEED */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Weekly Spends Tracker
            </h3>

            <div className="space-y-3">
              {stats.weeklySpent.map((w) => {
                const rectHeightPercent = maxWeeklyCap > 1 ? (w.total / maxWeeklyCap) * 100 : 0;

                return (
                  <div key={w.weekNum} className="flex items-center gap-2">
                    <span className="w-10 text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Wk {w.weekNum}
                    </span>
                    <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                      <div
                        className="h-full bg-blue-500/80 rounded-full"
                        style={{ width: `${Math.max(rectHeightPercent, w.total > 0 ? 5 : 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-[11px] font-mono font-black text-slate-700 w-16 text-right">
                      {Math.round(w.total).toLocaleString()} Br
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center py-1.5 px-2.5 rounded bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-sans text-slate-600 font-bold uppercase">Monthly Spent:</span>
              </div>
              <span className="font-mono text-xs font-black text-blue-700">
                {rollingTwoWeeksTotal.toLocaleString()} Br
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
