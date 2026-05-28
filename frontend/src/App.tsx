import React, { useState, useEffect, useMemo } from 'react';
import { FamilyUser, Expense, Allowance, Comment, Notification, Funding } from './types';
import { apiRequest, clearAuthToken, getStoredAuthToken, storeAuthToken } from './api';
import AuthScreen from './components/AuthScreen';
import CalendarView from './components/CalendarView';
import SpendingCharts from './components/SpendingCharts';
import CommentsBoard from './components/CommentsBoard';
import NotificationsPanel from './components/NotificationsPanel';
import FinanceChatBot from './components/FinanceChatBot';
import DayDetailsView from './components/DayDetailsView';
import {
  Coins,
  Shield,
  LogOut,
  RefreshCw,
  Plus,
  X,
  PlusCircle,
  PiggyBank,
  CheckCircle,
  Users,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Search,
  Check,
  LayoutDashboard,
  User,
  Bell,
  Clock,
  Timer
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FamilyUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeDate, setActiveDate] = useState('2026-05-27'); // Today in simulated system
  const [allUsers, setAllUsers] = useState<FamilyUser[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fundings, setFundings] = useState<Funding[]>([]);

  // Navigation and dynamic Month Cycle states
  const [selectedMonth, setSelectedMonth] = useState('2026-05');
  const [customMonths, setCustomMonths] = useState<string[]>(['2026-05', '2026-06', '2026-07']);

  const monthTabs = useMemo(() => {
    const list = new Set(['2026-05', '2026-06', '2026-07']);
    customMonths.forEach((m) => list.add(m));
    allowances.forEach((al) => {
      if (al.month) list.add(al.month);
    });
    expenses.forEach((ex) => {
      if (ex.date && ex.date.length >= 7) {
        list.add(ex.date.substring(0, 7));
      }
    });
    return Array.from(list).sort();
  }, [allowances, expenses, customMonths]);

  // Father's monthly income day (the 24th) countdown calculation
  const incomeCountdownInfo = useMemo(() => {
    // We calculate countdown based on the activeDate (to stay in-sync with calendar timeline)
    let sourceDate = new Date();
    try {
      if (activeDate) {
        const [y, m, d] = activeDate.split('-');
        if (y && m && d) {
          const parsed = new Date(Number(y), Number(m) - 1, Number(d));
          if (!isNaN(parsed.getTime())) {
            sourceDate = parsed;
          }
        }
      }
    } catch (err) {
      sourceDate = new Date();
    }

    const currentYear = sourceDate.getFullYear();
    const currentMonth = sourceDate.getMonth(); // 0-indexed
    const currentDay = sourceDate.getDate();

    const targetDay = 24;
    let targetYear = currentYear;
    let targetMonth = currentMonth;

    // Check if today is the income day
    if (currentDay === targetDay) {
      return {
        daysRemaining: 0,
        targetDateLabel: new Date(currentYear, currentMonth, targetDay).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        }),
        isIncomeDay: true,
        percentElapsed: 100,
        daysElapsed: 30,
        totalCycleDays: 30,
        currentDayLabel: sourceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    }

    if (currentDay < targetDay) {
      targetMonth = currentMonth;
    } else {
      targetMonth = currentMonth + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear = currentYear + 1;
      }
    }

    const targetDate = new Date(targetYear, targetMonth, targetDay);
    
    // Cycle runs from the 24th of previous month to the 24th of active target month
    let prevIncomeMonth = targetMonth - 1;
    let prevIncomeYear = targetYear;
    if (prevIncomeMonth < 0) {
      prevIncomeMonth = 11;
      prevIncomeYear = targetYear - 1;
    }
    const prevIncomeDate = new Date(prevIncomeYear, prevIncomeMonth, targetDay);
    
    const totalCycleTime = targetDate.getTime() - prevIncomeDate.getTime();
    const totalCycleDays = Math.max(1, Math.round(totalCycleTime / (1000 * 60 * 60 * 24)));

    const diffTime = targetDate.getTime() - sourceDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const daysElapsed = Math.max(0, totalCycleDays - daysRemaining);
    const percentElapsed = Math.min(100, Math.round((daysElapsed / totalCycleDays) * 100));

    return {
      daysRemaining,
      targetDateLabel: targetDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      }),
      isIncomeDay: false,
      percentElapsed,
      daysElapsed,
      totalCycleDays,
      currentDayLabel: sourceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  }, [activeDate]);

  // Navigation state (Sleek simplified 2-tabs view as requested)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'notifications' | 'day-details'>('dashboard');

  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);

  // Search Filter Ledger state
  const [searchTerm, setSearchTerm] = useState('');

  // Modals / Quick forms
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expProductName, setExpProductName] = useState('');
  const [expCat, setExpCat] = useState('groceries');
  const [expDate, setExpDate] = useState('2026-05-27');
  const [expCreatedByName, setExpCreatedByName] = useState('');

  const [showAllowanceForm, setShowAllowanceForm] = useState(false);
  const [allowAmount, setAllowAmount] = useState('');
  const [allowNotes, setAllowNotes] = useState('');

  const loadRemoteState = async (token: string) => {
    const [authMe, users, expensesData, allowancesData, commentsData, notificationsData, fundingsData] = await Promise.all([
      apiRequest<{ user: FamilyUser }>('/api/auth/me', { method: 'GET', token }),
      apiRequest<FamilyUser[]>('/api/users', { method: 'GET', token }),
      apiRequest<Expense[]>('/api/expenses', { method: 'GET', token }),
      apiRequest<Allowance[]>('/api/allowances', { method: 'GET', token }),
      apiRequest<Comment[]>('/api/comments', { method: 'GET', token }),
      apiRequest<Notification[]>('/api/notifications', { method: 'GET', token }),
      apiRequest<Funding[]>('/api/fundings', { method: 'GET', token }),
    ]);

    setCurrentUser(authMe.user);
    setAuthToken(token);
    setAllUsers(users);
    setExpenses(expensesData);
    setAllowances(allowancesData);
    setComments(commentsData);
    setNotifications(notificationsData);
    setFundings(fundingsData);
  };

  // 1. Core Boot Check: JWT auth check against Express server
  useEffect(() => {
    const savedToken = getStoredAuthToken();
    if (!savedToken) {
      setIsAuthLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        await loadRemoteState(savedToken);
      } catch (err) {
        console.error('Core JWT boot check crashed:', err);
        clearAuthToken();
      } finally {
        setIsAuthLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Handle Login success
  const handleLoginSuccess = async (token: string, user: FamilyUser) => {
    storeAuthToken(token);
    setAuthToken(token);
    setCurrentUser(user);

    try {
      await loadRemoteState(token);
    } catch (err) {
      console.error('Failed to load remote data after login:', err);
    }
  };

  // Sign out route
  const handleSignOut = () => {
    clearAuthToken();
    setAuthToken(null);
    setCurrentUser(null);
    setAllUsers([]);
    setExpenses([]);
    setAllowances([]);
    setComments([]);
    setNotifications([]);
    setFundings([]);
  };

  const refreshRemoteData = async () => {
    if (!authToken) {
      return;
    }

    await loadRemoteState(authToken);
  };

  // Active Month allowance filtered by selectedMonth
  const activeAllowanceItem = useMemo(() => {
    const found = allowances.find((al) => al.month === selectedMonth);
    return found || null;
  }, [allowances, selectedMonth]);

  const allowanceAmount = activeAllowanceItem?.amount || 0;

  // Filter expenses and fundings belonging to the selected Month Period
  const expensesThisMonth = useMemo(() => {
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const fundingsThisMonth = useMemo(() => {
    return fundings.filter((f) => f.date && f.date.startsWith(selectedMonth));
  }, [fundings, selectedMonth]);

  // Total fundings (add money logs) added to this cycle
  const totalFundingAmount = useMemo(() => {
    return fundingsThisMonth.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [fundingsThisMonth]);

  // Total net money pool = fixed monthly Birr allocation + additional fund inputs
  const totalNetCapital = useMemo(() => {
    return allowanceAmount + totalFundingAmount;
  }, [allowanceAmount, totalFundingAmount]);

  const totalSpentThisMonth = useMemo(() => {
    return expensesThisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expensesThisMonth]);

  const remainingBudget = useMemo(() => {
    return totalNetCapital - totalSpentThisMonth;
  }, [totalNetCapital, totalSpentThisMonth]);

  // Daily Burn rate based on completed days in simulated month
  const dailyBurnRate = useMemo(() => {
    return totalSpentThisMonth > 0 ? Math.round(totalSpentThisMonth / 30) : 0;
  }, [totalSpentThisMonth]);

  // Unread alerts targeted to current role
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => {
      if (!currentUser) return false;
      const isTarget = n.recipientRole === 'all' || n.recipientRole === currentUser.role;
      const isRead = n.readBy.includes(currentUser.uid);
      return isTarget && !isRead;
    }).length;
  }, [notifications, currentUser]);

  // Search filter restricted to active month
  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expensesThisMonth;
    const term = searchTerm.toLowerCase();
    return expensesThisMonth.filter(
      (e) =>
        e.description.toLowerCase().includes(term) ||
        (e.productName && e.productName.toLowerCase().includes(term)) ||
        e.category.toLowerCase().includes(term) ||
        e.date.includes(term)
    );
  }, [expensesThisMonth, searchTerm]);

  // Action: Add user profile
  const handleAddNewUser = (u: FamilyUser) => {
    setAllUsers((prev) => [...prev, u]);
  };

  // Action: Add Expense manually
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === 'user') return;
    if (!expAmount || !expDesc || !expDate) return;

    const amountNum = Number(expAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await handleCalendarAddExpense(
      expDesc.trim(),
      amountNum,
      expCat,
      expDate,
      expCreatedByName || currentUser.displayName,
      expProductName.trim() || undefined
    );

    // Reset local modal form
    setExpAmount('');
    setExpDesc('');
    setExpProductName('');
    setShowAddExpenseModal(false);
  };

  // Reusable calendar expense additions
  const handleCalendarAddExpense = async (
    desc: string,
    amount: number,
    category: string,
    date: string,
    customCreatedByName?: string,
    productName?: string
  ) => {
    if (!currentUser || currentUser.role === 'user') return;
    const resolvedName = customCreatedByName || currentUser.displayName;
    await apiRequest<Expense>('/api/expenses', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({
        amount,
        description: desc,
        productName,
        category,
        date,
        createdByName: resolvedName,
      }),
    });

    await refreshRemoteData();
  };

  // Funding inputs handlers (add money triggers) "attached payment receipt screenshot"
  const handleCalendarAddFunding = async (amount: number, source: string, notes: string, screenshot: string | undefined, date: string) => {
    if (!currentUser) return;

    await apiRequest<Funding>('/api/fundings', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({
        amount,
        source,
        notes,
        screenshot,
        date,
      }),
    });

    await refreshRemoteData();
  };

  // Day specific discussion commenting
  const handleCalendarAddComment = async (text: string, type: 'comment' | 'request' | 'contribution', date: string) => {
    if (!currentUser) return;

    await apiRequest<Comment>('/api/comments', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({
        type,
        text,
        date,
      }),
    });

    await refreshRemoteData();
  };

  // Action: Delete spending entry (Sister exclusive)
  const handleDeleteExpense = async (id: string) => {
    if (!currentUser || currentUser.role === 'user') return;

    await apiRequest<{ success: boolean }>(`/api/expenses/${id}`, {
      method: 'DELETE',
      token: authToken,
    });

    await refreshRemoteData();
  };

  // Action: Set Allowance (Provider refills monthly envelope check)
  const handleSetAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amountVal = Number(allowAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    await apiRequest<Allowance>('/api/allowances', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({
        amount: amountVal,
        month: selectedMonth,
        notes: allowNotes.trim() || `Updated House envelope budget for ${selectedMonth}.`,
      }),
    });

    await refreshRemoteData();

    setAllowAmount('');
    setAllowNotes('');
    setShowAllowanceForm(false);
  };

  // General discussion comments handler (Full dashboard board)
  const handleAddGeneralComment = async (type: 'comment' | 'request' | 'contribution', text: string) => {
    if (!currentUser) return;

    await apiRequest<Comment>('/api/comments', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({
        type,
        text,
      }),
    });

    await refreshRemoteData();
  };

  const handleMarkNotificationRead = async (id: string) => {
    if (!currentUser) return;

    await apiRequest<Notification>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      token: authToken,
    });

    await refreshRemoteData();
  };

  const handleClearNotifications = async () => {
    await apiRequest<{ success: boolean }>('/api/notifications', {
      method: 'DELETE',
      token: authToken,
    });

    await refreshRemoteData();
  };

  // Gatekeeping loading screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-blue-500 border-slate-800 animate-spin"></div>
        <p className="text-slate-400 font-mono text-xs select-none lowercase italic text-center">
          Handshaking secure JWT authentication profiles...
        </p>
      </div>
    );
  }

  // 1. Conditional Authentication gateway check
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION - HIGH DENSITY SIMPLIFIED NAV LAYOUT */}
      <aside className="w-64 bg-slate-900 shrink-0 hidden md:flex flex-col justify-between select-none shadow-md z-10 border-r border-slate-950">
        <div className="flex flex-col min-h-0">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1 px-2 rounded bg-blue-600 text-white font-black text-lg select-none leading-none tracking-tight">ETB</div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white uppercase">AlemFund</h1>
                <p className="text-slate-500 text-[9px] uppercase font-mono tracking-widest font-bold leading-none mt-1">Birr Family Deck</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block px-3 mb-2">
              Gatehouses
            </span>
            
            {/* TAB 1: FULL DASHBOARD */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Full Analytics Dashboard</span>
            </button>

            {/* TAB 2: HEATMAP CALENDAR (FULL WIDTH VIEW) */}
            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Calendar Heatmap View</span>
              </div>
              {expenses.length > 0 && (
                <span className="bg-slate-950 text-slate-400 font-mono text-[9px] px-1.5 py-0.2 rounded-md font-black">
                  {expenses.length}
                </span>
              )}
            </button>

            {/* TAB 3: NOTIFICATIONS CENTER */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notifications Center</span>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="bg-rose-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

          </nav>
        </div>

        {/* LOGGED IN IDENTITY CARD INFO IN SIDEBAR FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-mono font-black select-none text-xs shrink-0 uppercase">
              {currentUser.displayName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white font-black truncate leading-none">{currentUser.displayName}</p>
              <p className="text-[9px] font-mono text-slate-500 truncate capitalize mt-1.5">
                Role: {currentUser.role === 'sister' ? '👩 Sister/Admin' : '👨 Relative/Reader'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-1.5 px-3 bg-slate-850 hover:bg-rose-950/30 hover:text-rose-400 text-slate-400 font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Stop Session (Sign Out)
          </button>
        </div>
      </aside>

      {/* CORE WORKSPACE VIEW CONTROLLER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        
        {/* UPPER APPLICATION BAR */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 select-none">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] text-slate-400 uppercase font-mono font-black tracking-widest leading-none">
              Family Budget Cycle
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-700 mt-1 font-sans truncate pr-1">
              {(() => {
                const [y, m] = selectedMonth.split('-');
                const dateObj = new Date(Number(y), Number(m) - 1, 1);
                return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              })()} Operations<span className="hidden sm:inline"> • {currentUser.displayName} Profile Active</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5">
            {currentUser.role === 'sister' && (
              <button
                onClick={() => {
                  setExpDate('2026-05-27');
                  setExpCreatedByName(currentUser.displayName);
                  setShowAddExpenseModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all select-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">+ Log Spent Cash</span>
                <span className="xs:hidden">+ Log</span>
              </button>
            )}

            {/* Notifications trigger top-right icon */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 border rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-250 hover:bg-slate-100 text-slate-500'
              }`}
              title="Notifications Center"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse border border-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Mobile Profile Trigger */}
            <div className="relative leading-none">
              <button
                onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
                className="w-8.5 h-8.5 rounded-lg bg-indigo-650 hover:bg-indigo-750 text-white font-mono font-black flex items-center justify-center uppercase cursor-pointer text-xs border border-indigo-750 transition-all shadow-3xs hover:shadow-2xs select-none"
                title="Profile Menu"
              >
                {currentUser.displayName ? currentUser.displayName[0] : 'U'}
              </button>
              {showMobileUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-30 select-none animate-fade-in text-slate-800">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-800 tracking-tight truncate">{currentUser.displayName}</p>
                    <p className="text-[10px] font-mono text-slate-450 uppercase tracking-wider mt-1.5">
                      {currentUser.role === 'sister' ? '👩 Sister/Admin' : '👨 Relative/Reader'}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowMobileUserMenu(false);
                        handleSignOut();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Sign Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BOTTOM CONTENT CANVAS */}
        <div className="flex-1 overflow-y-auto bg-[#F3F4F6] min-h-0">
          
          {/* MONTH TABS / PERIOD NAVIGATION ELEMENT */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 sticky top-0 shadow-3xs">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] text-slate-400 font-mono tracking-widest font-extrabold uppercase leading-none">
                Select Budget Month Period
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 select-none scrollbar-none">
                {monthTabs.map((month) => {
                  const isSelected = selectedMonth === month;
                  const monthAllowance = allowances.find((a) => a.month === month);
                  const formattedMonthLabel = (() => {
                    if (!month || !month.includes('-')) return month;
                    const [y, m] = month.split('-');
                    const dateObj = new Date(Number(y), Number(m) - 1, 1);
                    return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  })();
                  return (
                    <button
                      key={month}
                      id={`month-tab-${month}`}
                      onClick={() => setSelectedMonth(month)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border uppercase font-mono ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold hover:bg-blue-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{formattedMonthLabel}</span>
                      {monthAllowance ? (
                        <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded font-black ${
                          isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {monthAllowance.amount.toLocaleString()} Br
                        </span>
                      ) : (
                        <span className={`text-[9.2px] font-mono px-1.5 py-0.5 rounded font-black ${
                          isSelected ? 'bg-amber-800 text-amber-100 animate-pulse' : 'bg-amber-50 text-amber-700'
                        }`}>
                          0 Br
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUICK ACTIONS FOR ADDING PERIODS AND CONFIGURING BUDGET */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="add-custom-month-btn"
                onClick={() => {
                  const val = prompt("Enter new budget month in YYYY-MM format (e.g. 2026-06 or 2026-07). It will automatically create a new dynamic tab:");
                  if (val) {
                    const clean = val.trim();
                    if (/^\d{4}-\d{2}$/.test(clean)) {
                      setCustomMonths((prev) => {
                        if (prev.includes(clean)) return prev;
                        return [...prev, clean].sort();
                      });
                      setSelectedMonth(clean);
                      
                      // Also prompt father budget amount
                      const amt = prompt(`Set Father's starting budget (Allowance amount in Birr) for ${clean}:`, "0");
                      if (amt) {
                        const amtNum = Number(amt);
                        if (!isNaN(amtNum) && amtNum >= 0) {
                          setAllowances((p) => {
                            const without = p.filter((al) => al.month !== clean);
                            return [...without, {
                              id: 'allowance_' + Date.now(),
                              amount: amtNum,
                              month: clean,
                              notes: "Monthly envelope budget set.",
                              createdAt: new Date().toISOString(),
                              createdBy: currentUser.uid
                            }];
                          });
                          
                          // Push alert
                          const notif: Notification = {
                            id: 'not_' + Date.now(),
                            text: `📅 Created custom period ${clean} and configured base budget to: ${amtNum.toLocaleString()} Birr.`,
                            recipientRole: 'all',
                            readBy: [],
                            createdAt: new Date().toISOString()
                          };
                          setNotifications((n) => [notif, ...n]);
                        }
                      }
                    } else {
                      alert("Invalid format! Please write in YYYY-MM format like 2026-06.");
                    }
                  }
                }}
                className="bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 text-xs font-black shadow-3xs hover:shadow-2xs transition flex items-center gap-1.5 cursor-pointer select-none"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Budget Month Period</span>
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest truncate">Base House Allowance</p>
              <p className="text-base xs:text-lg sm:text-xl font-black text-slate-850 mt-1 font-mono truncate">
                {allowanceAmount.toLocaleString()}{' '}
                <span className="text-[10px] sm:text-xs font-normal text-slate-400">ETB</span>
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest truncate">Inflow Top-offs</p>
              <p className="text-base xs:text-lg sm:text-xl font-black text-emerald-600 mt-1 font-mono truncate">
                +{totalFundingAmount.toLocaleString()}{' '}
                <span className="text-[10px] sm:text-xs font-normal text-slate-400">ETB</span>
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest truncate">Spent to Date</p>
              <p className="text-base xs:text-lg sm:text-xl font-black text-rose-600 mt-1 font-mono truncate">
                {totalSpentThisMonth.toLocaleString()}{' '}
                <span className="text-[10px] sm:text-xs font-normal text-slate-400">ETB</span>
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-widest truncate">Balance Remaining</p>
              <p className="text-base xs:text-lg sm:text-xl font-black text-blue-700 mt-1 font-mono animate-pulse truncate">
                {remainingBudget.toLocaleString()}{' '}
                <span className="text-[10px] sm:text-xs font-normal text-slate-400">ETB</span>
              </p>
            </div>
          </div>

          {/* MAIN CORE BODY VIEWS */}
          {activeTab === 'calendar' ? (
            /* BRAND NEW FULL PAGE CALENDAR & HEATMAP COMPLEMENTED BY INTERNAL DAILY & WEEKLY CHARTS & CO-OP SIDEBAR */
            <div className="px-6 pb-6 w-full animate-fade-in">
              <CalendarView
                expenses={expenses}
                fundings={fundings}
                comments={comments}
                selectedDateString={activeDate}
                onSelectDate={(dateStr) => {
                  setActiveDate(dateStr);
                  setActiveTab('day-details');
                }}
                currentUser={currentUser}
                onAddExpense={handleCalendarAddExpense}
                onAddFunding={handleCalendarAddFunding}
                onAddComment={handleCalendarAddComment}
                canManage={currentUser.role === 'sister'}
              />
            </div>
          ) : activeTab === 'day-details' ? (
            /* BRAND NEW DEDICATED FULL PAGE DAY DETAILS VIEW */
            <DayDetailsView
              dateString={activeDate}
              currentUser={currentUser}
              expenses={expenses}
              fundings={fundings}
              comments={comments}
              allUsers={allUsers}
              onAddExpense={handleCalendarAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddFunding={handleCalendarAddFunding}
              onAddComment={handleCalendarAddComment}
              onBack={() => setActiveTab('calendar')}
            />
          ) : activeTab === 'notifications' ? (
            /* BRAND NEW STANDALONE NOTIFICATIONS CENTER VIEW */
            <div className="px-6 pb-6 max-w-4xl mx-auto w-full animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <Bell className="w-5.5 h-5.5 text-blue-600 shrink-0" />
                      Family Alerts & Logs
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Monitor large expense alerts, chat updates, and financial refills in real-time
                    </p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearNotifications}
                      className="text-xs font-mono font-bold bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-100 rounded-lg px-4 py-2 transition-all text-center cursor-pointer select-none shrink-0"
                    >
                      Clear Log Center ({notifications.length})
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-slate-50 italic text-slate-400 text-sm">
                      ✨ No notifications recorded yet. All operations running smoothly!
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isReadByUser = notif.readBy.includes(currentUser.uid);
                      return (
                        <div
                          key={notif.id}
                          className={`p-4 border rounded-xl flex items-start sm:items-center justify-between gap-4 transition-all ${
                            isReadByUser
                              ? 'bg-slate-50/60 border-slate-200 text-slate-500'
                              : 'bg-blue-50/20 border-blue-200 text-slate-800 shadow-3xs font-medium'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              isReadByUser ? 'bg-slate-200/70 text-slate-400' : 'bg-blue-100 text-blue-600'
                            }`}>
                              <Bell className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 font-sans">{notif.text}</p>
                              <span className="text-[10px] text-slate-400 font-mono block mt-1">
                                {new Date(notif.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {!isReadByUser && (
                            <button
                              onClick={() => handleMarkNotificationRead(notif.id)}
                              className="text-[10px] font-black text-blue-600 hover:text-white bg-white hover:bg-blue-600 border border-blue-250 rounded-lg px-3 py-1.5 shrink-0 transition-all cursor-pointer shadow-3xs hover:shadow-2xs select-none uppercase tracking-tight"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 1: THE FULL ANALYTICS AND LEDGER DASHBOARD */
            <div className="px-6 pb-6 space-y-6">
              
              {/* Only show countdown if the selected month matches physical real-time month of May 2026 */}
              {selectedMonth === '2026-05' && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-900 p-5 text-white shadow-xl relative overflow-hidden" id="income-countdown-panel">
                  
                  {/* Absolutes for background highlights to look high-end */}
                  <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                  <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    
                    {/* Text Context info */}
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-2.5 text-[9px] font-mono rounded-md bg-indigo-500 border border-indigo-450 text-indigo-100 font-bold uppercase tracking-widest leading-none">
                          Month Cycle Tracker
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-indigo-300 font-semibold font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          Active: {incomeCountdownInfo.currentDayLabel}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight flex items-center gap-1.5 font-sans">
                          Father Abebe's Income Timeline
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed mt-1">
                          Abebe's monthly family allowance is scheduled on the <span className="text-amber-400 font-mono font-black">24th ({incomeCountdownInfo.targetDateLabel})</span>. 
                        </p>
                      </div>

                      {/* Smart Advice Panel */}
                      <div className="pt-2">
                        {incomeCountdownInfo.isIncomeDay ? (
                          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-start gap-2.5 font-sans">
                            <Coins className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                            <div>
                              <p className="font-extrabold text-emerald-300">💰 Happy Income Refill Day!</p>
                              <p className="text-emerald-350 text-[11px] mt-0.5 leading-relaxed font-normal">
                                Today is the 24th! Father Abebe's base deposit cycle of {allowanceAmount.toLocaleString()} Birr is scheduled for renewal. Ask him to commit the new allowance starting budget!
                              </p>
                            </div>
                          </div>
                        ) : remainingBudget <= 1500 && incomeCountdownInfo.daysRemaining > 6 ? (
                          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-start gap-2.5 font-sans">
                            <Timer className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                            <div>
                              <p className="font-extrabold text-rose-300">⚠️ Cash Buffer Alert (Tight!)</p>
                              <p className="text-rose-355 text-[11px] mt-0.5 leading-relaxed font-normal">
                                Warning: Only {remainingBudget.toLocaleString()} Birr exists, but we have <span className="font-bold underline">{incomeCountdownInfo.daysRemaining} days</span> remaining. Hold off optional grocery, utilities, or transport slips to avoid family out-of-pocket deficits!
                              </p>
                            </div>
                          </div>
                        ) : incomeCountdownInfo.daysRemaining <= 3 ? (
                          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-semibold flex items-start gap-2.5 font-sans">
                            <Timer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                            <div>
                              <p className="font-extrabold text-amber-300">🔮 Wrap-up Stage (Refill Imminent)</p>
                              <p className="text-amber-205 text-[11px] mt-0.5 leading-relaxed font-normal">
                                We are in the home stretch with only <span className="font-bold">{incomeCountdownInfo.daysRemaining} days</span> remaining in this pay period. Reconcile remaining grocery receipts or micro-bills now.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-semibold flex items-start gap-2.5 font-sans">
                            <CheckCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-teal-300">📈 Stable pacing active</p>
                              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed font-normal">
                                Balanced pacing is on track. With {remainingBudget.toLocaleString()} Birr left and {incomeCountdownInfo.daysRemaining} days until refill, our projected daily burn velocity aligns within household limits.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Big Visual Numeric Days Tracker */}
                    <div className="w-full md:w-auto shrink-0 flex flex-row md:flex-col items-center justify-between md:justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-center gap-4 transition-all md:min-w-[190px] select-none">
                      <div className="text-left md:text-center">
                        <span className="text-[10px] text-slate-305 font-mono font-bold uppercase block tracking-wider leading-none">
                          Refill Countdown
                        </span>
                        <span className="text-3xl sm:text-4xl font-mono font-black text-amber-400 block tracking-tight mt-1.5 animate-pulse">
                          {incomeCountdownInfo.isIncomeDay ? "TODAY" : `${incomeCountdownInfo.daysRemaining}`}
                        </span>
                        <span className="text-[10.5px] text-slate-300 font-bold uppercase font-mono block tracking-tight leading-none mt-1">
                          {incomeCountdownInfo.isIncomeDay ? "💰 PAYDAY ARRIVED!" : "DAYS REMAINING"}
                        </span>
                      </div>

                      {/* Circular visual or micro indicator track */}
                      <div className="w-16 h-1.5 md:w-32 bg-white/10 rounded-full overflow-hidden p-[1px]">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-500"
                          style={{ width: `${100 - incomeCountdownInfo.percentElapsed}%` }}
                        />
                      </div>
                      
                      <span className="text-[9px] font-mono text-indigo-200 uppercase font-black tracking-wider leading-none">
                        Cycle elapsed: {incomeCountdownInfo.percentElapsed}%
                      </span>
                    </div>

                  </div>
                  
                  {/* Visual Cycle Progress Track */}
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-2 font-mono leading-none">
                      <span>Cycle Start (24th)</span>
                      <span className="text-amber-400">Current Day Count: Day {incomeCountdownInfo.daysElapsed}</span>
                      <span>Target Refill (24th)</span>
                    </div>
                    
                    <div className="relative w-full h-3 bg-white/10 rounded-full border border-white/5 p-0.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${incomeCountdownInfo.percentElapsed}%` }}
                      />
                      
                      {/* Visual Milestones */}
                      <div className="absolute top-1/2 left-[33%] -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/70" title="Day 10 mark"></div>
                      <div className="absolute top-1/2 left-[66%] -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/70" title="Day 20 mark"></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[9px] text-slate-400 italic mt-1 font-sans">
                      <span>Pacing indicator benchmarks</span>
                      <span className="text-[10px] text-indigo-300 not-italic font-semibold flex items-center gap-1.5 font-mono">
                        Elapsed: {incomeCountdownInfo.daysElapsed} days of {incomeCountdownInfo.totalCycleDays} total period span
                      </span>
                    </div>
                  </div>

                </div>
              )}

              <div className="grid grid-cols-12 gap-6 items-start">
              
              {/* Left Column (8 units): Ledgers & AI Co-pilot report streams */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                
                {/* TRANSACTION LEDGER TABLE WITH HIGH CONTRAST SEARCH LISTINGS */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                  <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm italic">Master Transaction Ledger</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Filter, scroll, and verify receipt entries in real-time</p>
                    </div>

                    <div className="relative w-full sm:w-60">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Type item description or cat..."
                        className="w-full bg-white text-slate-700 text-xs border border-slate-200 rounded-lg pl-8.5 pr-3 py-1.5 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* DESKTOP VIEW LEDGER TABLE */}
                  <div className="hidden md:block overflow-x-auto max-h-[350px]">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead className="sticky top-0 bg-white border-b text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold">
                        <tr>
                          <th className="p-4">Date</th>
                          <th className="p-4">Spent Explanation</th>
                          <th className="p-4">Tag</th>
                          <th className="p-4 text-right">Birr Amount</th>
                          {currentUser.role === 'sister' && <th className="p-4 text-right">Delete</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-600">
                        {filteredExpenses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                              No matching transaction records found.
                            </td>
                          </tr>
                        ) : (
                          filteredExpenses.map((exp) => (
                            <tr key={exp.id} className="hover:bg-slate-50/55 transition group">
                              <td className="p-4 font-mono font-bold text-slate-500">{exp.date}</td>
                              <td className="p-4 font-semibold text-slate-800">
                                <span className="capitalize block text-xs font-black text-slate-900">
                                  {exp.productName ? exp.productName : exp.description}
                                </span>
                                {exp.productName && (
                                  <span className="capitalize block text-[10px] text-slate-500 font-normal mt-0.5">
                                    Explanation: {exp.description}
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-400 block font-normal mt-1">
                                  Logged by {exp.createdByName || 'Alem (Sister)'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`text-[9px] p-1 font-bold rounded uppercase ${
                                  exp.category === 'groceries'
                                    ? 'bg-blue-50 text-blue-600'
                                    : exp.category === 'utility'
                                    ? 'bg-red-50 text-red-650'
                                    : exp.category === 'transport'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : exp.category === 'emergency'
                                    ? 'bg-amber-50 text-amber-650'
                                    : 'bg-indigo-50 text-indigo-650'
                                }`}>
                                  {exp.category}
                                </span>
                              </td>
                              <td className="p-4 text-right font-black text-slate-800 font-mono">
                                {exp.amount.toLocaleString()}
                              </td>
                              {currentUser.role === 'sister' && (
                                <td className="p-4 text-right text-slate-300 hover:text-red-605 transition group p-1">
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${exp.productName || exp.description}?`)) {
                                        handleDeleteExpense(exp.id);
                                      }
                                    }}
                                    className="text-[10px] font-bold tracking-tight cursor-pointer rounded underline p-1 text-slate-400 hover:text-red-600"
                                  >
                                    Delete
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE VIEW LEDGER CARD-LIST */}
                  <div className="md:hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto bg-white">
                    {filteredExpenses.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 italic text-xs">
                        No matching transaction records found.
                      </div>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <div key={exp.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-505 bg-slate-100 px-1.5 py-0.5 rounded">
                              {exp.date}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded uppercase shrink-0 ${
                              exp.category === 'groceries'
                                ? 'bg-blue-50 text-blue-650'
                                : exp.category === 'utility'
                                ? 'bg-red-50 text-red-650'
                                : exp.category === 'transport'
                                ? 'bg-emerald-50 text-emerald-650'
                                : exp.category === 'emergency'
                                ? 'bg-amber-50 text-amber-650'
                                : 'bg-indigo-50 text-indigo-650'
                            }`}>
                              {exp.category}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="capitalize text-xs font-black text-slate-900 leading-snug">
                              {exp.productName ? exp.productName : exp.description}
                            </h4>
                            {exp.productName && (
                              <p className="capitalize text-[10.5px] text-slate-500">
                                <span className="font-bold text-slate-400 uppercase text-[9px]">Detail:</span> {exp.description}
                              </p>
                            )}
                            <p className="text-[9.5px] text-slate-400">
                              Logged by {exp.createdByName || 'Alem (Sister)'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100">
                            {currentUser.role === 'sister' ? (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${exp.productName || exp.description}?`)) {
                                    handleDeleteExpense(exp.id);
                                  }
                                }}
                                className="text-[10.5px] text-rose-600 hover:text-rose-700 bg-rose-50/75 hover:bg-rose-100 rounded px-2.5 py-1 font-bold transition cursor-pointer"
                              >
                                Delete
                              </button>
                            ) : (
                              <div />
                            )}
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mr-1">ETB</span>
                              <span className="text-sm font-black text-slate-900 font-mono">
                                {exp.amount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {filteredExpenses.length > 0 && (
                    <div className="bg-slate-50 p-3 text-right text-[10px] font-mono font-black text-slate-500 border-t">
                      Page sum: {filteredExpenses.reduce((sum, x) => sum + x.amount, 0).toLocaleString()} Birr
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (4 units): Deposits, Charts, Live Alert Alerts and Comments board */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                
                {/* BASE ALLOWANCE CONTROLLER */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      Refill Base Limit Console
                    </h3>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded font-mono uppercase">
                      Admin
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/70">
                      <p className="text-[9px] text-slate-400 block uppercase font-mono font-bold leading-normal">Initial Monthly Envelope:</p>
                      <p className="text-base font-black text-slate-850 font-mono mt-0.5">
                        {allowanceAmount.toLocaleString()} Birr
                      </p>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1 leading-relaxed italic">
                        "{activeAllowanceItem?.notes || 'Monthly base house cash refills logs'}"
                      </p>
                    </div>

                    {currentUser.role !== 'sister' ? (
                      <div>
                        {!showAllowanceForm ? (
                          <button
                            onClick={() => {
                              setAllowAmount(String(allowanceAmount));
                              setShowAllowanceForm(true);
                            }}
                            className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-lg text-xs font-bold font-mono uppercase cursor-pointer"
                          >
                            ⚙️ Adjust Base Birr Limit
                          </button>
                        ) : (
                          <form onSubmit={handleSetAllowance} className="mt-2 space-y-3 bg-slate-50 p-3 rounded-xl border text-slate-800">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Envelope Birr sum</label>
                              <input
                                type="number"
                                required
                                value={allowAmount}
                                onChange={(e) => setAllowAmount(e.target.value)}
                                className="w-full text-slate-805 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Notes / target</label>
                              <input
                                type="text"
                                value={allowNotes}
                                onChange={(e) => setAllowNotes(e.target.value)}
                                placeholder="E.g. Refill grocery envelope"
                                className="w-full text-slate-805 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-2 justify-end pt-1 text-xs">
                              <button
                                type="button"
                                onClick={() => setShowAllowanceForm(false)}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-3 py-1 bg-emerald-650 text-white font-bold rounded"
                              >
                                Commit
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] bg-blue-50/50 border border-blue-105 text-blue-800 p-2.5 rounded-lg leading-normal">
                        👱‍♀️ <strong>Sister Alem Mode:</strong> You are the manager of the house operations. Ask Father or Brother to top-off money or modify the limit in their accounts.
                      </div>
                    )}
                  </div>
                </div>

                {/* OVERALL SPENDING BREAKDOWN CHARTS */}
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center gap-1.5 px-1 uppercase tracking-widest font-mono font-bold text-slate-400 text-[10px]">
                    <span className="w-1.5 h-3 bg-blue-500 rounded"></span>
                    <span>Spending Breakdown Categories</span>
                  </div>
                  <SpendingCharts expenses={expenses} allowance={activeAllowanceItem} />
                </div>

                {/* FAMILY GENERAL DISCUSSION COMPONENT BOARD */}
                <CommentsBoard
                  comments={comments}
                  currentUser={currentUser}
                  onPostComment={handleAddGeneralComment}
                />

                {/* LIVE DOCK NOTIFICATION SYSTEM */}
                <NotificationsPanel
                  notifications={notifications}
                  currentUser={currentUser}
                  onMarkAsRead={handleMarkNotificationRead}
                  onClearAll={handleClearNotifications}
                />

              </div>

            </div>
          </div>
          )}

        </div>

        {/* BOTTOM APPLICATION FOOTER BAR */}
        <footer className="bg-white border-t border-slate-200 h-10 px-6 select-none hidden md:flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0">
          <div>
            AlemFund Ledger ETB • Dynamic Role-Based Multiuser Registry
          </div>
          <div className="font-bold text-slate-500 hidden sm:block">
            Secure Cryptographic JWT State • Local Persistent DB Storage
          </div>
        </footer>

        {/* MOBILE BOTTOM NAVIGATION TAB BAR */}
        <div className="md:hidden bg-white border-t border-slate-200 py-3.5 px-4 flex items-center justify-around z-20 shrink-0 select-none shadow-[0_-4px_12px_rgba(0,0,0,0.05)] w-full">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all text-center min-w-[60px] cursor-pointer ${
              activeTab === 'dashboard' ? 'text-blue-650 font-black scale-105' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold tracking-tight uppercase mt-0.5">Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-1 transition-all text-center min-w-[60px] cursor-pointer ${
              activeTab === 'calendar' ? 'text-blue-650 font-black scale-105' : 'text-slate-400'
            }`}
          >
            <Calendar className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold tracking-tight uppercase mt-0.5">Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative flex flex-col items-center gap-1 transition-all text-center min-w-[60px] cursor-pointer ${
              activeTab === 'notifications' ? 'text-blue-650 font-black scale-105' : 'text-slate-400'
            }`}
          >
            <Bell className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold tracking-tight uppercase mt-0.5">Alerts</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 right-2.5 bg-rose-600 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* COMPACT MODAL: EXPENDITURE DAILY SAVER */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-sm w-full shadow-xl space-y-4 animate-fade-in text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                Log New Household Spent
              </h3>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1 rounded-md border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-medium text-slate-600">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full text-slate-800 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Spent By (Name)</label>
                <select
                  value={expCreatedByName}
                  onChange={(e) => setExpCreatedByName(e.target.value)}
                  className="w-full bg-white text-slate-800 text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 font-bold"
                >
                  {allUsers.map((user) => (
                    <option key={user.uid} value={user.displayName}>
                      {user.displayName} (Role: {user.role === 'sister' ? 'Sister' : 'Relative'})
                    </option>
                  ))}
                  <option value="Alem (Sister & Administrator)">Alem (Sister & Administrator)</option>
                  <option value="Abebe (Father & Provider)">Abebe (Father & Provider)</option>
                  <option value="Yeabsra (Brother / Software Engineer)">Yeabsra (Brother / Software Engineer)</option>
                  <option value="Custom Group/Guest">Custom Group/Guest</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Name of Product Spent</label>
                <input
                  type="text"
                  value={expProductName}
                  onChange={(e) => setExpProductName(e.target.value)}
                  placeholder="e.g. Teff Spice, Gas Cylinder, Onions"
                  className="w-full text-slate-800 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Spent Item Explanation</label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g. Merkato Groceries, Teff spices..."
                  className="w-full text-slate-800 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tag</label>
                  <select
                    value={expCat}
                    onChange={(e) => setExpCat(e.target.value)}
                    className="w-full text-slate-800 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="groceries">Groceries</option>
                    <option value="utility">Utility</option>
                    <option value="transport">Transport</option>
                    <option value="emergency">Emergency</option>
                    <option value="rent">Rent</option>
                    <option value="others">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Birr sum</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="In Birr"
                    className="w-full text-slate-800 text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition select-none shadow hover:shadow-md cursor-pointer text-center"
              >
                Log Cost Log
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING ETHIOPIAN HOUSEHOLD FINANCE CHATBOT */}
      <FinanceChatBot
        expenses={expensesThisMonth}
        fundings={fundingsThisMonth}
        comments={comments}
        notifications={notifications}
        currentAllowance={allowanceAmount}
      />

    </div>
  );
}
