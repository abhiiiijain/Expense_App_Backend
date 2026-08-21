/**
 * Seed August 2026 income + expenses for abhinandanbansal123@gmail.com
 * Usage: node scripts/seedAugust.js
 */
const mongoose = require("mongoose");
const { mongoUrl } = require("../config/env");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

const EMAIL = "abhinandanbansal123@gmail.com";
const YEAR = 2026;

function at(month, day, hour = 12) {
  return new Date(Date.UTC(YEAR, month - 1, day, hour, 0, 0));
}

const incomes = [
  {
    email: EMAIL,
    title: "July salary (credited in Aug)",
    amount: 25000,
    type: "income",
    category: "Salary",
    subcategory: "Monthly Salary",
    icon: "💼",
    createdAt: at(8, 5, 9),
    updatedAt: at(8, 5, 9),
  },
];

const expenses = [
  {
    email: EMAIL,
    title: "Lien amount on hold by bank",
    amount: 1844,
    type: "expense",
    category: "Finance",
    subcategory: "Bank Charges",
    icon: "🏧",
    createdAt: at(8, 5, 10),
    updatedAt: at(8, 5, 10),
  },
  {
    email: EMAIL,
    title: "Hair color",
    amount: 270,
    type: "expense",
    category: "Personal",
    subcategory: "Salon & Grooming",
    icon: "💇",
    createdAt: at(8, 5, 15),
    updatedAt: at(8, 5, 15),
  },
  {
    email: EMAIL,
    title: "UPI Lite load",
    amount: 2000,
    type: "expense",
    category: "Other",
    subcategory: "Petty Cash",
    icon: "🪙",
    createdAt: at(8, 6, 9),
    updatedAt: at(8, 6, 9),
  },
  {
    email: EMAIL,
    title: "Milk",
    amount: 3720,
    type: "expense",
    category: "Food & Groceries",
    subcategory: "Milk & Dairy",
    icon: "🥛",
    createdAt: at(8, 6, 11),
    updatedAt: at(8, 6, 11),
  },
  {
    email: EMAIL,
    title: "Cursor subscription",
    amount: 2428.83,
    type: "expense",
    category: "Education & Work",
    subcategory: "Software & Tools",
    icon: "🧠",
    createdAt: at(8, 8, 18),
    updatedAt: at(8, 8, 18),
  },
  {
    email: EMAIL,
    title: "Mulchad grocery",
    amount: 255,
    type: "expense",
    category: "Food & Groceries",
    subcategory: "Groceries",
    icon: "🛒",
    createdAt: at(8, 12, 12),
    updatedAt: at(8, 12, 12),
  },
  {
    email: EMAIL,
    title: "Credit card repayment",
    amount: 486,
    type: "expense",
    category: "Finance",
    subcategory: "Credit Card Payment",
    icon: "💳",
    createdAt: at(8, 14, 10),
    updatedAt: at(8, 14, 10),
  },
  {
    email: EMAIL,
    title: "UPI Lite load",
    amount: 2000,
    type: "expense",
    category: "Other",
    subcategory: "Petty Cash",
    icon: "🪙",
    createdAt: at(8, 14, 14),
    updatedAt: at(8, 14, 14),
  },
];

async function seed() {
  await mongoose.connect(mongoUrl);
  console.log("Connected to MongoDB");

  const incomeResult = await Income.insertMany(incomes);
  const expenseResult = await Expense.insertMany(expenses);

  const incomeTotal = incomes.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

  console.log(`Seeded ${incomeResult.length} incomes (₹${incomeTotal.toFixed(2)})`);
  console.log(`Seeded ${expenseResult.length} expenses (₹${expenseTotal.toFixed(2)})`);
  console.log(`Net for August: ₹${(incomeTotal - expenseTotal).toFixed(2)}`);
  console.log(`User: ${EMAIL}`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
