import mongoose, { Schema } from 'mongoose';
import type { UserRecord } from '../types/domain';

const userSchema = new Schema<UserRecord>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ['sister', 'user', 'admin'] },
    passwordHash: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

export const UserModel = (mongoose.models.UserRecord as mongoose.Model<UserRecord>) || mongoose.model<UserRecord>('UserRecord', userSchema);
