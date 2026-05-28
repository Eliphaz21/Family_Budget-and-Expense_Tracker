import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserModel } from '../models/index';
import type { UserRecord } from '../types/domain';

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to .env before starting the backend.');
  }

  return uri;
}

function getMongoDbName() {
  return process.env.MONGODB_DB_NAME || 'family_budget_tracker';
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
  }

  await mongoose.connect(getMongoUri(), { dbName: getMongoDbName() });
  return mongoose.connection;
}

export async function seedDefaultUsers() {
  const userCount = await UserModel.countDocuments();
  if (userCount > 0) {
    return;
  }

  const defaultPasswordHash = bcrypt.hashSync('password123', 10);
  const defaultUsers: UserRecord[] = [
    { uid: 'sister_sys', email: 'sister@family.com', displayName: 'Alem (Sister & Administrator)', role: 'sister', passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
    { uid: 'father_sys', email: 'father@family.com', displayName: 'Abebe (Father & Provider)', role: 'user', passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
    { uid: 'son_sys', email: 'brother@family.com', displayName: 'Yeabsra (Brother / Software)', role: 'user', passwordHash: defaultPasswordHash, createdAt: new Date().toISOString() },
  ];

  await UserModel.insertMany(defaultUsers);
}
