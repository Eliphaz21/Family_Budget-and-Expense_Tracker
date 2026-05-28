import { GoogleGenAI, Type } from '@google/genai';

type ExpenseLike = {
  amount: number;
  category: string;
  date: string;
  description: string;
};

type DatabaseLike = {
  expenses?: ExpenseLike[];
  fundings?: unknown[];
  comments?: unknown[];
  notifications?: unknown[];
  currentAllowance?: number;
};

function createClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'family-budget-tracker' },
      },
    });
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    return null;
  }
}

const aiClient = createClient();

export async function generateBudgetAnalysis(expenses: ExpenseLike[], allowance = 15000, currentMonth = 'this month') {
  const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = allowance - totalSpent;

  const categoryMap: Record<string, number> = {};
  expenses.forEach((entry) => {
    categoryMap[entry.category] = (categoryMap[entry.category] || 0) + (Number(entry.amount) || 0);
  });

  const categoriesText = Object.entries(categoryMap).map(([category, amount]) => `- ${category}: ${amount} Birr`).join('\n');
  const expensesText = expenses.map((entry) => `- ${entry.date}: ${entry.amount} Birr for "${entry.description}" (${entry.category})`).join('\n');

  const prompt = `
Analyzing household money management for ${currentMonth}.
Allocated Monthly Allowance Budget Provided by Father: ${allowance} Birr.
Total Logged Spending: ${totalSpent} Birr.
Remaining Balance: ${remaining} Birr.

Spending breakdowns by category:
${categoriesText}

Detailed Expense Log entries:
${expensesText}

You are the Family Financial AI Budget Advisor. The target household has:
- Sister Alem (the house administrator responsible for choosing and entering these daily costs)
- Father Abebe (who provides the fixed Birr budget)
- Brother (software student helping review efficiency)

Write a customized personal budget analysis report for this Ethiopian household.
Ensure the suggestions are practical, friendly, and helpful. Mention Alem specifically by name to make it personal.
Calculate spent percentages and give actionable tips on how to stretch the remaining ${remaining} Birr to avoid running out before the next salary date.
`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are the Expert Ethiopian Household Budget Analyst. Your audience is Alem (sister), Abebe (father), and the brother. Always speak in supportive, clear, and action-oriented tones. You must return your response strictly as a structured JSON object with four exact string properties: "summary", "leaks", "alert", and "suggestions". "suggestions" should be formatted as direct, elegant bullet points. do not output markdown surrounding JSON, only output raw JSON.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: { summary: { type: Type.STRING }, leaks: { type: Type.STRING }, alert: { type: Type.STRING }, suggestions: { type: Type.STRING } },
            required: ['summary', 'leaks', 'alert', 'suggestions'],
          },
        },
      });

      if (response.text) {
        try {
          return JSON.parse(response.text) as Record<string, string>;
        } catch (error) {
          console.error('Failed to parse Gemini analysis JSON:', response.text);
        }
      }
    } catch (error) {
      console.error('Gemini analysis failed:', error);
    }
  }

  const spentPercent = allowance > 0 ? (totalSpent / allowance) * 100 : 0;
  let alert = 'Pacing looks regular. Alem is managing well so far.';
  if (spentPercent > 85) {
    alert = 'Alert: High Spending Speed. Over 85% of the monthly Birr has been used. Tighten spending immediately.';
  } else if (spentPercent > 60) {
    alert = 'Warning: Budget is past the comfort zone. Reduce non-essential buys for the rest of the cycle.';
  }

  const highestCategoryEntry = Object.entries(categoryMap).reduce<[string, number]>(
    (largest, current) => (current[1] > largest[1] ? current : largest),
    ['None', 0]
  );

  return {
    summary: `Alem has managed ${Number(totalSpent).toLocaleString()} Birr out of the ${Number(allowance).toLocaleString()} Birr monthly pool, which is ${spentPercent.toFixed(1)}% spent. There are ${Number(remaining).toLocaleString()} Birr left to complete the target cycle.`,
    leaks: `The primary cost weight is "${highestCategoryEntry[0]}" at ${Number(highestCategoryEntry[1]).toLocaleString()} Birr. Review bulk-buying and repeat purchases in this category.`,
    alert,
    suggestions: `- Shop bulk groceries in one trip instead of many small purchases.
- Log every taxi, utility, and emergency spend immediately.
- Keep a small buffer and avoid unrelated impulse spending until refill day.`,
  };
}

export async function generateChatReply(message: string, history: Array<{ role: string; content?: string; text?: string }>, database: DatabaseLike) {
  const expensesList = database.expenses || [];
  const fundingsList = database.fundings || [];
  const commentsList = database.comments || [];

  const totalSpent = expensesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const currentAllowance = Number(database.currentAllowance) || 15000;
  const remaining = currentAllowance - totalSpent;

  const systemInstruction = `You are "EthioBudget Bot", a premium, friendly, highly intelligent financial chatbot for an Ethiopian family.
Your visual avatar has an Ethiopian green-yellow-red beanie hat with the blue star emblem and a matching scarf.
You have access to the real-time active family ledger database:
- Alem (Sister & Administrator): Manages daily expenses and buys home supplies.
- Abebe (Father & Provider): Refuels the budget.
- Yeabsra (Brother / Software Developer): Checks statistics and supports technical tools.

YOUR CAPABILITIES:
1. Provide accurate, real-time statistics.
2. Point out specific cost leaks.
3. Offer practical cultural tips for surviving the month in Addis Ababa.
4. Act as a coordinator on the comment board and family notifications.
5. Remind users of active tasks or suggest balance refills when the wallet runs low.

CURRENT DATABASE STATE:
- Total Allocated Budget (Allowance): ${currentAllowance.toLocaleString()} Birr (Br)
- Total Spent so far: ${totalSpent.toLocaleString()} Birr (Br)
- Remaining Cash: ${remaining.toLocaleString()} Birr (Br)
- Number of recorded purchases: ${expensesList.length}
- Number of recorded deposits/refills: ${fundingsList.length}
- Expense Log list: ${JSON.stringify(expensesList.slice(0, 40))}
- Deposit Log list: ${JSON.stringify(fundingsList.slice(0, 40))}
- Recent messages/comments: ${JSON.stringify(commentsList.slice(0, 15))}

STRICT INSTRUCTIONS:
- Be supportive, concise, and action-oriented. Refer to family members by name where appropriate.
- Use Ethiopian context naturally.
- Format your response with clean markdown. Never output raw json or generic boilerplate.`;

  if (aiClient) {
    try {
      const formattedContents = history.map((entry) => ({
        role: entry.role === 'model' || entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: entry.content || entry.text || '' }],
      }));

      formattedContents.push({ role: 'user', parts: [{ text: `${message}\n\n[Grounded Update: Spent=${totalSpent} Br, Remaining=${remaining} Br]` }] });

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedContents,
        config: { systemInstruction, temperature: 0.85 },
      });

      if (response.text) {
        return response.text;
      }
    } catch (error) {
      console.error('Chatbot Gemini API error:', error);
    }
  }

  const query = message.toLowerCase();
  if (query.includes('status') || query.includes('how are we') || query.includes('pacing') || query.includes('report')) {
    const spentPct = currentAllowance > 0 ? (totalSpent / currentAllowance) * 100 : 0;
    return `Hello! Here is the latest pacing report for the family:\n- We have spent **${totalSpent.toLocaleString()} Birr** (${spentPct.toFixed(1)}% of our **${currentAllowance.toLocaleString()} Birr** budget).\n- The remaining cash is **${remaining.toLocaleString()} Birr**.\n- **Alem** is keeping standard logs. Consolidate upcoming transport or grocery items together.`;
  }

  if (query.includes('suggest') || query.includes('tip') || query.includes('save') || query.includes('leak')) {
    return `Absolutely! Here are 3 tailored recommendations for the family:\n1. **Merkato bulk buying**: Consolidate groceries like teff, onions, and oil into fewer trips.\n2. **Log immediately**: Remind **Alem** to record taxi or utility bills as soon as they happen.\n3. **Hold a buffer**: Keep a separate emergency reserve for unexpected spending.`;
  }

  if (query.includes('stats') || query.includes('total') || query.includes('spent')) {
    return `Here is our live family ledger sheet:\n- **Starting Allowance**: ${currentAllowance.toLocaleString()} Birr\n- **Total Active Spending**: ${totalSpent.toLocaleString()} Birr\n- **Available Wallet Balance**: ${remaining.toLocaleString()} Birr\n- **Ledger Entries**: ${expensesList.length} expenses and ${fundingsList.length} deposits.`;
  }

  return `I have analyzed our live ledger containing **${expensesList.length} expense logs** and **${fundingsList.length} deposits**. Currently, we have **${remaining.toLocaleString()} Birr** of active budget available.`;
}
