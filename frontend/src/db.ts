import { FamilyUser, Expense, Allowance, Comment, Notification, Funding } from './types';

// Global default simulated users and records for offline/local storage preview
const DEFAULT_SIM_USERS: FamilyUser[] = [
  {
    uid: 'sister_sys',
    email: 'sister@family.com',
    displayName: 'Alem (Sister & Administrator)',
    role: 'sister',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'father_sys',
    email: 'father@family.com',
    displayName: 'Abebe (Father & Provider)',
    role: 'user', // Father is viewed as a regular visual viewer with commenting rights
    createdAt: new Date().toISOString()
  },
  {
    uid: 'son_sys',
    email: 'brother@family.com',
    displayName: 'Yeabsra (Brother / Software Engineer)',
    role: 'user',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_SIM_ALLOWANCES: Allowance[] = [];

const DEFAULT_SIM_EXPENSES: Expense[] = [];

const DEFAULT_SIM_COMMENTS: Comment[] = [];

const DEFAULT_SIM_NOTIFICATIONS: Notification[] = [];

const DEFAULT_SIM_FUNDINGS: Funding[] = [];

// Helper to keep/read data locally in the browser
function syncLocalData<T>(key: string, defaultVal: T[]): T[] {
  const existing = localStorage.getItem(key);
  if (!existing) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(existing);
  } catch (e) {
    return defaultVal;
  }
}

export const FamilyLocalStorage = {
  getUsers: () => syncLocalData<FamilyUser>('fam_users', DEFAULT_SIM_USERS),
  getExpenses: () => syncLocalData<Expense>('fam_expenses', DEFAULT_SIM_EXPENSES),
  getAllowances: () => syncLocalData<Allowance>('fam_allowances', DEFAULT_SIM_ALLOWANCES),
  getComments: () => syncLocalData<Comment>('fam_comments', DEFAULT_SIM_COMMENTS),
  getNotifications: () => syncLocalData<Notification>('fam_notifications', DEFAULT_SIM_NOTIFICATIONS),
  getFundings: () => syncLocalData<Funding>('fam_fundings', DEFAULT_SIM_FUNDINGS),

  saveUsers: (data: FamilyUser[]) => localStorage.setItem('fam_users', JSON.stringify(data)),
  saveExpenses: (data: Expense[]) => localStorage.setItem('fam_expenses', JSON.stringify(data)),
  saveAllowances: (data: Allowance[]) => localStorage.setItem('fam_allowances', JSON.stringify(data)),
  saveComments: (data: Comment[]) => localStorage.setItem('fam_comments', JSON.stringify(data)),
  saveNotifications: (data: Notification[]) => localStorage.setItem('fam_notifications', JSON.stringify(data)),
  saveFundings: (data: Funding[]) => localStorage.setItem('fam_fundings', JSON.stringify(data)),

  resetDatabase: () => {
    localStorage.setItem('fam_users', JSON.stringify(DEFAULT_SIM_USERS));
    localStorage.setItem('fam_expenses', JSON.stringify(DEFAULT_SIM_EXPENSES));
    localStorage.setItem('fam_allowances', JSON.stringify(DEFAULT_SIM_ALLOWANCES));
    localStorage.setItem('fam_comments', JSON.stringify(DEFAULT_SIM_COMMENTS));
    localStorage.setItem('fam_notifications', JSON.stringify(DEFAULT_SIM_NOTIFICATIONS));
    localStorage.setItem('fam_fundings', JSON.stringify(DEFAULT_SIM_FUNDINGS));
  }
};
