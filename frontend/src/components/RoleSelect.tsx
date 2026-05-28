import React, { useState } from 'react';
import { FamilyUser, UserRole } from '../types';
import { User, Shield, Briefcase, Plus, Check } from 'lucide-react';

interface RoleSelectProps {
  onSelectUser: (user: FamilyUser) => void;
  currentUser: FamilyUser | null;
  allUsers: FamilyUser[];
  onAddUser: (user: FamilyUser) => void;
}

export default function RoleSelect({ onSelectUser, currentUser, allUsers, onAddUser }: RoleSelectProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newUser: FamilyUser = {
      uid: 'user_' + Date.now(),
      email: newEmail.trim().toLowerCase(),
      displayName: newName.trim(),
      role: newRole,
      createdAt: new Date().toISOString(),
    };

    onAddUser(newUser);
    onSelectUser(newUser);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'sister':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'admin':
        return 'bg-red-50 text-red-750 border-red-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'sister':
        return 'Sister & House Administrator';
      case 'admin':
        return 'System Admin';
      default:
        return 'Family Member (Viewer)';
    }
  };

  return (
    <div className="w-full space-y-4 text-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Active Household Profile Switcher</h2>
          <p className="text-[11px] text-slate-400">Click a user card below to swap access levels instantly</p>
        </div>
        
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-750 transition-all cursor-pointer bg-blue-50 px-2.5 py-1 rounded border border-blue-100"
          >
            <Plus className="w-3 h-3" /> Add Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {allUsers.map((u) => {
          const isSelected = currentUser?.uid === u.uid;
          return (
            <button
              key={u.uid}
              onClick={() => onSelectUser(u)}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all relative cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`p-1.5 rounded shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {u.role === 'sister' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-800 text-xs truncate block">
                  {u.displayName}
                </span>
                <span className={`text-[9px] font-bold mt-0.5 inline-block ${getRoleBadgeColor(u.role)}`}>
                  {getRoleLabel(u.role)}
                </span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white p-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/80 space-y-3 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase">New Family Member</h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 text-[10px] font-bold"
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sister, Brother"
                className="w-full text-slate-800 text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Email / Handle</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@family.com"
                className="w-full text-slate-800 text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Role Permission</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full text-slate-800 text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="sister">Sister (Add/Delete Expenses)</option>
                <option value="user">Family Member (Viewer Only)</option>
                <option value="admin">System Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-slate-500 hover:bg-slate-150 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
