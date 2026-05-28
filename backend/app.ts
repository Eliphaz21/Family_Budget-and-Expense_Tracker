import { randomUUID } from 'crypto';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDatabase, seedDefaultUsers } from './db';
import {
  AllowanceModel,
  CommentModel,
  ExpenseModel,
  FundingModel,
  NotificationModel,
  UserModel,
  type UserRecord,
  type UserRole,
} from './models';
import { generateBudgetAnalysis, generateChatReply } from './ai';

type AuthPayload = {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
};

type AuthedRequest = Request & { authUser?: AuthPayload };

const registerSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['sister', 'user']).default('user'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const expenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  productName: z.string().optional(),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdByName: z.string().optional(),
});

const allowanceSchema = z.object({
  amount: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  notes: z.string().optional(),
});

const commentSchema = z.object({
  type: z.enum(['comment', 'request', 'contribution']),
  text: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expenseId: z.string().optional(),
});

const fundingSchema = z.object({
  amount: z.number().positive(),
  source: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  screenshot: z.string().optional(),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing. Add it to .env before starting the backend.');
  }

  return secret;
}

function toPublicUser(user: UserRecord) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function signUserToken(user: UserRecord) {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

function authenticateRequest(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token missing or invalid format.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.authUser = jwt.verify(token, getJwtSecret()) as AuthPayload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token signature validation failed.' });
  }
}

function buildNotification(text: string, recipientRole: UserRole | 'all') {
  return {
    id: `not_${randomUUID()}`,
    text,
    recipientRole,
    readBy: [],
    createdAt: new Date().toISOString(),
  };
}

function buildExpenseAlert(expense: { amount: number; description: string; productName?: string; date: string; createdByName: string }) {
  return buildNotification(
    `⚠️ High Spending Alert! Spent ${expense.amount.toLocaleString()} Birr on "${expense.productName ? `${expense.productName} (${expense.description})` : expense.description}" on ${expense.date} (Logged: ${expense.createdByName}).`,
    'all'
  );
}

function getAllowedOrigins() {
  const originList = process.env.CORS_ORIGIN;
  if (!originList) {
    return true;
  }

  return originList.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function toMonth(dateValue: string) {
  return dateValue.slice(0, 7);
}

function toExpenseStats(expenses: Array<{ amount: number; category: string; date: string }>, allowanceAmount: number) {
  const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const percentageSpent = allowanceAmount > 0 ? (totalSpent / allowanceAmount) * 100 : 0;

  const categoryTotals: Record<string, number> = {};
  const dailySpent: Record<string, number> = {};
  const weeklyBucket = new Map<number, { weekNum: number; dates: string[]; total: number }>();

  expenses.forEach((expense) => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + Number(expense.amount || 0);
    dailySpent[expense.date] = (dailySpent[expense.date] || 0) + Number(expense.amount || 0);

    const date = new Date(`${expense.date}T00:00:00`);
    const weekNum = Math.ceil(date.getDate() / 7);
    const current = weeklyBucket.get(weekNum) || { weekNum, dates: [], total: 0 };
    current.dates.push(expense.date);
    current.total += Number(expense.amount || 0);
    weeklyBucket.set(weekNum, current);
  });

  const weeklySpent = Array.from(weeklyBucket.values()).sort((left, right) => left.weekNum - right.weekNum);
  const categoryEntries = Object.entries(categoryTotals).sort((left, right) => right[1] - left[1]);
  const [highestCategory = 'None', highestCategoryAmount = 0] = categoryEntries[0] || [];

  return {
    totalSpentThisMonth: totalSpent,
    percentageSpent,
    dailySpent,
    weeklySpent,
    categoryTotals,
    highestCategory,
    highestCategoryAmount,
    remainingBudget: Math.max(0, allowanceAmount - totalSpent),
    totalBudgetForMonth: allowanceAmount,
  };
}

async function loadCurrentMonthBudget(month: string) {
  const allowance = await AllowanceModel.findOne({ month }).lean();
  return allowance?.amount || 15000;
}

export async function createBackendApp() {
  await connectDatabase();
  await seedDefaultUsers();

  const app = express();
  app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      mongoReady: true,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      time: new Date().toISOString(),
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const { displayName, email, password, role } = parsed.data;

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const newUser: UserRecord = {
      uid: `user_${Date.now()}`,
      email: email.toLowerCase().trim(),
      displayName: displayName.trim(),
      role,
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString(),
    };

    await UserModel.create(newUser);

    return res.status(201).json({
      token: signUserToken(newUser),
      user: toPublicUser(newUser),
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { email, password } = parsed.data;
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.json({
      token: signUserToken(user.toObject() as UserRecord),
      user: toPublicUser(user.toObject() as UserRecord),
    });
  });

  app.get('/api/auth/me', authenticateRequest, async (req: AuthedRequest, res) => {
    const user = await UserModel.findOne({ uid: req.authUser?.uid }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json(toPublicUser(user));
  });

  app.get('/api/users', authenticateRequest, async (_req, res) => {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();
    return res.json(users.map(toPublicUser));
  });

  app.get('/api/expenses', authenticateRequest, async (req, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const query = month ? { date: new RegExp(`^${month}`) } : {};
    const expenses = await ExpenseModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json(expenses);
  });

  app.post('/api/expenses', authenticateRequest, async (req: AuthedRequest, res) => {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: 'Expense payload is invalid.' });
    }

    const creator = req.authUser;
    const expense = {
      id: `exp_${randomUUID()}`,
      amount: parsed.data.amount,
      description: parsed.data.description.trim(),
      productName: parsed.data.productName?.trim() || undefined,
      category: parsed.data.category.trim(),
      date: parsed.data.date,
      createdAt: new Date().toISOString(),
      createdBy: creator.uid,
      createdByName: parsed.data.createdByName?.trim() || creator.displayName,
    };

    const createdExpense = await ExpenseModel.create(expense);

    if (expense.amount > 3000) {
      await NotificationModel.create(buildExpenseAlert(expense));
    }

    return res.status(201).json(createdExpense);
  });

  app.delete('/api/expenses/:id', authenticateRequest, async (req, res) => {
    const deleted = await ExpenseModel.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    return res.json({ success: true });
  });

  app.get('/api/allowances', authenticateRequest, async (_req, res) => {
    const allowances = await AllowanceModel.find().sort({ month: -1 }).lean();
    return res.json(allowances);
  });

  app.post('/api/allowances', authenticateRequest, async (req: AuthedRequest, res) => {
    const parsed = allowanceSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: 'Allowance payload is invalid.' });
    }

    const allowance = {
      id: `allowance_${randomUUID()}`,
      amount: parsed.data.amount,
      month: parsed.data.month,
      notes: parsed.data.notes?.trim() || `Updated House envelope budget for ${parsed.data.month}.`,
      createdAt: new Date().toISOString(),
      createdBy: req.authUser.uid,
    };

    const updatedAllowance = await AllowanceModel.findOneAndUpdate(
      { month: allowance.month },
      allowance,
      { upsert: true, new: true }
    ).lean();

    await NotificationModel.create(
      buildNotification(`⚙️ Base Monthly House Allowance for ${allowance.month} was set to: ${allowance.amount.toLocaleString()} Birr by ${req.authUser.displayName}.`, 'sister')
    );

    return res.status(201).json(updatedAllowance);
  });

  app.get('/api/comments', authenticateRequest, async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const query = date ? { date } : {};
    const comments = await CommentModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json(comments);
  });

  app.post('/api/comments', authenticateRequest, async (req: AuthedRequest, res) => {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: 'Comment payload is invalid.' });
    }

    const comment = {
      id: `com_${randomUUID()}`,
      type: parsed.data.type,
      text: parsed.data.text.trim(),
      expenseId: parsed.data.expenseId,
      date: parsed.data.date,
      authorName: req.authUser.displayName,
      createdBy: req.authUser.uid,
      createdAt: new Date().toISOString(),
    };

    const createdComment = await CommentModel.create(comment);

    await NotificationModel.create(
      buildNotification(`💬 Pinned Message${comment.date ? ` at ${comment.date}` : ''} by ${req.authUser.displayName}: "${comment.text.length > 40 ? `${comment.text.substring(0, 40)}...` : comment.text}"`, 'all')
    );

    return res.status(201).json(createdComment);
  });

  app.get('/api/fundings', authenticateRequest, async (req, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const query = month ? { date: new RegExp(`^${month}`) } : {};
    const fundings = await FundingModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json(fundings);
  });

  app.post('/api/fundings', authenticateRequest, async (req: AuthedRequest, res) => {
    const parsed = fundingSchema.safeParse(req.body);
    if (!parsed.success || !req.authUser) {
      return res.status(400).json({ error: 'Funding payload is invalid.' });
    }

    const funding = {
      id: `fund_${randomUUID()}`,
      amount: parsed.data.amount,
      source: parsed.data.source.trim(),
      date: parsed.data.date,
      notes: parsed.data.notes?.trim(),
      screenshot: parsed.data.screenshot,
      createdAt: new Date().toISOString(),
      createdBy: req.authUser.uid,
      createdByName: req.authUser.displayName,
    };

    const createdFunding = await FundingModel.create(funding);

    await NotificationModel.create(
      buildNotification(`💸 Money Added: ${req.authUser.displayName} logged ${funding.amount.toLocaleString()} Birr top-off for ${funding.date} (Ref: ${funding.source}).`, 'all')
    );

    return res.status(201).json(createdFunding);
  });

  app.get('/api/notifications', authenticateRequest, async (req: AuthedRequest, res) => {
    const notifications = await NotificationModel.find().sort({ createdAt: -1 }).lean();
    if (!req.authUser) {
      return res.json(notifications);
    }

    const role = req.authUser.role;
    const visibleNotifications = notifications.filter((notification) => notification.recipientRole === 'all' || notification.recipientRole === role);
    return res.json(visibleNotifications);
  });

  app.patch('/api/notifications/:id/read', authenticateRequest, async (req: AuthedRequest, res) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const notification = await NotificationModel.findOne({ id: req.params.id });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (!notification.readBy.includes(req.authUser.uid)) {
      notification.readBy.push(req.authUser.uid);
      await notification.save();
    }

    return res.json(notification);
  });

  app.delete('/api/notifications', authenticateRequest, async (_req, res) => {
    await NotificationModel.deleteMany({});
    return res.json({ success: true });
  });

  app.get('/api/stats', authenticateRequest, async (req, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7);
    const allowanceAmount = await loadCurrentMonthBudget(month);
    const expenses = await ExpenseModel.find({ date: new RegExp(`^${month}`) }).lean();
    const stats = toExpenseStats(expenses, allowanceAmount);

    return res.json(stats);
  });

  app.post('/api/ai/analyze', async (req, res) => {
    const { expenses, allowance, currentMonth } = req.body || {};

    if (!Array.isArray(expenses)) {
      return res.status(400).json({ error: 'Expenses list is required' });
    }

    const report = await generateBudgetAnalysis(expenses, allowance || 15000, currentMonth || 'this month');
    return res.json(report);
  });

  app.post('/api/ai/chat', async (req, res) => {
    const { message, history, database } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const response = await generateChatReply(message, history || [], database || {});
    return res.json({ response });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found.' });
  });

  return app;
}
