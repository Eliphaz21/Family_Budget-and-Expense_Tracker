import React, { useState, useMemo, useRef } from 'react';
import { Expense, Funding, Comment, FamilyUser } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Coins, 
  Image as ImageIcon, 
  MessageSquare, 
  HelpCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Upload, 
  Sparkles, 
  Eye, 
  Check, 
  AlertCircle,
  User
} from 'lucide-react';

interface CalendarViewProps {
  expenses: Expense[];
  fundings: Funding[];
  comments: Comment[];
  selectedDateString: string;
  onSelectDate: (dateStr: string) => void;
  currentUser: FamilyUser | null;
  onAddExpense: (desc: string, amount: number, category: string, date: string, customCreatedByName?: string, productName?: string) => void;
  onAddFunding: (amount: number, source: string, notes: string, screenshot: string | undefined, date: string) => void;
  onAddComment: (text: string, type: 'comment' | 'request' | 'contribution', date: string) => void;
  canManage: boolean; // Sister can manage expenses
}

export default function CalendarView({
  expenses,
  fundings,
  comments,
  selectedDateString,
  onSelectDate,
  currentUser,
  onAddExpense,
  onAddFunding,
  onAddComment,
  canManage
}: CalendarViewProps) {
  // Navigation State for Year and Month in Calendar Heatmap
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // May (0-indexed)

  // Hub Active Sub-Tab (Costs vs Add Money vs Comments)
  const [activeSubTab, setActiveSubTab] = useState<'costs' | 'add-money' | 'day-talk'>('costs');

  // Local Form state for quick add-expense inside the calendar day focus
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCat, setNewExpCat] = useState('groceries');
  const [newExpProductName, setNewExpProductName] = useState('');

  // Local Form state for quick add-funding inside the calendar day focus
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingSource, setFundingSource] = useState('');
  const [fundingNotes, setFundingNotes] = useState('');
  const [fundingScreenshot, setFundingScreenshot] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Form state for quick day comment inside the day focus
  const [dayCommentText, setDayCommentText] = useState('');
  const [dayCommentType, setDayCommentType] = useState<'comment' | 'request'>('comment');

  // Preview Image Modal state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // View mode toggle: calendar matrix or weekly report
  const [viewMode, setViewMode] = useState<'calendar' | 'weeks'>('calendar');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Group expenses and inflows by date for high-volume mapping
  const dailyMetrics = useMemo(() => {
    const map: { [date: string]: { spent: number; received: number; expCount: number; fundCount: number } } = {};
    
    expenses.forEach((e) => {
      const d = e.date;
      if (!map[d]) map[d] = { spent: 0, received: 0, expCount: 0, fundCount: 0 };
      map[d].spent += Number(e.amount) || 0;
      map[d].expCount += 1;
    });

    fundings.forEach((f) => {
      const d = f.date;
      if (!map[d]) map[d] = { spent: 0, received: 0, expCount: 0, fundCount: 0 };
      map[d].received += Number(f.amount) || 0;
      map[d].fundCount += 1;
    });

    return map;
  }, [expenses, fundings]);

  // Generate calendar days grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startOffset = firstDay.getDay();

    const days: { dayNumber: number | null; dateString: string | null }[] = [];

    // Pads prefix offset days
    for (let i = 0; i < startOffset; i++) {
      days.push({ dayNumber: null, dateString: null });
    }

    // Days in current selection
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateString = `${currentYear}-${monthStr}-${dayStr}`;
      days.push({ dayNumber: day, dateString });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Specific Day focus properties
  const selectedDayExpenses = useMemo(() => {
    return expenses.filter((e) => e.date === selectedDateString);
  }, [expenses, selectedDateString]);

  const selectedDayFundings = useMemo(() => {
    return fundings.filter((f) => f.date === selectedDateString);
  }, [fundings, selectedDateString]);

  const selectedDayComments = useMemo(() => {
    return comments.filter((c) => c.date === selectedDateString);
  }, [comments, selectedDateString]);

  // Handles adding an expense under Alem authorization
  const handleLocalAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const amount = Number(newExpAmount);
    if (!newExpDesc.trim() || isNaN(amount) || amount <= 0) return;

    onAddExpense(newExpDesc.trim(), amount, newExpCat, selectedDateString, undefined, newExpProductName.trim() || undefined);
    setNewExpDesc('');
    setNewExpProductName('');
    setNewExpAmount('');
  };

  // Handles adding funding contributions (open access for Father & Brother as requested!)
  const handleLocalAddFunding = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(fundingAmount);
    if (isNaN(amount) || amount <= 0) return;

    const sourceLabel = fundingSource.trim() || currentUser?.displayName || 'Family member';
    onAddFunding(amount, sourceLabel, fundingNotes.trim(), fundingScreenshot, selectedDateString);
    
    // Reset state
    setFundingAmount('');
    setFundingSource('');
    setFundingNotes('');
    setFundingScreenshot(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveSubTab('costs'); // Switch back to view costs & inflows
  };

  // Handles comments mapped specifically onto selectedDate
  const handleLocalAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayCommentText.trim() || !currentUser) return;

    onAddComment(dayCommentText.trim(), dayCommentType, selectedDateString);
    setDayCommentText('');
  };

  // Image upload handles converting PNG/JPG screenshot to base64
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFundingScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Pre-load default template receipt as proof attachment if skipped
  const triggerMockScreenshot = () => {
    // Elegant base64 CBE representation or illustrative money asset
    const beautifulMockReceiptUrl = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=400&auto=format&fit=crop";
    setFundingScreenshot(beautifulMockReceiptUrl);
  };

  // --- STATS GRAPHS (Daily & Weekly pacing inside calendar view) ---
  const currentMonthString = useMemo(() => {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    return `${currentYear}-${mStr}`;
  }, [currentYear, currentMonth]);

  // 1. Weekly grouping: Week 1 to 4 comparison
  const weeklyAnalytics = useMemo(() => {
    const weeksList = [
      { label: 'Wk 1 (01-07)', start: 1, end: 7, spent: 0, received: 0 },
      { label: 'Wk 2 (08-14)', start: 8, end: 14, spent: 0, received: 0 },
      { label: 'Wk 3 (15-21)', start: 15, end: 21, spent: 0, received: 0 },
      { label: 'Wk 4 (22-31)', start: 22, end: 31, spent: 0, received: 0 },
    ];

    expenses.forEach((e) => {
      if (e.date.startsWith(currentMonthString)) {
        const d = Number(e.date.split('-')[2]);
        weeksList.forEach((wk) => {
          if (d >= wk.start && d <= wk.end) {
            wk.spent += e.amount;
          }
        });
      }
    });

    fundings.forEach((f) => {
      if (f.date.startsWith(currentMonthString)) {
        const d = Number(f.date.split('-')[2]);
        weeksList.forEach((wk) => {
          if (d >= wk.start && d <= wk.end) {
            wk.received += f.amount;
          }
        });
      }
    });

    return weeksList;
  }, [expenses, fundings, currentMonthString]);

  // Find max weekly amount to scale comparative graph bars
  const maxWeeklyScope = useMemo(() => {
    let max = 1;
    weeklyAnalytics.forEach((wk) => {
      if (wk.spent > max) max = wk.spent;
      if (wk.received > max) max = wk.received;
    });
    return max;
  }, [weeklyAnalytics]);

  // 2. High density daily metrics calculation
  const dailyCostList = useMemo(() => {
    const list: { day: number; spent: number; received: number }[] = [];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const completeDate = `${currentMonthString}-${dayStr}`;
      const m = dailyMetrics[completeDate];
      list.push({
        day: i,
        spent: m ? m.spent : 0,
        received: m ? m.received : 0
      });
    }
    return list;
  }, [currentYear, currentMonth, currentMonthString, dailyMetrics]);

  // Find max daily amount to scale the high resolution spark bars
  const maxDailyScope = useMemo(() => {
    const maxVal = Math.max(...dailyCostList.map((d) => Math.max(d.spent, d.received)), 1);
    return maxVal;
  }, [dailyCostList]);

  // Dynamic Weekly breakdown for comparison report
  const monthlyWeeks = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Months are split into ranges: Days 1-7, 8-14, 15-21, 22-28, 29-end
    const weeksList = [
      { id: 1, label: 'Week 1', start: 1, end: 7, range: '01 - 07' },
      { id: 2, label: 'Week 2', start: 8, end: 14, range: '08 - 14' },
      { id: 3, label: 'Week 3', start: 15, end: 21, range: '15 - 21' },
      { id: 4, label: 'Week 4', start: 22, end: 28, range: '22 - 28' },
      ...(daysInMonth > 28 ? [{ id: 5, label: 'Week 5', start: 29, end: daysInMonth, range: `29 - ${daysInMonth}` }] : [])
    ];

    return weeksList.map((wk) => {
      // Find all expenses in this week for this selected month
      const weeklyExps = expenses.filter((e) => {
        if (!e.date.startsWith(currentMonthString)) return false;
        const d = Number(e.date.split('-')[2]);
        return d >= wk.start && d <= wk.end;
      });

      // Total money spent
      const totalSpent = weeklyExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Highest cost item and Lowest cost item
      let highestCostItem: Expense | null = null;
      let lowestCostItem: Expense | null = null;
      if (weeklyExps.length > 0) {
        highestCostItem = weeklyExps.reduce((max, e) => (Number(e.amount) > Number(max.amount) ? e : max), weeklyExps[0]);
        lowestCostItem = weeklyExps.reduce((min, e) => (Number(e.amount) < Number(min.amount) ? e : min), weeklyExps[0]);
      }

      // Top Spender of that week
      const spendersMap: { [name: string]: { count: number; spend: number } } = {};
      weeklyExps.forEach((exp) => {
        const name = exp.createdByName || 'Alem (Sister)';
        if (!spendersMap[name]) spendersMap[name] = { count: 0, spend: 0 };
        spendersMap[name].count += 1;
        spendersMap[name].spend += exp.amount;
      });
      let topSpender = '';
      let topSpenderSpend = 0;
      Object.entries(spendersMap).forEach(([name, val]) => {
        if (val.spend > topSpenderSpend) {
          topSpender = name;
          topSpenderSpend = val.spend;
        }
      });

      // Daily totals inside this week
      const dailyTotalsList: { dayNumber: number; dateString: string; total: number }[] = [];
      for (let day = wk.start; day <= wk.end; day++) {
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dString = `${currentYear}-${monthStr}-${dayStr}`;
        const dayExps = weeklyExps.filter(e => e.date === dString);
        const dayTotal = dayExps.reduce((sum, e) => sum + e.amount, 0);
        dailyTotalsList.push({
          dayNumber: day,
          dateString: dString,
          total: dayTotal
        });
      }

      return {
        ...wk,
        expensesList: weeklyExps,
        totalSpent,
        highestCostItem,
        lowestCostItem,
        topSpender: topSpender || 'No Spends',
        topSpenderSpend,
        dailyTotalsList
      };
    });
  }, [expenses, currentYear, currentMonth, currentMonthString]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fade-in w-full min-h-0">
      
      {/* 3/4 COLUMN LEFT SIDE: FULL HEATMAP CALENDAR + ANALYTICS GRAPHS */}
      <div className="xl:col-span-3 space-y-6 flex flex-col min-h-0">
        
        {/* TOP COMPONENT: CALENDAR HEADER AND HEATMAP BASE */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800 tracking-tight uppercase">
                  {monthNames[currentMonth]} {currentYear} Ledger Canvas
                </h2>
              </div>
              <p className="text-slate-400 text-xs mt-0.5 font-sans leading-none">
                Interactive Heatmap of Household Spending and Top-off Streams
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end">
              {/* VIEW SWITCHER DESIGNED AS REQUESTED */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-205 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded transition-all cursor-pointer ${
                    viewMode === 'calendar'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📅 Heatmap
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('weeks')}
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded transition-all cursor-pointer ${
                    viewMode === 'weeks'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Weekly Cost Totals and Analytics updates"
                >
                  📊 Weekly Report
                </button>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-605 transition-all cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentYear(2026);
                    setCurrentMonth(4); // Reset back to May 2026
                  }}
                  className="px-2 py-1 text-[10px] font-mono font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
                >
                  May 2026
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-605 transition-all cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <>
              {/* WEEKDAYS HEADER */}
              <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 select-none">
                <div>Sunday</div>
                <div>Monday</div>
                <div>Tuesday</div>
                <div>Wednesday</div>
                <div>Thursday</div>
                <div>Friday</div>
                <div>Saturday</div>
              </div>

              {/* CALENDAR MATRIX GRID */}
              <div className="grid grid-cols-7 gap-2.5">
                {calendarDays.map((day, idx) => {
                  if (!day.dayNumber || !day.dateString) {
                    return (
                      <div 
                        key={`empty-${idx}`} 
                        className="aspect-square bg-slate-50/20 border border-dashed border-slate-100 rounded-lg"
                      ></div>
                    );
                  }

                  const dayMetrics = dailyMetrics[day.dateString];
                  const isSelected = selectedDateString === day.dateString;
                  const hasSpending = dayMetrics && dayMetrics.spent > 0;
                  const hasInflow = dayMetrics && dayMetrics.received > 0;

                  // Compute advanced heatmap scale based on cost volumes
                  let cellBackground = 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-800';
                  if (hasSpending) {
                    if (dayMetrics.spent > 3000) {
                      cellBackground = 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-950 font-bold';
                    } else if (dayMetrics.spent > 1000) {
                      cellBackground = 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950 font-semibold';
                    } else {
                      cellBackground = 'bg-sky-50/70 hover:bg-sky-100 border-sky-150 text-sky-955 font-medium';
                    }
                  }

                  return (
                    <button
                      key={day.dateString}
                      onClick={() => onSelectDate(day.dateString!)}
                      className={`aspect-square relative flex flex-col justify-between p-2 rounded-xl border text-left cursor-pointer transition-all ${cellBackground} ${
                        isSelected ? 'ring-3 ring-blue-500 border-blue-500 shadow-sm scale-[1.02] z-10' : 'hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[11px] font-semibold font-mono">{day.dayNumber}</span>
                        {hasInflow && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Top-off amount added" />
                        )}
                      </div>

                      <div className="mt-auto text-right w-full min-w-0">
                        {/* Logged Spending */}
                        {hasSpending && (
                          <div className="leading-none text-[10px] font-mono font-black text-rose-600 block truncate">
                            -{Math.round(dayMetrics.spent).toLocaleString()} <span className="text-[8px] font-sans">Br</span>
                          </div>
                        )}
                        {/* Logged Top-off */}
                        {hasInflow && (
                          <div className="leading-none mt-0.5 text-[9px] font-mono font-bold text-emerald-600 block truncate">
                            +{Math.round(dayMetrics.received).toLocaleString()} <span className="text-[7px] font-sans">Br</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-fade-in text-slate-805">
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 font-medium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span>📋 Selected Month: <strong>{monthNames[currentMonth]} {currentYear}</strong> split into 4-5 weekly comparison reports.</span>
                <span className="font-mono text-[9px] font-black text-blue-600 bg-white border border-blue-105 p-0.5 px-2 rounded uppercase shadow-3xs shrink-0">
                  Total-Money Spent Analyzed
                </span>
              </div>

              <div className="space-y-6">
                {monthlyWeeks.map((wk) => {
                  return (
                    <div key={wk.id} className="bg-slate-50/45 border border-slate-200 rounded-2xl p-5 hover:bg-slate-50/60 shadow-3xs transition-all space-y-4">
                      {/* Week Title and aggregate money spent */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 pb-3">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-605"></span>
                            {wk.label} • Days ({wk.range})
                          </h4>
                          <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                            Total registered transactions: {wk.expensesList.length}
                          </span>
                        </div>
                        <div className="text-right leading-none">
                          <span className="text-sm font-black font-mono text-slate-500 uppercase tracking-wide block text-[9px] mb-1">
                            Total Spent Birr
                          </span>
                          <span className="text-xl font-black text-rose-650 font-mono">
                            {wk.totalSpent.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-slate-450">Br</span>
                          </span>
                        </div>
                      </div>

                      {/* Analytics Widgets Grid (Highest cost, Lowest cost, Top spender) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 select-none">
                        {/* Highest Cost Card */}
                        <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-1 shadow-3xs">
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block font-mono">
                            🚨 Highest Cost Item
                          </span>
                          {wk.highestCostItem ? (
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 text-xs truncate block capitalize">
                                {wk.highestCostItem.productName || wk.highestCostItem.description}
                              </span>
                              <span className="text-[10px] font-mono font-black text-rose-600 block mt-1">
                                {wk.highestCostItem.amount.toLocaleString()} Br
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 italic block">No spends logged</span>
                          )}
                        </div>

                        {/* Lowest Cost Card */}
                        <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-1 shadow-3xs">
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block font-mono">
                            💎 Lowest Cost Item
                          </span>
                          {wk.lowestCostItem ? (
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 text-xs truncate block capitalize">
                                {wk.lowestCostItem.productName || wk.lowestCostItem.description}
                              </span>
                              <span className="text-[10px] font-mono font-black text-blue-600 block mt-1">
                                {wk.lowestCostItem.amount.toLocaleString()} Br
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 italic block">No spends logged</span>
                          )}
                        </div>

                        {/* Top Spender/Buyer */}
                        <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-1 shadow-3xs">
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block font-mono">
                            👑 Top spender this week
                          </span>
                          {wk.totalSpent > 0 ? (
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 text-xs truncate block capitalize">
                                {wk.topSpender.split(' ')[0]}
                              </span>
                              <span className="text-[9px] font-mono text-slate-550 block mt-1">
                                Spent: <strong className="text-slate-800 font-mono font-extrabold">{wk.topSpenderSpend.toLocaleString()} Br</strong>
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 italic block">No spenders</span>
                          )}
                        </div>
                      </div>

                      {/* Daily Totals micro summaries inside this week */}
                      <div className="space-y-2">
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 font-mono block select-none">
                          📊 Calendar Day-by-day Micro Sums (Click box to see fully detailed info)
                        </span>
                        <div className="grid grid-cols-7 gap-1.5">
                          {wk.dailyTotalsList.map((dt) => {
                            const dateObj = new Date(dt.dateString);
                            const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            return (
                              <button
                                key={dt.dayNumber}
                                type="button"
                                onClick={() => onSelectDate(dt.dateString)}
                                className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col justify-between min-h-[56px] hover:scale-[1.03] ${
                                  dt.total > 0 
                                    ? 'bg-rose-50/70 border-rose-200 text-rose-950 font-bold' 
                                    : 'bg-white border-slate-200 text-slate-405 hover:bg-slate-50'
                                }`}
                                title={`Click to load details for ${dt.dateString}`}
                              >
                                <span className="text-[9.5px] font-extrabold block leading-none">{dt.dayNumber} <span className="text-[8px] text-slate-400 font-normal">({weekday[0]})</span></span>
                                <span className={`text-[9px] font-mono font-black mt-1.5 block truncate leading-none ${dt.total > 0 ? 'text-rose-600': 'text-slate-400 font-semibold'}`}>
                                  {dt.total > 0 ? `${Math.round(dt.total).toLocaleString()} Br` : '0 Br'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Compact scrolling list of itemized spends on this week */}
                      <div className="space-y-2">
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 font-mono block select-none">
                          📝 Weekly Item cost ledger list ({wk.expensesList.length})
                        </span>

                        {wk.expensesList.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl bg-white text-[10px] text-slate-400 italic">
                            No purchases recorded inside this week range.
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-150 rounded-xl max-h-[140px] overflow-y-auto divide-y divide-slate-100 filter shadow-3xs">
                            {wk.expensesList.map((exp) => (
                              <div key={exp.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50 transition gap-3 text-[11px] leading-tight text-slate-700">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-800 capitalize truncate block">
                                      {exp.productName || exp.description}
                                    </span>
                                    <span className="text-[8px] font-mono font-black bg-blue-50 text-blue-650 rounded px-1.5 py-0.2 shrink-0 uppercase border border-blue-100">
                                      {exp.category}
                                    </span>
                                  </div>
                                  <p className="text-[9px] font-medium text-slate-405 truncate mt-1 font-mono">
                                    {exp.date} • Bought by: <span className="font-bold text-slate-600">{exp.createdByName || 'Sister'}</span> {exp.productName ? `• explanation: ${exp.description}` : ''}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 leading-none">
                                  <span className="font-mono font-black text-slate-750 text-xs">
                                    {exp.amount.toLocaleString()}
                                  </span>
                                  <span className="text-[8px] font-mono text-slate-400 block mt-1">Birr</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HEATMAP COLOR CODES METRIC GUIDES */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono uppercase font-bold justify-between">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-xs">Spend Heatmap Scale:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-sky-50 border border-sky-200"></span> Low (&lt;1K Br)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200"></span> Mid (&lt;3K Br)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-50 border border-rose-200"></span> Heavy (&gt;3K Br)
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span> Green indicator: Top-offs & Deposits
            </div>
          </div>
        </div>

        {/* BOTTOM COMPONENT: COMPARATIVE GRAPH DISPLAYS (DAILY & WEEKLY COST PACES) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <span>Financial Stream Analysis Logs</span>
              <span className="px-2 py-0.5 text-[9px] font-mono text-blue-600 rounded bg-blue-50 border border-blue-105 font-black uppercase">
                {monthNames[currentMonth]} 2026 Statistics
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Dynamic system-calculated cash outflows (rose bars) compared to inputs (emerald caps)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COMPARATIVE CHART 1: WEEKLY EXPENDITURES VS TOP-OFFS */}
            <div className="border border-slate-150 rounded-lg p-3 bg-slate-50/20">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Weekly Outflow vs Inflow comparative</span>
                <span className="text-[9px] text-slate-400 font-mono">May 2026 grouping</span>
              </h4>

              {/* Weekly Bars SVG emulation for native robust React 19 layout */}
              <div className="space-y-4">
                {weeklyAnalytics.map((wk, idx) => {
                  const spentWidth = (wk.spent / maxWeeklyScope) * 100;
                  const receivedWidth = (wk.received / maxWeeklyScope) * 100;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-slate-500">{wk.label}</span>
                        <span className="text-[10px] font-semibold">
                          <span className="text-rose-600 font-black">{Math.round(wk.spent).toLocaleString()}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-emerald-600 font-black">{Math.round(wk.received).toLocaleString()} Br</span>
                        </span>
                      </div>

                      {/* Side-by-side or stacked visual bars */}
                      <div className="space-y-1">
                        {/* Spent Bar */}
                        <div className="h-1.5 bg-slate-200/50 rounded-full w-full overflow-hidden flex items-center">
                          <div 
                            className="h-full bg-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(spentWidth, 1.5)}%` }}
                          />
                        </div>
                        {/* Inflow Bar */}
                        <div className="h-1.5 bg-slate-200/50 rounded-full w-full overflow-hidden flex items-center">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(receivedWidth, 1.5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COMPARATIVE CHART 2: DAILY VOLUMES (HIGH DENSITY SPARK-GRID) */}
            <div className="border border-slate-150 rounded-lg p-3 bg-slate-50/20 flex flex-col justify-between">
              <div>
                <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-4 flex justify-between">
                  <span>Daily Micro-ledger Spark Chart</span>
                  <span className="text-[9px] font-mono text-slate-400">Days 1 - {dailyCostList.length}</span>
                </h4>

                {/* Draw clean responsive spark charts */}
                <div className="h-24 flex items-end gap-[1.5%] w-full bg-white rounded border border-slate-200 px-2 py-1 relative">
                  {/* Grid Lines mockup */}
                  <div className="absolute inset-y-0 left-0 right-0 border-b border-slate-100 pointer-events-none" style={{ top: '25%' }}></div>
                  <div className="absolute inset-y-0 left-0 right-0 border-b border-slate-100 pointer-events-none" style={{ top: '50%' }}></div>
                  <div className="absolute inset-y-0 left-0 right-0 border-b border-slate-100 pointer-events-none" style={{ top: '75%' }}></div>

                  {dailyCostList.map((dayItem) => {
                    const spentRatio = (dayItem.spent / maxDailyScope) * 100;
                    const receivedRatio = (dayItem.received / maxDailyScope) * 100;

                    return (
                      <div 
                        key={dayItem.day} 
                        className="flex-1 h-full flex items-end relative"
                        title={`Day ${dayItem.day}: Spent ${dayItem.spent} Br, Received ${dayItem.received} Br`}
                      >
                        {/* Outflow column */}
                        <div 
                          className="w-1/2 bg-rose-450 hover:bg-rose-500 rounded-t-xs transition-all cursor-help"
                          style={{ height: `${Math.max(spentRatio, (dayItem.spent > 0 ? 4 : 0))}%` }}
                        />
                        {/* Inflow column */}
                        <div 
                          className="w-1/2 bg-emerald-400 hover:bg-emerald-500 rounded-t-xs transition-all cursor-help"
                          style={{ height: `${Math.max(receivedRatio, (dayItem.received > 0 ? 4 : 0))}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mt-2 font-bold uppercase select-none">
                <span>Day 1</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span> Spent</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Top-off</span>
                </span>
                <span>Day {dailyCostList.length}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 1/4 COLUMN RIGHT SIDE: CLICKED DATE DETAIL HUB CONTROL PANEL */}
      <div className="xl:col-span-1 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-full flex flex-col justify-between">
          
          <div>
            {/* Header Selected info */}
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between mb-3 text-slate-800">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-black">
                Interactive Date Hub
              </span>
              <span className="text-xs font-mono font-black py-0.5 px-2 bg-blue-50 text-blue-700 rounded border border-blue-100">
                {selectedDateString}
              </span>
            </div>

            {/* THREE HUB SUB-TABS (Expenses vs Add Money Inflows vs Group Chat) */}
            <div className="grid grid-cols-3 gap-1 mb-4 select-none">
              <button
                onClick={() => setActiveSubTab('costs')}
                className={`py-1.5 px-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                  activeSubTab === 'costs'
                    ? 'bg-slate-850 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
                }`}
              >
                Costs ({selectedDayExpenses.length})
              </button>
              <button
                onClick={() => setActiveSubTab('add-money')}
                className={`py-1.5 px-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                  activeSubTab === 'add-money'
                    ? 'bg-emerald-650 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
                }`}
              >
                Add Money ({selectedDayFundings.length})
              </button>
              <button
                onClick={() => setActiveSubTab('day-talk')}
                className={`py-1.5 px-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                  activeSubTab === 'day-talk'
                    ? 'bg-blue-650 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
                }`}
              >
                Day Chat ({selectedDayComments.length})
              </button>
            </div>

            {/* TAB CONTENT 1: REGISTERED COSTS LIST FOR CLICKED DAY */}
            {activeSubTab === 'costs' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h3 className="text-[10px] font-mono tracking-wider font-extrabold text-slate-500 uppercase mb-2">
                    Expenses this Day
                  </h3>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedDayExpenses.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50 italic text-[11px] text-slate-400">
                        No spending logged on this day.
                      </div>
                    ) : (
                      selectedDayExpenses.map((exp) => (
                        <div 
                          key={exp.id} 
                          className="p-2 border border-slate-150 rounded-lg bg-slate-50/50 flex justify-between items-center gap-2 hover:bg-slate-50 hover:shadow-2xs transition-all"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-805 text-xs truncate block capitalize leading-tight">
                              {exp.productName ? exp.productName : exp.description}
                            </span>
                            {exp.productName && (
                              <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5">
                                {exp.description}
                              </span>
                            )}
                            <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-100 inline-block mt-1">
                              {exp.category}
                            </span>
                          </div>
                          <div className="shrink-0 text-right leading-none">
                            <span className="font-mono text-xs font-black text-slate-800">
                              {exp.amount.toLocaleString()}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400 block mt-0.5">Birr</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SISTER EXCLUSIVE LOG FORM */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5 justify-between mb-2">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase">
                      Log New Cost
                    </span>
                    {!canManage && (
                      <span className="text-[8px] bg-rose-55 border border-rose-105 text-rose-700 font-extrabold tracking-wider p-0.5 px-1.5 rounded uppercase">
                        Sister Only
                      </span>
                    )}
                  </div>

                  {canManage ? (
                    <form onSubmit={handleLocalAddExpense} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          required
                          value={newExpAmount}
                          onChange={(e) => setNewExpAmount(e.target.value)}
                          placeholder="Amount in Birr"
                          className="bg-white text-slate-850 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                        />
                        <select
                          value={newExpCat}
                          onChange={(e) => setNewExpCat(e.target.value)}
                          className="bg-white text-slate-800 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                        >
                          <option value="groceries">Groceries</option>
                          <option value="utility">Utility</option>
                          <option value="transport">Transport</option>
                          <option value="emergency">Emergency</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="rent">Rent</option>
                          <option value="others">Others</option>
                        </select>
                      </div>

                      <input
                        type="text"
                        value={newExpProductName}
                        onChange={(e) => setNewExpProductName(e.target.value)}
                        placeholder="Product Name (e.g. Teff Spice, Gas Cylinder)"
                        className="w-full bg-white text-slate-850 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                      />

                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newExpDesc}
                          onChange={(e) => setNewExpDesc(e.target.value)}
                          placeholder="Spent Description, e.g. Injera & Onions"
                          className="flex-1 bg-white text-slate-850 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                        />
                        <button
                          type="submit"
                          className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                        >
                          Log
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center text-[10px] text-slate-400 leading-normal leading-relaxed select-none">
                      Daily cost logging is gated. Sister Alem manages the household expense registry strictly.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: ADD MONEY INFLOW CONTROLLER WITH SCREENSHOT proof ATTACHMENT */}
            {activeSubTab === 'add-money' && (
              <div className="space-y-4 animate-fade-in">
                
                {/* View existing inflows on this clicked day */}
                <div>
                  <h3 className="text-[10px] font-mono tracking-wider font-extrabold text-slate-500 uppercase mb-2">
                    Fund Inputs / Added Money
                  </h3>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {selectedDayFundings.length === 0 ? (
                      <div className="text-center py-5 border border-dashed border-slate-200 rounded-lg bg-slate-50 italic text-[11px] text-slate-450">
                        No deposits logged yet on this date.
                      </div>
                    ) : (
                      selectedDayFundings.map((fund) => (
                        <div 
                          key={fund.id} 
                          className="p-2 border border-emerald-100 rounded-lg bg-emerald-50/25 flex justify-between items-center gap-2 hover:bg-emerald-50/40 transition-all"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 text-xs truncate block capitalize leading-tight">
                              {fund.notes || 'Inflow credit top-off'}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 p-0.5 font-bold rounded">
                                From: {fund.source}
                              </span>
                              {fund.screenshot && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(fund.screenshot || null)}
                                  className="text-[9px] text-blue-600 hover:underline font-bold flex items-center gap-0.5 bg-white px-1.5 py-0.2 rounded border border-blue-100"
                                >
                                  <Eye className="w-2.5 h-2.5" /> View Proof
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right leading-none">
                            <span className="font-mono text-xs font-black text-emerald-700">
                              +{fund.amount.toLocaleString()}
                            </span>
                            <span className="text-[8px] font-mono text-emerald-600 block mt-0.5">Br</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ADD INFLOW FORM */}
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase block mb-2">
                    Fund Cash / Support Registry
                  </span>

                  <form onSubmit={handleLocalAddFunding} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        required
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(e.target.value)}
                        placeholder="Inflow Birr"
                        className="bg-white text-slate-850 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                      />
                      <input
                        type="text"
                        value={fundingSource}
                        onChange={(e) => setFundingSource(e.target.value)}
                        placeholder="Sender, e.g. Father"
                        className="bg-white text-slate-850 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={fundingNotes}
                        onChange={(e) => setFundingNotes(e.target.value)}
                        placeholder="E.g. Commercial Bank of Ethiopia refill"
                        className="flex-1 bg-white text-slate-850 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                      />
                    </div>

                    {/* Screenshot Selection Container as requested: "attached the payment screenshots pictures" */}
                    <div className="border border-dashed border-slate-200 p-2.5 rounded-lg bg-slate-50/20 text-center space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-600 flex items-center gap-1.5 select-none">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Payment Screenshot
                        </span>
                        
                        {!fundingScreenshot && (
                          <button
                            type="button"
                            onClick={triggerMockScreenshot}
                            className="text-[9px] bg-blue-50 font-bold border border-blue-105 text-blue-700 rounded p-0.5 px-1.5 shrink-0 hover:bg-blue-100"
                          >
                            Simulate Proof
                          </button>
                        )}
                      </div>

                      {fundingScreenshot ? (
                        <div className="relative rounded overflow-hidden h-14 bg-slate-100 flex items-center justify-center border border-slate-200">
                          <img 
                            src={fundingScreenshot} 
                            alt="Screenshot Proof" 
                            className="h-full object-cover rounded"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setFundingScreenshot(undefined)}
                            className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white hover:bg-rose-700 rounded-full cursor-pointer shadow"
                            title="Remove picture"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center py-2 border border-dashed border-slate-250 bg-white hover:bg-slate-50 rounded-lg cursor-pointer transition">
                          <Upload className="w-4 h-4 text-slate-400 mb-0.5" />
                          <span className="text-[10px] text-slate-500 font-bold">Attach Image Screenshot</span>
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            accept="image/*" 
                            onChange={handleScreenshotChange} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!fundingAmount}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 hover:shadow-xs text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                    >
                      <Coins className="w-3.5 h-3.5" /> Log Input topoff + Proof
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* TAB CONTENT 3: COMMENT BOARD PINNED AND TARGETED SPECIFICALLY FOR THE SELECTED DAY */}
            {activeSubTab === 'day-talk' && (
              <div className="space-y-4 animate-fade-in">
                
                <div>
                  <h3 className="text-[10px] font-mono tracking-wider font-extrabold text-slate-500 uppercase mb-2">
                    Day Discussion & Inquiries
                  </h3>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {selectedDayComments.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-[11px] text-slate-400 italic">
                        No comments logged on this date yet. Ask questions or leave household alert notes!
                      </div>
                    ) : (
                      selectedDayComments.map((com) => (
                        <div 
                          key={com.id} 
                          className={`p-2.5 border rounded-lg space-y-1 ${
                            com.type === 'request'
                              ? 'bg-rose-50/20 border-rose-100'
                              : 'bg-slate-50/50 border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-bold text-[11px] text-slate-700">
                              {com.authorName.split(' ')[0]}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-sans leading-normal">
                            {com.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Day Comments Submission form */}
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase block mb-1.5">
                    Log Day Inquiry or Note
                  </span>

                  <form onSubmit={handleLocalAddComment} className="space-y-2">
                    <div className="flex gap-1 bg-slate-50 p-0.5 rounded border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDayCommentType('comment')}
                        className={`flex-1 py-1 text-[9px] font-black rounded uppercase cursor-pointer ${
                          dayCommentType === 'comment'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        💬 Question
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayCommentType('request')}
                        className={`flex-1 py-1 text-[9px] font-black rounded uppercase cursor-pointer ${
                          dayCommentType === 'request'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        🛑 Cost inquiry
                      </button>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        value={dayCommentText}
                        onChange={(e) => setDayCommentText(e.target.value)}
                        placeholder="E.g. Sister: What was the 2,500 groceries for?"
                        className="flex-1 bg-white text-slate-850 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 shadow-3xs"
                      />
                      <button
                        type="submit"
                        className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shrink-0"
                      >
                        Post
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}

          </div>

          {/* Quick Summary status widget inside Hub */}
          <div className="border-t border-slate-150 pt-3 mt-3">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs leading-normal">
              <div className="flex justify-between items-center mb-1 text-[11px] text-slate-500">
                <span>Outflows this date:</span>
                <span className="font-mono font-bold text-rose-600">
                  {selectedDayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0).toLocaleString()} Br
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Inflows this date:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedDayFundings.reduce((sum, f) => sum + (Number(f.amount) || 0), 0).toLocaleString()} Br
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- PAYMENT PROOF LIGHTBOX OVERLAY PREVIEW --- */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="relative bg-white rounded-xl overflow-hidden max-w-lg w-full p-4 space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-150 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" /> Bank Transfer Reference Receipt
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-slate-800 text-sm font-black uppercase cursor-pointer"
              >
                Close ×
              </button>
            </div>

            <div className="max-h-[350px] overflow-hidden flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200 p-1">
              <img 
                src={previewImage} 
                alt="Receipt Verification Screenshot" 
                className="max-h-full max-w-full object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <p className="text-[10px] text-slate-400 text-center font-mono">
              Base64 encrypted signature verify code: PROOF_{Math.random().toString(36).substring(4).toUpperCase()}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
