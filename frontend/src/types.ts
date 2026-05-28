export type UserRole = 'sister' | 'user' | 'admin';

export interface FamilyUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number; // in Birr
  description: string;
  productName?: string; // name of the product/item spent on
  category: string; // groceries, utility, transport, emergency, healthcare, rent, others
  date: string; // YYYY-MM-DD
  createdAt: string;
  createdBy: string; // User ID
  createdByName?: string;
}

export interface Allowance {
  id: string;
  amount: number; // in Birr
  month: string; // YYYY-MM
  notes?: string;
  createdAt: string;
  createdBy: string; // User ID (father or admin)
}

export interface Comment {
  id: string;
  type: 'comment' | 'request' | 'contribution';
  text: string;
  expenseId?: string; // Optional if linked to a specific cost
  date?: string; // Optional if pinned or commented on a specific calendar day (YYYY-MM-DD)
  authorName: string;
  createdBy: string; // User ID
  createdAt: string;
}

export interface Funding {
  id: string;
  amount: number; // in Birr
  source: string; // From whom, e.g. "Father Abebe", "Brother Yeabsra"
  date: string; // YYYY-MM-DD
  notes?: string;
  screenshot?: string; // Base64 picture screenshot of transfer
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export interface Notification {
  id: string;
  text: string;
  recipientRole: UserRole | 'all';
  readBy: string[]; // User IDs who read it
  createdAt: string;
}

export interface BudgetStats {
  totalBudgetForMonth: number;
  totalSpentThisMonth: number;
  remainingBudget: number;
  dailySpent: { [date: string]: number };
  weeklySpent: { weekNum: number; dates: string[]; total: number }[];
  categoryTotals: { [category: string]: number };
  highestCategory: string;
  highestCategoryAmount: number;
  percentageSpent: number;
}
