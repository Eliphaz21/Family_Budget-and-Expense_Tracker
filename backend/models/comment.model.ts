import mongoose, { Schema } from 'mongoose';
import type { CommentRecord } from '../types/domain';

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
  { versionKey: false }
);

export const CommentModel = (mongoose.models.CommentRecord as mongoose.Model<CommentRecord>) || mongoose.model<CommentRecord>('CommentRecord', commentSchema);
