const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Transfer = require("../models/Transfer");
const Account = require("../models/Account");
const { getPagination } = require("../utils/validation");
const asyncHandler = require("../middleware/asyncHandler");

async function collectionStamp(Model, userId) {
  const [row] = await Model.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, count: { $sum: 1 }, latest: { $max: "$updatedAt" } } },
  ]);
  return `${row?.count || 0}:${row?.latest ? new Date(row.latest).toISOString() : "0"}`;
}

exports.getTransactionsSync = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const [expenses, incomes, transfers, accounts] = await Promise.all([
    collectionStamp(Expense, userId),
    collectionStamp(Income, userId),
    collectionStamp(Transfer, userId),
    collectionStamp(Account, userId),
  ]);
  res.set("Cache-Control", "no-store");
  return res.status(200).json({
    stamp: `${expenses}|${incomes}|${transfers}|${accounts}`,
  });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const { limit, skip } = getPagination(req.query);
  const filter = { userId: req.userId };

  const [expenses, incomes, transfers, expenseTotal, incomeTotal, transferTotal] =
    await Promise.all([
      Expense.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit),
      Income.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit),
      Transfer.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(filter),
      Income.countDocuments(filter),
      Transfer.countDocuments(filter),
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
    },
  });
});
