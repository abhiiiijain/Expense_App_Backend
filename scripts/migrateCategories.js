/**
 * Migrate existing transactions to the new everyday categories.
 * Usage: node scripts/migrateCategories.js
 */
const mongoose = require("mongoose");
const { mongoUrl } = require("../config/env");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

const EXPENSE_MAP = {
  "Essential Expenses|Housing": ["Housing", "Rent", "🏠"],
  "Essential Expenses|Transportation": ["Transport", "Cab & Auto", "🚕"],
  "Essential Expenses|Food": ["Food & Groceries", "Groceries", "🛒"],
  "Essential Expenses|Utilities and Services": ["Bills & Utilities", "Electricity", "💡"],
  "Essential Expenses|Healthcare": ["Health", "Medicines", "💊"],
  "Essential Expenses|Insurance": ["Finance", "Insurance (Life/Other)", "📄"],
  "Essential Expenses|Debt Repayments": ["Finance", "Credit Card Payment", "💳"],
  "Non-Essential Expenses|Entertainment and Leisure": ["Entertainment", "Outing", "🎉"],
  "Non-Essential Expenses|Personal Care": ["Personal", "Personal Care", "🧴"],
  "Non-Essential Expenses|Clothing and Accessories": ["Shopping", "Clothes", "👕"],
  "Savings and Investments|Savings": ["Savings & Investments", "Savings Transfer", "💰"],
  "Savings and Investments|Investments": ["Savings & Investments", "Mutual Funds", "📈"],
  "Miscellaneous|Education and Self-Improvement": ["Education & Work", "Software & Tools", "🧠"],
  "Miscellaneous|Gifts and Donations": ["Family & Social", "Gifts", "🎁"],
  "Miscellaneous|Miscellaneous": ["Other", "Miscellaneous", "🗂️"],
};

const TITLE_OVERRIDES = [
  {
    match: /cursor subscription/i,
    category: "Education & Work",
    subcategory: "Software & Tools",
    icon: "🧠",
  },
  {
    match: /hair color/i,
    category: "Personal",
    subcategory: "Salon & Grooming",
    icon: "💇",
  },
  {
    match: /^milk$/i,
    category: "Food & Groceries",
    subcategory: "Milk & Dairy",
    icon: "🥛",
  },
  {
    match: /grocery/i,
    category: "Food & Groceries",
    subcategory: "Groceries",
    icon: "🛒",
  },
  {
    match: /credit card/i,
    category: "Finance",
    subcategory: "Credit Card Payment",
    icon: "💳",
  },
  {
    match: /upi lite/i,
    category: "Other",
    subcategory: "Petty Cash",
    icon: "🪙",
  },
  {
    match: /lien/i,
    category: "Finance",
    subcategory: "Bank Charges",
    icon: "🏧",
  },
];

const INCOME_MAP = {
  "Primary Income|Salary": ["Salary", "Monthly Salary", "💼"],
  "Primary Income|Bonus": ["Salary", "Bonus", "💲"],
  "Secondary Income|Freelance": ["Business & Freelance", "Freelance", "🧑‍💻"],
  "Secondary Income|Side Hustle": ["Business & Freelance", "Business Income", "🏪"],
  "Investments|Dividends": ["Investments", "Dividends", "🧾"],
  "Investments|Interest": ["Investments", "Interest", "💹"],
  "Gifts & Refunds|Gift": ["Gifts & Transfers", "Gift Received", "🎀"],
  "Gifts & Refunds|Tax Refund": ["Refunds & Cashback", "Refund", "🔁"],
  "Other Income|Other": ["Other Income", "Other", "🔖"],
};

async function migrateExpenses() {
  const expenses = await Expense.find({});
  let updated = 0;

  for (const expense of expenses) {
    const override = TITLE_OVERRIDES.find((rule) => rule.match.test(expense.title));
    const key = `${expense.category}|${expense.subcategory}`;
    const mapped = EXPENSE_MAP[key];

    let next = null;
    if (override) {
      next = {
        category: override.category,
        subcategory: override.subcategory,
        icon: override.icon,
      };
    } else if (mapped) {
      next = {
        category: mapped[0],
        subcategory: mapped[1],
        icon: mapped[2],
      };
    }

    if (!next) continue;
    if (
      expense.category === next.category &&
      expense.subcategory === next.subcategory &&
      expense.icon === next.icon
    ) {
      continue;
    }

    expense.category = next.category;
    expense.subcategory = next.subcategory;
    expense.icon = next.icon;
    await expense.save();
    updated += 1;
  }

  return updated;
}

async function migrateIncomes() {
  const incomes = await Income.find({});
  let updated = 0;

  for (const income of incomes) {
    const key = `${income.category}|${income.subcategory}`;
    const mapped = INCOME_MAP[key];
    if (!mapped) continue;

    const [category, subcategory, icon] = mapped;
    if (
      income.category === category &&
      income.subcategory === subcategory &&
      income.icon === icon
    ) {
      continue;
    }

    income.category = category;
    income.subcategory = subcategory;
    income.icon = icon;
    await income.save();
    updated += 1;
  }

  return updated;
}

async function run() {
  await mongoose.connect(mongoUrl);
  const expensesUpdated = await migrateExpenses();
  const incomesUpdated = await migrateIncomes();
  console.log(`Updated expenses: ${expensesUpdated}`);
  console.log(`Updated incomes: ${incomesUpdated}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  try {
    await mongoose.disconnect();
  } catch (_e) {
    // ignore
  }
});
