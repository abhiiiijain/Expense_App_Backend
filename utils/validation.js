const taxonomy = require("../../shared/taxonomy.json");

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

function validateTransactionBody(body, userEmail, allowedCategories, subcategoryMap) {
  const { title, amount, category, subcategory, icon } = body;

  if (!userEmail || !title || !category || !subcategory || !icon) {
    return { error: "All fields are required!" };
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

  return {
    data: {
      email: userEmail,
      title: trimmedTitle,
      amount: parsedAmount,
      category,
      subcategory: trimmedSubcategory,
      icon,
    },
  };
}

function getPagination(query) {
  const skip = Math.max(parseInt(query.skip, 10) || 0, 0);

  if (query.limit === undefined || query.limit === "") {
    return { limit: null, skip };
  }

  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
  return { limit, skip };
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
  getPagination,
  parseOpeningBalance,
};
