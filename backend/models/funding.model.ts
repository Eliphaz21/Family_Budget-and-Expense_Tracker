import mongoose, { Schema } from 'mongoose';
import type { FundingRecord } from '../types/domain';

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
  { versionKey: false }
);

export const FundingModel = (mongoose.models.FundingRecord as mongoose.Model<FundingRecord>) || mongoose.model<FundingRecord>('FundingRecord', fundingSchema);
