import mongoose, { Schema } from 'mongoose';
import type { ExpenseRecord } from '../types/domain';

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
  { versionKey: false }
);

export const ExpenseModel = (mongoose.models.ExpenseRecord as mongoose.Model<ExpenseRecord>) || mongoose.model<ExpenseRecord>('ExpenseRecord', expenseSchema);
