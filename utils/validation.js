const EXPENSE_CATEGORIES = [
  "Essential Expenses",
  "Non-Essential Expenses",
  "Savings and Investments",
  "Miscellaneous",
];

const INCOME_CATEGORIES = [
  "Primary Income",
  "Secondary Income",
  "Investments",
  "Gifts & Refunds",
  "Other Income",
];

function parseAmount(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return num;
}

function validateTransactionBody(body, userEmail, allowedCategories) {
  const { title, amount, category, subcategory, icon } = body;

  if (!userEmail || !title || !category || !subcategory || !icon) {
    return { error: "All fields are required!" };
  }

  if (!allowedCategories.includes(category)) {
    return { error: "Invalid category" };
  }

  const parsedAmount = parseAmount(amount);
  if (parsedAmount === null) {
    return { error: "Amount must be a positive number!" };
  }

  return {
    data: {
      email: userEmail,
      title: title.trim(),
      amount: parsedAmount,
      category,
      subcategory,
      icon,
    },
  };
}

function getPagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 500);
  const skip = Math.max(parseInt(query.skip, 10) || 0, 0);
  return { limit, skip };
}

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  validateTransactionBody,
  getPagination,
};
