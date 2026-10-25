const taxonomy = require("../../shared/taxonomy.json");
const mongoose = require("mongoose");
const { CARD_PAYMENT_SUBCATEGORY } = require("./creditCardPayments");

const EXPENSE_CATEGORIES = taxonomy.expenseCategories;
const INCOME_CATEGORIES = taxonomy.incomeCategories;
const EXPENSE_SUBCATEGORIES = taxonomy.expenseSubcategories;
const INCOME_SUBCATEGORIES = taxonomy.incomeSubcategories;

const TITLE_MAX_LENGTH = 50;
const SUBCATEGORY_MAX_LENGTH = 50;

function roundMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function parseAmount(amount) {
  const rounded = roundMoney(amount);
  if (rounded === null || rounded <= 0) {
    return null;
  }
  return rounded;
}

function parseTransactionDate(value) {
  if (value === undefined || value === null || value === "") {
    return { date: new Date() };
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return { error: "Invalid transaction date" };
  }
  return { date };
}

function validateTransactionBody(body, userId, allowedCategories, subcategoryMap) {
  const { title, amount, category, subcategory, icon, date, accountId, settlesAccountId } = body;

  if (!userId || !title || !category || !subcategory || !icon || !accountId) {
    return { error: "All fields are required!" };
  }

  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    return { error: "Invalid account" };
  }

  const trimmedTitle = title.trim();
  const trimmedSubcategory = subcategory.trim();

  if (!trimmedTitle) {
    return { error: "All fields are required!" };
  }

  if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    return { error: `Title must be at most ${TITLE_MAX_LENGTH} characters` };
  }

  if (trimmedSubcategory.length > SUBCATEGORY_MAX_LENGTH) {
    return { error: `Subcategory must be at most ${SUBCATEGORY_MAX_LENGTH} characters` };
  }

  if (!allowedCategories.includes(category)) {
    return { error: "Invalid category" };
  }

  const allowedSubs = subcategoryMap?.[category];
  if (allowedSubs && !allowedSubs.includes(subcategory)) {
    return { error: "Invalid subcategory" };
  }

  const parsedAmount = parseAmount(amount);
  if (parsedAmount === null) {
    return { error: "Amount must be a positive number!" };
  }

  const dateResult = parseTransactionDate(date);
  if (dateResult.error) {
    return { error: dateResult.error };
  }

  let settles = undefined;
  if (
    trimmedSubcategory === CARD_PAYMENT_SUBCATEGORY &&
    settlesAccountId &&
    mongoose.Types.ObjectId.isValid(settlesAccountId)
  ) {
    settles = settlesAccountId;
  }

  return {
    data: {
      userId,
      accountId,
      title: trimmedTitle,
      amount: parsedAmount,
      date: dateResult.date,
      category,
      subcategory: trimmedSubcategory,
      icon,
      ...(settles ? { settlesAccountId: settles } : {}),
    },
  };
}

function parseMonthDay(value, label) {
  if (value === undefined || value === null || value === "") {
    return { day: null };
  }
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return { error: `${label} must be a day from 1 to 28` };
  }
  return { day };
}

function parseCreditCycle(body, { required = false } = {}) {
  const statement = parseMonthDay(body.statementDay, "Statement day");
  if (statement.error) return statement;
  const due = parseMonthDay(body.dueDay, "Due day");
  if (due.error) return due;
  if (required && (statement.day === null || due.day === null)) {
    return { error: "Statement day and due day are required for credit cards" };
  }
  return { statementDay: statement.day, dueDay: due.day };
}

function parseOpeningBalance(value) {
  if (value === undefined || value === null || value === "") {
    return { amount: null };
  }

  const rounded = roundMoney(value);
  if (rounded === null || rounded < 0) {
    return { error: "Opening balance must be a valid amount" };
  }

  return { amount: rounded };
}

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_SUBCATEGORIES,
  INCOME_SUBCATEGORIES,
  validateTransactionBody,
  parseTransactionDate,
  parseOpeningBalance,
  parseCreditCycle,
  roundMoney,
};
