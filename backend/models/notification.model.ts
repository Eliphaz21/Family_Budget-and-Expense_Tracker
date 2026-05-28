import mongoose, { Schema } from 'mongoose';
import type { NotificationRecord } from '../types/domain';

const notificationSchema = new Schema<NotificationRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    text: { type: String, required: true, trim: true },
    recipientRole: { type: String, required: true, enum: ['sister', 'user', 'admin', 'all'] },
    readBy: { type: [String], default: [] },
    createdAt: { type: String, required: true, index: true },
  },
  { versionKey: false }
);

export const NotificationModel = (mongoose.models.NotificationRecord as mongoose.Model<NotificationRecord>) || mongoose.model<NotificationRecord>('NotificationRecord', notificationSchema);
