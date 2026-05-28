import React, { useState, useRef, useEffect } from 'react';
import { Expense, Funding, Comment, Notification } from '../types';
import { Send, X, MessageSquare, Sparkles, TrendingDown, RefreshCw, Layers } from 'lucide-react';

const chatbotAvatar = new URL('../assets/images/chatbot_avatar_1779966654462.png', import.meta.url).href;

interface FinanceChatBotProps {
  expenses: Expense[];
  fundings: Funding[];
  comments: Comment[];
  notifications: Notification[];
  currentAllowance: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function FinanceChatBot({
  expenses,
  fundings,
  comments,
  notifications,
  currentAllowance
}: FinanceChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      text: "Selam! I am **EthioBudget Bot**, your smart family financial co-pilot. I have scanned the family ledger (expenses, fundings, and comments).\n\nAsk me about **budget status**, **saving tips**, **Merkato groceries recommendations**, or **cost statistics**!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat thread when message list updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    if (!rawText.trim() || loading) return;

    if (!textToSend) {
      setInputText('');
    }

    // Add user message to history
    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Map message history into request payload
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.text
      }));

      const databasePayload = {
        expenses,
        fundings,
        comments,
        notifications,
        currentAllowance
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: rawText,
          history: historyPayload,
          database: databasePayload
        })
      });

      if (!res.ok) {
        throw new Error('Endpoint responded with non-200 state.');
      }

      const data = await res.json();
      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        text: data.response || 'I was unable to retrieve a response. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat bot error:', err);
      const errMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        text: "I'm having trouble connecting to the budget server. Please verify your connection! In the meantime, I am backed up with offline calculations.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Render text containing simple markdown like bold (**text**) and lists lines
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, blockIdx) => {
      // Check if item is list bullet
      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
      const cleanLine = isBullet ? line.replace(/^[-*]\s*/, '') : line;

      // Simple regex parser for bold text (**text**)
      const parts = [];
      let regex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-extrabold text-indigo-950 font-sans">
            {match[1]}
          </strong>
        );
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={blockIdx} className="ml-4 list-disc text-[13.5px] leading-relaxed text-slate-700 mt-1 pl-1">
            <span>{parts.length > 0 ? parts : cleanLine}</span>
          </li>
        );
      }

      return (
        <p key={blockIdx} className="text-[13.5px] leading-relaxed text-slate-700 mb-1.5 break-words">
          {parts.length > 0 ? parts : cleanLine}
        </p>
      );
    });
  };

  return (
    <>
      {/* FLOATING CHAT BOT FLOATING TRIGGER BUTTON (DOWN RIGHT CORNER) */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end">
        
        {/* Pulsing recommendation chip when closed */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="mb-2 bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10.5px] font-black px-3.5 py-1.5 rounded-full shadow-md animate-bounce flex items-center gap-1 cursor-pointer hover:bg-indigo-100 transition whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Ask Alem's Assistant?</span>
          </button>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-1 rounded-full shadow-2xl transition-all duration-300 focus:outline-none flex items-center justify-center cursor-pointer ${
            isOpen 
              ? 'bg-slate-800 hover:scale-95 scale-90 w-14 h-14 sm:w-[72px] sm:h-[72px]' 
              : 'hover:scale-105 active:scale-95 hover:shadow-cyan-150/45 border-3 border-indigo-300 bg-white ring-4 ring-indigo-50/70 w-14 h-14 sm:w-[72px] sm:h-[72px]'
          }`}
          title="EthioBudget Chat Assistant"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <div className="w-full h-full rounded-full overflow-hidden relative">
              <img 
                src={chatbotAvatar} 
                alt="EthioBudget Chatbot" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              {/* Green online badge matching the top-right corner dot */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* CHAT WINDOW WINDOW DIALOG */}
      {isOpen && (
        <div 
          className="fixed bottom-36 md:bottom-28 right-4 left-4 sm:left-auto sm:right-6 z-50 sm:w-[500px] max-w-[calc(100vw-32px)] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-fade-in transition-all h-[540px] sm:h-[640px] max-h-[calc(100vh-160px)] md:max-h-[calc(100vh-140px)]"
          id="finance-chatbot-tray"
        >
          {/* HEADER SECTION */}
          <div className="bg-slate-900 p-4 border-b border-slate-800 text-white flex justify-between items-center select-none shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full border border-slate-700 bg-slate-850 overflow-hidden relative">
                <img 
                  src={chatbotAvatar} 
                  alt="Av" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-black tracking-tight">EthioBudget Bot</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-[9.5px] font-mono text-slate-450 uppercase tracking-widest font-bold block">
                  Active AI Grounding
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close chat window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ACTIVE DATABASE GROUNDING WATERMARK */}
          <div className="bg-indigo-50/50 border-b border-indigo-100 px-4 py-2 flex items-center gap-1.5 text-[9.5px] text-indigo-750 font-bold shrink-0 select-none">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Mapped Live Context • {expenses.length} expenses | {fundings.length} deposits | {currentAllowance.toLocaleString()} Birr</span>
          </div>

          {/* MESSAGE THREAD WINDOW */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/55 scrollbar-thin">
            {messages.map((m) => {
              const isBot = m.role === 'assistant';
              return (
                <div 
                  key={m.id} 
                  className={`flex items-start gap-2 max-w-[85%] ${
                    isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'
                  }`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-205 shrink-0 bg-white shadow-3xs">
                      <img src={chatbotAvatar} alt="Av" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <div className={`p-3 rounded-2xl text-[13.5px] ${
                      isBot 
                        ? 'bg-white border border-slate-200 text-slate-800 shadow-3xs rounded-tl-none font-sans' 
                        : 'bg-indigo-900 border border-indigo-950 text-white shadow-3xs rounded-tr-none'
                    }`}>
                      {renderMessageContent(m.text)}
                    </div>
                    <span className={`text-[8.5px] font-mono text-slate-400 block px-1 mt-0.5 ${!isBot ? 'text-right': ''}`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2 max-w-[80%] animate-pulse">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-405 animate-spin" />
                </div>
                <div className="p-3 bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none text-[11px] font-mono">
                  EthioBudget bot is crunching cost ratios...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* TEMPLATE SUGGESTION CHIPS FOR EASY CLICKS */}
          <div className="p-2 border-t border-slate-100 bg-white flex gap-1.5 overflow-x-auto shrink-0 select-none scrollbar-none">
            <button
              onClick={() => handleSendMessage('Give me a full status report of our pacing details')}
              className="px-3 py-1.5 text-[10px] font-black text-slate-600 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 rounded-full bg-slate-50 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer"
            >
              📊 Status Report
            </button>
            <button
              onClick={() => handleSendMessage('Suggest local Addis Ababa budget tips and saving techniques for Alem')}
              className="px-3 py-1.5 text-[10px] font-black text-slate-600 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 rounded-full bg-slate-50 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer"
            >
              💡 Saving Tips
            </button>
            <button
              onClick={() => handleSendMessage('Calculate current total spending amount, remaining cash, and general stats')}
              className="px-3 py-1.5 text-[10px] font-black text-slate-600 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 rounded-full bg-slate-50 hover:bg-slate-155 transition whitespace-nowrap cursor-pointer"
            >
              💵 Spend Stats
            </button>
          </div>

          {/* INPUT FORM */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-150 bg-white flex gap-2 items-center shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me for statistics or reminders..."
              disabled={loading}
              className="flex-1 bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 font-sans border-none focus:ring-1.5 focus:ring-indigo-500 text-xs md:text-[13px] px-3.5 py-3 rounded-xl transition"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-3 bg-indigo-900 hover:bg-indigo-950 disabled:bg-slate-100 disabled:text-slate-350 text-white rounded-xl transition cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
