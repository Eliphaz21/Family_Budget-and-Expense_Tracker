import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "familyfund_secure_jwt_secret_token_key_2026";
const USER_DB_PATH = path.join(process.cwd(), "user_db.json");

interface DBUser {
  uid: string;
  email: string;
  displayName: string;
  role: "sister" | "user" | "admin";
  passwordHash: string;
  createdAt: string;
}

function readUserDb(): DBUser[] {
  if (!fs.existsSync(USER_DB_PATH)) {
    const defaultUsers: DBUser[] = [
      {
        uid: "sister_sys",
        email: "sister@family.com",
        displayName: "Alem (Sister & Administrator)",
        role: "sister",
        passwordHash: bcrypt.hashSync("password123", 10),
        createdAt: new Date().toISOString()
      },
      {
        uid: "father_sys",
        email: "father@family.com",
        displayName: "Abebe (Father & Provider)",
        role: "user",
        passwordHash: bcrypt.hashSync("password123", 10),
        createdAt: new Date().toISOString()
      },
      {
        uid: "son_sys",
        email: "brother@family.com",
        displayName: "Yeabsra (Brother / Software)",
        role: "user",
        passwordHash: bcrypt.hashSync("password123", 10),
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USER_DB_PATH, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  try {
    return JSON.parse(fs.readFileSync(USER_DB_PATH, "utf-8"));
  } catch (err) {
    return [];
  }
}

function writeUserDb(users: DBUser[]) {
  fs.writeFileSync(USER_DB_PATH, JSON.stringify(users, null, 2));
}

readUserDb();

// Initialize server-side Gemini SDK if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini AI successfully initialized server-side.");
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI:", err);
  }
} else {
  console.warn("GEMINI_API_KEY environment variable is not defined. AI analysis will run in rule-based mock backup mode.");
}

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!geminiApiKey,
    time: new Date().toISOString()
  });
});

// Auth: Register
app.post("/api/auth/register", (req, res) => {
  const { displayName, email, password, role } = req.body;
  if (!displayName || !email || !password || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required." });
  }

  const users = readUserDb();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  const normalizedRole = role === "sister" ? "sister" : "user";

  const newUser: DBUser = {
    uid: "user_" + Date.now(),
    email: email.toLowerCase().trim(),
    displayName: displayName.trim(),
    role: normalizedRole,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUserDb(users);

  const token = jwt.sign(
    { uid: newUser.uid, email: newUser.email, role: newUser.role, displayName: newUser.displayName },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    token,
    user: {
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  });
});

// Auth: Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = readUserDb();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign(
    { uid: user.uid, email: user.email, role: user.role, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

// Auth: Get Current Profile (Protected)
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token missing or invalid format." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string; email: string; role: any; displayName: string };
    const users = readUserDb();
    const user = users.find((u) => u.uid === decoded.uid);

    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    return res.status(401).json({ error: "Token signature validation failed." });
  }
});

// AI analysis route which processes family money leaks and generates recommendations
app.post("/api/ai/analyze", async (req, res) => {
  const { expenses, allowance, currentMonth } = req.body;

  if (!expenses || !Array.isArray(expenses)) {
    return res.status(400).json({ error: "Expenses list is required" });
  }

  const allowanceVal = allowance || 15000;
  const targetMonth = currentMonth || "this month";

  // Calculate high-level breakdown for prompt grounding
  const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = allowanceVal - totalSpent;

  const categoryMap: { [key: string]: number } = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + (Number(e.amount) || 0);
  });

  const categoriesText = Object.entries(categoryMap)
    .map(([cat, amount]) => `- ${cat}: ${amount} Birr`)
    .join("\n");

  const expensesText = expenses
    .map(e => `- ${e.date}: ${e.amount} Birr for "${e.description}" (${e.category})`)
    .join("\n");

  const prompt = `
Analyzing household money management for ${targetMonth}.
Allocated Monthly Allowance Budget Provided by Father: ${allowanceVal} Birr.
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

  // Try to use Gemini
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are the Expert Ethiopian Household Budget Analyst. Your audience is Alem (sister), Abebe (father), and the brother. Always speak in supportive, clear, and action-oriented tones. You must return your response strictly as a structured JSON object with four exact string properties: "summary", "leaks", "alert", and "suggestions". "suggestions" should be formatted as direct, elegant bullet points. do not output markdown surrounding JSON, only output raw JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "Clean general overview of Alem's managing performance, spent ratio, and current cash availability."
              },
              leaks: {
                type: Type.STRING,
                description: "Constructive pointing of which exact categories or transactions represent the highest strain or unexpected spikes (leaks)."
              },
              alert: {
                type: Type.STRING,
                description: "A short, actionable text alert or reminder regarding budget depletion pacing."
              },
              suggestions: {
                type: Type.STRING,
                description: "3 structured suggestions on how to survive cleanly until the final allowance refill date, with local tips."
              }
            },
            required: ["summary", "leaks", "alert", "suggestions"]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          return res.json(parsed);
        } catch (parseErr) {
          console.error("Failed to parse Gemini JSON, raw text is:", responseText);
          // Fallback parsing or standard string sending
        }
      }
    } catch (geminiErr) {
      console.error("Gemini model execution failed:", geminiErr);
    }
  }

  // Backup Local Rule-Based Analyzer if Gemini is offline or key is missing
  console.log("Serving rule-based backup budget analysis.");
  const spentPercent = allowanceVal > 0 ? (totalSpent / allowanceVal) * 100 : 0;
  
  let backupAlert = "Pacing looks regular. Alem is managing well so far.";
  if (spentPercent > 85) {
    backupAlert = "Alert: High Spending Speed! Over 85% of monthly Birr has been utilized already. Extreme caution recommended.";
  } else if (spentPercent > 60) {
    backupAlert = "Warning: Budget is half spent. Reduce non-essential buys for the rest of current month.";
  }

  const highestCategoryEntry = Object.entries(categoryMap).reduce((a, b) => (b[1] > a[1] ? b : a), ["None", 0]);

  const backupReport = {
    summary: `Alem has managed ${Number(totalSpent).toLocaleString()} Birr out of the ${Number(allowanceVal).toLocaleString()} Birr monthly pool, which is ${spentPercent.toFixed(1)}% spent. Standard house operations are ongoing, leaving ${Number(remaining).toLocaleString()} Birr active to complete the target cycle.`,
    leaks: `Analysis identifies "${highestCategoryEntry[0]}" as the primary cost weight, capturing ${Number(highestCategoryEntry[1]).toLocaleString()} Birr. Sister should check if items in this group can be bulk-bought in local Ethiopian markets to save bulk commissions.`,
    alert: backupAlert,
    suggestions: `- Shop bulk groceries like onions and pepper in Merkato rather than local corner shops to decrease daily markup leaks.\n- Enforce the "contribution comment board" where Yeabsra and Father Abebe can pre-approve and log top-offs immediately to keep balance visible.\n- Consolidate minor transport needs together to save transport/taxi Birr.`
  };

  return res.json(backupReport);
});

// Chatbot grounding endpoint that gets the current database list to reply with stats, alerts and helpful tips
app.post("/api/ai/chat", async (req, res) => {
  const { message, history, database } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const db = database || { expenses: [], fundings: [], comments: [], notifications: [], currentAllowance: 15000 };
  const expensesList = db.expenses || [];
  const fundingsList = db.fundings || [];
  const commentsList = db.comments || [];
  
  const totalSpent = expensesList.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const currentAllowance = Number(db.currentAllowance) || 15000;
  const remaining = currentAllowance - totalSpent;

  const systemInstruction = `You are "EthioBudget Bot", a premium, friendly, highly intelligent financial chatbot for an Ethiopian family.
Your visual avatar has an Ethiopian green-yellow-red beanie hat with the blue star emblem and a matching scarf.
You have access to the real-time active family ledger database:
- Alem (Sister & Administrator): Manages daily expenses and buys home supplies.
- Abebe (Father & Provider): Refuels the budget.
- Yeabsra (Brother / Software Developer): Checks statistics and supports technical tools.

YOUR CAPABILITIES:
1. Provide accurate, real-time statistics (e.g. sums of expenses, top categories, remaining balance, list counts).
2. Point out specific cost leaks (e.g., if groceries or utility costs are high).
3. Offer practical cultural tips for surviving the month in Addis Ababa (bulk-shopping at Merkato, ride-shares/taxi management, electricity limits).
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
- Be supportive, concise, and action-oriented. Refer to family members (Alem, Abebe, Yeabsra) by name where appropriate.
- Use Ethiopian context naturally (e.g. Merkato, Birr, Teff, Injera, taxi lines).
- Format your response with beautiful, clean markdown (bolding, lists, code accents). Never output raw json or generic boilerplate.`;

  if (ai) {
    try {
      // Map history to standard Content format
      const formattedContents = (history || []).map((msg: any) => ({
        role: msg.role === "model" || msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content || msg.text }]
      }));

      // Append current message with brief reminder of grounding stats
      formattedContents.push({
        role: "user",
        parts: [{ text: `${message}\n\n[Grounded Update: Spent=${totalSpent} Br, Remaining=${remaining} Br]` }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.85,
        }
      });

      if (response && response.text) {
        return res.json({ response: response.text });
      }
    } catch (geminiErr) {
      console.error("Chatbot Gemini API error:", geminiErr);
    }
  }

  // High-fidelity fallback simulator if Gemini is offline or API key is not configured yet
  console.log("Serving chatbot fallback rule-based reply.");
  const query = message.toLowerCase();
  let reply = "";

  if (query.includes("status") || query.includes("how are we") || query.includes("pacing") || query.includes("report")) {
    const spentPct = currentAllowance > 0 ? (totalSpent / currentAllowance) * 100 : 0;
    reply = `Hello! Here is the latest pacing report for the family:
- We have spent **${totalSpent.toLocaleString()} Birr** (${spentPct.toFixed(1)}% of our **${currentAllowance.toLocaleString()} Birr** budget).
- The remaining cash is **${remaining.toLocaleString()} Birr**.
- **Alem** is keeping standard logs perfectly. To stretch this remaining amount, we should consolidate any upcoming transportation items together!`;
  } else if (query.includes("suggest") || query.includes("tip") || query.includes("save") || query.includes("tips") || query.includes("leak") || query.includes("remaind")) {
    reply = `Absolutely! Here are 3 tailored recommendations for the family:
1. **Merkato Bulk Group buys**: Consolidate grocery purchases (Teff, onions, oil) and shop bulk in Merkato once instead of weekly local store runs. Saves roughly 15-20% on retail margins.
2. **Double check active receipts**: Remind **Alem** to log any extra taxi or utility bills as soon as possible to avoid balance mismatch.
3. **Emergency buffer check**: Brother **Yeabsra** recently logged a **3,000 Birr** emergency top-off. Make sure to keep that as a separate buffer!`;
  } else if (query.includes("stats") || query.includes("statistic") || query.includes("number") || query.includes("total") || query.includes("spent") || query.includes("much")) {
    reply = `Here is our live family ledger sheet:
- 💳 **Starting Allowance**: ${currentAllowance.toLocaleString()} Birr (Br)
- 🛒 **Total Active Spending**: ${totalSpent.toLocaleString()} Birr (Br)
- 💰 **Available Wallet Balance**: ${remaining.toLocaleString()} Birr (Br)
- 📝 **Ledger Entries**: ${expensesList.length} expenses and ${fundingsList.length} deposits.`;
  } else if (query.includes("hi") || query.includes("hello") || query.includes("hey") || query.includes("selam")) {
    reply = `Selam! I am **EthioBudget Bot**, your helpful household financial assistant! 
I have scanned our **${expensesList.length} expenses** and have full view of our **${remaining.toLocaleString()} Birr** remaining balance. 
I can help Alem, Father Abebe, and Yeabsra track statistics, analyze leaks, give suggestions, and leave reminders. 

What would you like me to look into today?`;
  } else {
    reply = `I have analyzed our live ledger containing **${expensesList.length} expense logs** and **${fundingsList.length} deposits**. 
Currently, we have **${remaining.toLocaleString()} Birr** of active budget available. 

If you are planning a reload or need suggestions on Merkato shopping lists, just write "tips" or "status"!`;
  }

  return res.json({ response: reply });
});

// Configure Vite dynamic middleware in dev vs static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.join(process.cwd(), 'frontend'),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite Dev Server Middleware successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production bundle from dist folder.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application successfully booted on host 0.0.0.0 port ${PORT}`);
  });
}

startServer();
