export type UserRole = 'sister' | 'user' | 'admin';

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  description: string;
  productName?: string;
  category: string;
  date: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export interface AllowanceRecord {
  id: string;
  amount: number;
  month: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface CommentRecord {
  id: string;
  type: 'comment' | 'request' | 'contribution';
  text: string;
  expenseId?: string;
  date?: string;
  authorName: string;
  createdBy: string;
  createdAt: string;
}

export interface FundingRecord {
  id: string;
  amount: number;
  source: string;
  date: string;
  notes?: string;
  screenshot?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export interface NotificationRecord {
  id: string;
  text: string;
  recipientRole: UserRole | 'all';
  readBy: string[];
  createdAt: string;
}

export type AuthPayload = {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
};
