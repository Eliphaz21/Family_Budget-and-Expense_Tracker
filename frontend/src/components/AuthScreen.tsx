import React, { useState } from 'react';
import { Sparkles, Shield, User, Coins, LogIn, UserPlus } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'sister' | 'user'>('user');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { email, password, displayName, role } 
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Autentications failure code returned from server');
      }

      // Success
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setError(err.message || 'Server connection failed. Please restart server.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-configured easy demo entries
  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: demoEmail,
          password: 'password123'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Demo quick entrance failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Quick login process crashed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Dynamic ambient lights in background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl relative z-10 space-y-6">
        
        {/* APP ICON HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600/15 border border-blue-550/30 text-blue-400 rounded-2xl shadow-inner mb-2 animate-pulse">
            <Coins className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight text-white leading-none">
            FamilyFund ETB
          </h1>
          <p className="text-slate-400 text-xs">
            Family Household Money Tracker
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center animate-shake">
            {error}
          </div>
        )}

        {/* AUTH FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
                Full Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="E.g. Sister Alem, Father Abebe"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600 shadow-inner"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E.g. sister@family.com"
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600 shadow-inner"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400">
              Secret Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600 shadow-inner"
            />
          </div>

          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block mb-1">
                Family Household Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('sister')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                    role === 'sister'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  👩 Alem (Sister/Admin)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                    role === 'user'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  👨 User (Relative/Viewer)
                </button>
              </div>
              <span className="text-[9px] text-slate-500 block italic leading-none mt-1 text-center">
                *Sisters have all write & delete operations enabled. Relatives can only view and fund money.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-750 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2"
          >
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Authenticating secure connection...' : isRegister ? 'Register Family Profile' : 'Sign in secure gateway'}
          </button>
        </form>

        {/* SWAP STATE COMPONENT */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
          >
            {isRegister 
              ? 'Already registered? Access secure login' 
              : 'Create new household relative profile'
            }
          </button>
        </div>

        {/* DEMO ACCOUNTS QUICK LOGINS FOOTER */}
        <div className="border-t border-slate-800 pt-5 space-y-3">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-black">
              Simulated Fast Entry Pass
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleQuickLogin('sister@family.com')}
              disabled={loading}
              className="w-full py-2 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-left rounded-xl transition-all cursor-pointer flex items-center gap-2.5 hover:bg-slate-850/50"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-650/40 text-blue-400 font-bold text-xs flex items-center justify-center">👱‍♀️</div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-white block leading-none">Alem (Sister & Administrator)</span>
                <span className="text-[9px] text-slate-550 font-mono block mt-0.5 mt-1 leading-none">Role: sister • Full operations permitted</span>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin('father@family.com')}
              disabled={loading}
              className="w-full py-2 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-left rounded-xl transition-all cursor-pointer flex items-center gap-2.5 hover:bg-slate-850/50"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-650/40 text-emerald-400 font-bold text-xs flex items-center justify-center">👨</div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-white block leading-none">Abebe (Father & Provider)</span>
                <span className="text-[9px] text-slate-550 font-mono block mt-0.5 mt-1 leading-none">Role: user • View & Add Funds + Screenshots</span>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin('brother@family.com')}
              disabled={loading}
              className="w-full py-2 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-left rounded-xl transition-all cursor-pointer flex items-center gap-2.5 hover:bg-slate-850/50"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-650/40 text-indigo-400 font-bold text-xs flex items-center justify-center">👦</div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-white block leading-none">Yeabsra (Brother / Software Developer)</span>
                <span className="text-[9px] text-slate-550 font-mono block mt-1 leading-none">Role: user • View & Comment Logs</span>
              </div>
            </button>
          </div>
          
          <p className="text-[10px] text-slate-600 text-center font-mono">
            Default sandbox entrance code is: <span className="font-bold text-slate-400 bg-slate-900 px-1 py-0.5 rounded">password123</span>
          </p>
        </div>

      </div>
    </div>
  );
}
