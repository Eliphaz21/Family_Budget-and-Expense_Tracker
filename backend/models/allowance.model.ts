import mongoose, { Schema } from 'mongoose';
import type { AllowanceRecord } from '../types/domain';

const allowanceSchema = new Schema<AllowanceRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true, unique: true, index: true },
    notes: { type: String, default: undefined },
    createdAt: { type: String, required: true, index: true },
    createdBy: { type: String, required: true, index: true },
  },
  { versionKey: false }
);

export const AllowanceModel = (mongoose.models.AllowanceRecord as mongoose.Model<AllowanceRecord>) || mongoose.model<AllowanceRecord>('AllowanceRecord', allowanceSchema);
