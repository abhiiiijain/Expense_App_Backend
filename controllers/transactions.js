const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Transfer = require("../models/Transfer");
const { getPagination, getMonthRange, getRecentDaysRange } = require("../utils/validation");
const asyncHandler = require("../middleware/asyncHandler");

function applyDateFilter(filter, query) {
  const monthRange = getMonthRange(query.month);
  if (monthRange) {
    filter.date = { $gte: monthRange.start, $lt: monthRange.end };
    return;
  }

  const recentRange = getRecentDaysRange(query.days);
  if (recentRange) {
    filter.date = { $gte: recentRange.start };
  }
}

exports.getTransactions = asyncHandler(async (req, res) => {
  const { limit, skip } = getPagination(req.query);
  const filter = { userId: req.userId };

  if (req.query.accountId) {
    filter.accountId = req.query.accountId;
  }

  applyDateFilter(filter, req.query);

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { subcategory: { $regex: q, $options: "i" } },
    ];
  }

  const transferFilter = { userId: req.userId };
  if (req.query.accountId) {
    transferFilter.$or = [
      { fromAccountId: req.query.accountId },
      { toAccountId: req.query.accountId },
    ];
  }
  applyDateFilter(transferFilter, req.query);
  if (q) {
    transferFilter.note = { $regex: q, $options: "i" };
  }

  const expenseQuery = Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit);
  const incomeQuery = Income.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit);
  const transferQuery = Transfer.find(transferFilter)
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const [expenses, incomes, transfers, expenseTotal, incomeTotal, transferTotal] =
    await Promise.all([
      expenseQuery,
      incomeQuery,
      transferQuery,
      Expense.countDocuments(filter),
      Income.countDocuments(filter),
      Transfer.countDocuments(transferFilter),
    ]);

  return res.status(200).json({
    expenses,
    incomes,
    transfers,
    meta: {
      expenseTotal,
      incomeTotal,
      transferTotal,
      skip,
      limit,
      month: req.query.month || null,
      days: req.query.days || null,
      q: q || null,
    },
  });
});
