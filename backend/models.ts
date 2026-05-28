import mongoose, { Schema } from 'mongoose';

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

const userSchema = new Schema<UserRecord>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ['sister', 'user', 'admin'] },
    passwordHash: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  {
    versionKey: false,
  }
);

const expenseSchema = new Schema<ExpenseRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    productName: { type: String, default: undefined },
    category: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    createdAt: { type: String, required: true, index: true },
    createdBy: { type: String, required: true, index: true },
    createdByName: { type: String, default: undefined },
  },
  {
    versionKey: false,
  }
);

const allowanceSchema = new Schema<AllowanceRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true, unique: true, index: true },
    notes: { type: String, default: undefined },
    createdAt: { type: String, required: true, index: true },
    createdBy: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  }
);

const commentSchema = new Schema<CommentRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ['comment', 'request', 'contribution'] },
    text: { type: String, required: true, trim: true },
    expenseId: { type: String, default: undefined },
    date: { type: String, default: undefined, index: true },
    authorName: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true, index: true },
    createdAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  }
);

const fundingSchema = new Schema<FundingRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    source: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
    notes: { type: String, default: undefined },
    screenshot: { type: String, default: undefined },
    createdAt: { type: String, required: true, index: true },
    createdBy: { type: String, required: true, index: true },
    createdByName: { type: String, default: undefined },
  },
  {
    versionKey: false,
  }
);

const notificationSchema = new Schema<NotificationRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    text: { type: String, required: true, trim: true },
    recipientRole: { type: String, required: true, enum: ['sister', 'user', 'admin', 'all'] },
    readBy: { type: [String], default: [] },
    createdAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  }
);

export const UserModel = (mongoose.models.UserRecord as mongoose.Model<UserRecord>) || mongoose.model<UserRecord>('UserRecord', userSchema);
export const ExpenseModel = (mongoose.models.ExpenseRecord as mongoose.Model<ExpenseRecord>) || mongoose.model<ExpenseRecord>('ExpenseRecord', expenseSchema);
export const AllowanceModel = (mongoose.models.AllowanceRecord as mongoose.Model<AllowanceRecord>) || mongoose.model<AllowanceRecord>('AllowanceRecord', allowanceSchema);
export const CommentModel = (mongoose.models.CommentRecord as mongoose.Model<CommentRecord>) || mongoose.model<CommentRecord>('CommentRecord', commentSchema);
export const FundingModel = (mongoose.models.FundingRecord as mongoose.Model<FundingRecord>) || mongoose.model<FundingRecord>('FundingRecord', fundingSchema);
export const NotificationModel = (mongoose.models.NotificationRecord as mongoose.Model<NotificationRecord>) || mongoose.model<NotificationRecord>('NotificationRecord', notificationSchema);
