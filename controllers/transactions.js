const Expense = require("../models/Expense");
const Income = require("../models/Income");
const { getPagination } = require("../utils/validation");
const asyncHandler = require("../middleware/asyncHandler");

exports.getTransactions = asyncHandler(async (req, res) => {
  const { limit, skip } = getPagination(req.query);
  const filter = { email: req.user.email };

  const expenseQuery = Expense.find(filter).sort({ createdAt: -1 }).skip(skip);
  const incomeQuery = Income.find(filter).sort({ createdAt: -1 }).skip(skip);

  if (limit != null) {
    expenseQuery.limit(limit);
    incomeQuery.limit(limit);
  }

  const [expenses, incomes] = await Promise.all([expenseQuery, incomeQuery]);

  return res.status(200).json({ expenses, incomes });
});
