import { AllowanceModel } from '../models/index';
import { NotificationModel } from '../models/index';

export function buildNotification(text: string, recipientRole: 'sister' | 'user' | 'admin' | 'all') {
  return {
    id: `not_${crypto.randomUUID()}`,
    text,
    recipientRole,
    readBy: [],
    createdAt: new Date().toISOString(),
  };
}

export function buildExpenseAlert(expense: { amount: number; description: string; productName?: string; date: string; createdByName: string }) {
  return buildNotification(
    `⚠️ High Spending Alert! Spent ${expense.amount.toLocaleString()} Birr on "${expense.productName ? `${expense.productName} (${expense.description})` : expense.description}" on ${expense.date} (Logged: ${expense.createdByName}).`,
    'all'
  );
}

export function toExpenseStats(expenses: Array<{ amount: number; category: string; date: string }>, allowanceAmount: number) {
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
  const [highestCategory = 'None', highestCategoryAmount = 0] = (categoryEntries[0] || ['None', 0]) as [string, number];

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

export async function loadCurrentMonthBudget(month: string) {
  const allowance = await AllowanceModel.findOne({ month }).lean();
  return allowance?.amount || 15000;
}
