const taxonomy = require("../data/taxonomy.json");
const mongoose = require("mongoose");

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
  const { title, amount, category, subcategory, icon, date, accountId } = body;

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
    },
  };
}

const DEFAULT_TRANSACTION_LIMIT = 500;
const MAX_TRANSACTION_LIMIT = 1000;

function getPagination(query) {
  const skip = Math.max(parseInt(query.skip, 10) || 0, 0);

  if (query.limit === undefined || query.limit === "") {
    return { limit: DEFAULT_TRANSACTION_LIMIT, skip };
  }

  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_TRANSACTION_LIMIT, 1),
    MAX_TRANSACTION_LIMIT
  );
  return { limit, skip };
}

/** Parse YYYY-MM into inclusive UTC month range. */
function getMonthRange(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return null;
  }
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}

/** Rolling local-time window: last N calendar days including today. */
function getRecentDaysRange(daysParam) {
  const days = parseInt(daysParam, 10);
  if (!Number.isFinite(days) || days < 1 || days > 366) {
    return null;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return { start };
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
  getPagination,
  getMonthRange,
  getRecentDaysRange,
  parseOpeningBalance,
  roundMoney,
};
