import React, { useState, useMemo, useRef } from 'react';
import { Expense, Funding, Comment, FamilyUser } from '../types';
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  MessageSquare, 
  Coins, 
  Image as ImageIcon, 
  Upload, 
  Eye, 
  AlertCircle, 
  Check, 
  CornerDownRight, 
  User, 
  Tag 
} from 'lucide-react';

interface DayDetailsViewProps {
  dateString: string;
  currentUser: FamilyUser | null;
  expenses: Expense[];
  fundings: Funding[];
  comments: Comment[];
  allUsers: FamilyUser[];
  onAddExpense: (desc: string, amount: number, category: string, date: string, customCreatedByName?: string, productName?: string) => void;
  onDeleteExpense: (id: string) => void;
  onAddFunding: (amount: number, source: string, notes: string, screenshot: string | undefined, date: string) => void;
  onAddComment: (text: string, type: 'comment' | 'request' | 'contribution', date: string) => void;
  onBack: () => void;
}

export default function DayDetailsView({
  dateString,
  currentUser,
  expenses,
  fundings,
  comments,
  allUsers,
  onAddExpense,
  onDeleteExpense,
  onAddFunding,
  onAddComment,
  onBack
}: DayDetailsViewProps) {
  // Local active sub-tab for the right sidebar (Inflows vs Day Chat)
  const [rightActiveSubTab, setRightActiveSubTab] = useState<'funding' | 'chat'>('funding');

  // Input states for Add Expense form
  const [amount, setAmount] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('groceries');
  const [createdByName, setCreatedByName] = useState(currentUser?.displayName || '');

  // Input states for Add Inflow form
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingSource, setFundingSource] = useState('');
  const [fundingNotes, setFundingNotes] = useState('');
  const [fundingScreenshot, setFundingScreenshot] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input states for live day comments
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'request'>('comment');

  // Receipt light box modal state
  const [receiptLightbox, setReceiptLightbox] = useState<string | null>(null);

  const canManage = currentUser?.role === 'sister';

  // Filters for targeted records
  const dayExpenses = useMemo(() => {
    return expenses.filter(e => e.date === dateString);
  }, [expenses, dateString]);

  const dayFundings = useMemo(() => {
    return fundings.filter(f => f.date === dateString);
  }, [fundings, dateString]);

  const dayComments = useMemo(() => {
    return comments.filter(c => c.date === dateString);
  }, [comments, dateString]);

  // Aggregate metrics
  const totalSpent = useMemo(() => {
    return dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [dayExpenses]);

  const totalInflows = useMemo(() => {
    return dayFundings.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [dayFundings]);

  const netBalance = useMemo(() => {
    return totalInflows - totalSpent;
  }, [totalInflows, totalSpent]);

  // Form Submissions
  const handleAddNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const amountNum = Number(amount);
    if (!description.trim() || isNaN(amountNum) || amountNum <= 0) return;

    onAddExpense(
      description.trim(),
      amountNum,
      category,
      dateString,
      createdByName || currentUser?.displayName,
      productName.trim() || undefined
    );

    // Reset Form
    setAmount('');
    setProductName('');
    setDescription('');
    setCategory('groceries');
  };

  const handleAddNewFunding = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(fundingAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const resolvedSource = fundingSource.trim() || currentUser?.displayName || 'Family Contributor';
    onAddFunding(amountNum, resolvedSource, fundingNotes.trim(), fundingScreenshot, dateString);

    // Reset Form
    setFundingAmount('');
    setFundingSource('');
    setFundingNotes('');
    setFundingScreenshot(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddNewComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onAddComment(commentText.trim(), commentType, dateString);
    setCommentText('');
  };

  // Convert uploaded image to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFundingScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const autoLoadMockReceipt = () => {
    const mockReceiptUrl = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=400&auto=format&fit=crop";
    setFundingScreenshot(mockReceiptUrl);
  };

  return (
    <div className="px-6 pb-8 max-w-6xl mx-auto w-full space-y-6 animate-fade-in text-slate-800">
      
      {/* HEADER BAR AND NAVIGATION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-205 shadow-3xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 transition-all cursor-pointer flex items-center justify-center"
            title="Return to calendar heatmap view"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              📅 Ledger Details for {dateString}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Detailed single-day financial breakdown, list of item costs, and reference top-offs
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-widest font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
            SIMULATED DAY LEDGER
          </span>
        </div>
      </div>

      {/* METRIC RIBBON */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TOTAL SPENT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono font-black tracking-wider block">
              Total Outflows Spent
            </span>
            <span className="text-2xl font-black text-rose-650 font-mono block mt-1.5">
              -{totalSpent.toLocaleString()} <span className="text-xs font-normal">Birr</span>
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* TOTAL INFLOWS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono font-black tracking-wider block">
              Deposits & Top-offs Added
            </span>
            <span className="text-2xl font-black text-emerald-650 font-mono block mt-1.5">
              +{totalInflows.toLocaleString()} <span className="text-xs font-normal">Birr</span>
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Plus className="w-6 h-6" />
          </div>
        </div>

        {/* DAY NET CASH */}
        <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono font-black tracking-wider block">
              Day Financial Balance
            </span>
            <span className={`text-2xl font-black font-mono block mt-1.5 ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()} <span className="text-xs font-normal">Birr</span>
            </span>
          </div>
          <div className={`p-3.5 rounded-xl shrink-0 ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* THREE INTERACTIVE COLUMN SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (7 UNITS): ITEMIZED COST LISTING + ADD EXPENSE */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* ITEM COST LISTING */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3.5">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Itemized Operating Costs ({dayExpenses.length})
                </h2>
                <p className="text-[11px] text-slate-400">All purchased items or paid bills registered on this day</p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-150">
                TOTAL: {totalSpent.toLocaleString()} Br
              </span>
            </div>

            {/* LIST OF COSTS */}
            <div className="space-y-3">
              {dayExpenses.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 italic text-sm">
                  🌾 No household expenses logged for this date.
                </div>
              ) : (
                dayExpenses.map((exp) => (
                  <div 
                    key={exp.id} 
                    className="p-4 border border-slate-200 rounded-xl bg-slate-50/20 hover:bg-slate-50 hover:shadow-3xs transition-all flex justify-between items-center gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-sm truncate block capitalize">
                          {exp.productName ? exp.productName : exp.description}
                        </span>
                        <span className="text-[9px] uppercase font-mono font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-105 shrink-0">
                          {exp.category}
                        </span>
                      </div>
                      
                      {exp.productName && (
                        <p className="text-xs text-slate-550 font-sans mt-1">
                          Explanation: <span className="text-slate-700 italic">{exp.description}</span>
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-300" />
                          <span>By: <span className="font-bold text-slate-600">{exp.createdByName || 'Alem (Sister)'}</span></span>
                        </div>
                        <span>•</span>
                        <span>Logged: {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right leading-none">
                        <span className="font-mono text-sm font-black text-slate-850 block">
                          {exp.amount.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block mt-1">Birr</span>
                      </div>

                      {canManage && (
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-2 border border-slate-205 text-slate-450 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-105 rounded-lg transition-all cursor-pointer"
                          title="Delete this expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SISTER EXCLUSIVE LOG FORM */}
          {currentUser && currentUser.role === 'sister' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="border-b pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Register New Expended Cash
                  </h2>
                  <p className="text-[11px] text-slate-450 mt-0.5">Quickly add customized spending ledger details for this date</p>
                </div>
                <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-55 border border-rose-100 rounded p-1 px-2">
                  Admin Sister Authorization
                </span>
              </div>

              <form onSubmit={handleAddNewExpense} className="space-y-4 text-xs font-bold text-slate-600">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Spent Amount (Birr) *</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 1750"
                      className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Budget Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="groceries">Groceries 🥦</option>
                      <option value="utility">Utility ⚡</option>
                      <option value="transport">Transport 🚌</option>
                      <option value="emergency">Emergency 🚨</option>
                      <option value="healthcare">Healthcare 🩺</option>
                      <option value="rent">Rent 🏠</option>
                      <option value="others">Others 🛒</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Purchased Product Name</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Teff Spice, Gas Refill, Onions"
                      className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Purchased By Spender</label>
                    <select
                      value={createdByName}
                      onChange={(e) => setCreatedByName(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                    >
                      {allUsers.map((user) => (
                        <option key={user.uid} value={user.displayName}>
                          {user.displayName} ({user.role === 'sister' ? 'Sister' : 'Relative'})
                        </option>
                      ))}
                      <option value="Alem (Sister & Administrator)">Alem (Sister & Administrator)</option>
                      <option value="Abebe (Father & Provider)">Abebe (Father & Provider)</option>
                      <option value="Yeabsra (Brother / Software Engineer)">Yeabsra (Brother / Software Engineer)</option>
                      <option value="Custom Group/Guest">Custom Group/Guest</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Item Purchase Explanation *</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Purchased 25kg Teff and cooking spices for upcoming month"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-bold transition duration-150 shadow-sm cursor-pointer"
                >
                  Confirm & Sync Ledger Item Cost
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-900 text-xs leading-relaxed select-none">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-950 uppercase text-[10px] tracking-wider mb-0.5">Budget Lock Registry</p>
                As a standard Relative, you have read-only access to item costs on this daily log sheet. Only Sister Alem can register or delete cash expenses to preserve budget fidelity.
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (5 UNITS) - INTEGRATED INFLOWS & LIVE DAY CHAT DISCUSSION */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* TAB HEADERS FOR SIDEBAR ACTIONS */}
          <div className="bg-slate-200/50 p-1 rounded-xl grid grid-cols-2 text-center select-none shadow-3xs border border-slate-200">
            <button
              onClick={() => setRightActiveSubTab('funding')}
              className={`py-2 px-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                rightActiveSubTab === 'funding'
                  ? 'bg-white text-slate-800 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>Deposits & Inflows ({dayFundings.length})</span>
            </button>
            <button
              onClick={() => setRightActiveSubTab('chat')}
              className={`py-2 px-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                rightActiveSubTab === 'chat'
                  ? 'bg-white text-slate-800 shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Day Discussion ({dayComments.length})</span>
            </button>
          </div>

          {/* TAB CONTENT A: DEPOSITS & INFLOW PROVIDERS */}
          {rightActiveSubTab === 'funding' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 animate-fade-in">
              <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest block border-b pb-2">
                Deposit Streams logged this date
              </h3>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {dayFundings.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 italic text-[11px] text-slate-450">
                    No top-offs or financial receipts registered on this date yet.
                  </div>
                ) : (
                  dayFundings.map((fund) => (
                    <div 
                      key={fund.id} 
                      className="p-3 border border-emerald-100 rounded-xl bg-emerald-50/20 flex justify-between items-center gap-3 hover:bg-emerald-55/35 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 text-xs truncate block capitalize leading-tight">
                          {fund.notes || 'Inflow Stream top-off'}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-mono leading-none font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Source: {fund.source}
                          </span>
                          {fund.screenshot && (
                            <button
                              type="button"
                              onClick={() => setReceiptLightbox(fund.screenshot || null)}
                              className="text-[9px] text-blue-600 hover:underline font-bold flex items-center gap-0.5 bg-white px-1.5 py-0.2 rounded border border-blue-100"
                            >
                              <Eye className="w-2.5 h-2.5" /> View Receipt
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right leading-none">
                        <span className="font-mono text-xs font-black text-emerald-700">
                          +{fund.amount.toLocaleString()}
                        </span>
                        <span className="text-[8px] font-mono text-emerald-600 block mt-0.5">Birr</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* REGISTER MONEY INPUT INPUT FLOW */}
              <div className="border-t border-slate-100 pt-4 space-y-3.5">
                <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                  Add New Money Top-off & Receipt Proof
                </h4>

                <form onSubmit={handleAddNewFunding} className="space-y-3 text-xs font-medium text-slate-650">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Funding Amount (Br) *</label>
                      <input
                        type="number"
                        required
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full bg-slate-50 text-slate-800 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Source / Channel *</label>
                      <input
                        type="text"
                        required
                        value={fundingSource}
                        onChange={(e) => setFundingSource(e.target.value)}
                        placeholder="e.g. CBE Transfer"
                        className="w-full bg-slate-50 text-slate-800 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Source Reference Notes *</label>
                    <input
                      type="text"
                      required
                      value={fundingNotes}
                      onChange={(e) => setFundingNotes(e.target.value)}
                      placeholder="e.g. Abebe CBE transfer to Alem for supplies"
                      className="w-full bg-slate-50 text-slate-800 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  {/* Screenshot Attach */}
                  <div className="border border-dashed border-slate-200 p-3 rounded-xl bg-slate-50/20 text-center space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-slate-600 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Upload Transfer receipt
                      </span>
                      {!fundingScreenshot && (
                        <button
                          type="button"
                          onClick={autoLoadMockReceipt}
                          className="text-[9px] bg-blue-50 border border-blue-105 text-blue-700 font-bold p-0.5 px-2 rounded hover:bg-blue-100"
                        >
                          Fill Mock Receipt Pic
                        </button>
                      )}
                    </div>

                    {fundingScreenshot ? (
                      <div className="relative rounded overflow-hidden h-16 bg-slate-100 flex items-center justify-center border border-slate-200">
                        <img 
                          src={fundingScreenshot} 
                          alt="Screenshot" 
                          className="h-full object-cover rounded shadow"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setFundingScreenshot(undefined)}
                          className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full leading-none shadow hover:bg-rose-700 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center py-2.5 border border-dashed border-slate-250 bg-white hover:bg-slate-50 rounded-lg cursor-pointer transition">
                        <Upload className="w-4 h-4 text-slate-400 mb-0.5" />
                        <span className="text-[10px] text-slate-500 font-bold">Select Receipt JPG/PNG</span>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    🚀 Log Deposit + Verify Proof
                  </button>
                </form>
              </div>

            </div>
          ) : (
            /* TAB CONTENT B: DISCUSSION CHAT BOARD PINNED IN THIS SINGLE DAY SHEET */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 animate-fade-in flex flex-col justify-between">
              
              <div>
                <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest block border-b pb-2">
                  Live chat targeting {dateString}
                </h3>

                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 mt-3">
                  {dayComments.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-[11px] text-slate-400 italic">
                      No comments or cost inquiries logged for this day yet. Ask about specific bills or purchases!
                    </div>
                  ) : (
                    dayComments.map((com) => (
                      <div 
                        key={com.id} 
                        className={`p-3 border rounded-xl space-y-1 ${
                          com.type === 'request'
                            ? 'bg-rose-50/20 border-rose-100'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-extrabold text-[11px] text-slate-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                            {com.authorName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-650 font-sans leading-normal">
                          {com.text}
                        </p>
                        {com.type === 'request' && (
                          <div className="flex items-center gap-1.5 text-[9px] text-rose-700 font-black uppercase tracking-tight bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 w-max mt-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Cost Inquiry Pin
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ADD COMMENT INPUT ROUTE */}
              <div className="border-t border-slate-100 pt-4 mt-1.5">
                <span className="text-[10px] font-black text-slate-450 uppercase block mb-2">
                  Post Day Inquiry or Note
                </span>

                <form onSubmit={handleAddNewComment} className="space-y-2.5">
                  <div className="flex gap-1.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200 select-none">
                    <button
                      type="button"
                      onClick={() => setCommentType('comment')}
                      className={`flex-1 py-1 text-[9px] font-black rounded uppercase cursor-pointer ${
                        commentType === 'comment'
                          ? 'bg-slate-800 text-white shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      💬 Standard Commentary
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentType('request')}
                      className={`flex-1 py-1 text-[9px] font-black rounded uppercase cursor-pointer ${
                        commentType === 'request'
                          ? 'bg-rose-600 text-white shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      🛑 Question Cost Bill
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write message..."
                      className="flex-1 bg-slate-50 text-slate-800 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* --- LIGHTBOX MODAL --- */}
      {receiptLightbox && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="relative bg-white rounded-2xl overflow-hidden max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" /> Reference Receipt Image proof
              </h3>
              <button
                onClick={() => setReceiptLightbox(null)}
                className="text-xs font-black uppercase text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
              >
                Close ×
              </button>
            </div>

            <div className="max-h-[350px] overflow-hidden flex items-center justify-center bg-slate-100 rounded-lg border p-1">
              <img 
                src={receiptLightbox} 
                alt="Uploaded Payment Statement" 
                className="max-h-full max-w-full object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <p className="text-[10px] text-slate-400 text-center font-mono">
              Authorized digitally verify ref: CBE_REF_{Math.random().toString(36).substring(3, 9).toUpperCase()}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
