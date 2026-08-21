const EXPENSE_CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Housing",
  "Bills & Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Education & Work",
  "Personal",
  "Finance",
  "Family & Social",
  "Savings & Investments",
  "Other",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Business & Freelance",
  "Investments",
  "Refunds & Cashback",
  "Gifts & Transfers",
  "Other Income",
];

const EXPENSE_SUBCATEGORIES = {
  "Food & Groceries": ["Groceries", "Restaurants", "Cafe & Snacks", "Food Delivery", "Milk & Dairy"],
  Transport: ["Fuel", "Cab & Auto", "Public Transit", "Parking", "Vehicle Maintenance"],
  Housing: ["Rent", "Home Maintenance", "Household Items"],
  "Bills & Utilities": ["Electricity", "Internet", "Mobile Recharge", "Water & Gas", "DTH & Cable"],
  Shopping: ["Clothes", "Electronics", "Online Shopping", "Home & Decor"],
  Health: ["Medicines", "Doctor & Clinic", "Fitness", "Insurance (Health)"],
  Entertainment: ["Movies & Events", "Subscriptions", "Games", "Outing"],
  "Education & Work": ["Courses", "Books", "Software & Tools", "Office / Co-working"],
  Personal: ["Salon & Grooming", "Personal Care", "Laundry"],
  Finance: ["Credit Card Payment", "EMI / Loan", "Bank Charges", "Insurance (Life/Other)"],
  "Family & Social": ["Gifts", "Donations", "Family Support"],
  "Savings & Investments": ["Savings Transfer", "Mutual Funds", "Stocks", "Fixed Deposit"],
  Other: ["Miscellaneous", "Petty Cash", "Uncategorized"],
};

const INCOME_SUBCATEGORIES = {
  Salary: ["Monthly Salary", "Bonus", "Overtime"],
  "Business & Freelance": ["Freelance", "Client Payment", "Business Income"],
  Investments: ["Dividends", "Interest", "Capital Gains"],
  "Refunds & Cashback": ["Refund", "Cashback", "Reimbursement"],
  "Gifts & Transfers": ["Gift Received", "Family Transfer"],
  "Other Income": ["Rental Income", "Other"],
};

function parseAmount(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return num;
}

function validateTransactionBody(body, userEmail, allowedCategories, subcategoryMap) {
  const { title, amount, category, subcategory, icon } = body;

  if (!userEmail || !title || !category || !subcategory || !icon) {
    return { error: "All fields are required!" };
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
      title: title.trim(),
      amount: parsedAmount,
      category,
      subcategory,
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

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: "Opening balance must be a valid amount" };
  }

  return { amount: parsed };
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
