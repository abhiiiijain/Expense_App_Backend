const Budget = require("../models/Budget");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { EXPENSE_CATEGORIES, roundMoney } = require("../utils/validation");
const { bumpDataVersion } = require("../utils/dataVersion");

exports.listBudgets = asyncHandler(async (req, res) => {
  const monthKey = req.query.month;
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new HttpError(400, "month query (YYYY-MM) is required");
  }

  const budgets = await Budget.find({ userId: req.userId, monthKey }).sort({ category: 1 });
  return res.status(200).json({ budgets });
});

exports.upsertBudget = asyncHandler(async (req, res) => {
  const monthKey = String(req.body.monthKey || "").trim();
  const category = String(req.body.category || "").trim();
  const amount = roundMoney(req.body.amount);

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new HttpError(400, "monthKey must be YYYY-MM");
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw new HttpError(400, "Invalid category");
  }
  if (amount === null || amount < 0) {
    throw new HttpError(400, "Budget amount must be 0 or more");
  }

  if (amount === 0) {
    await Budget.findOneAndDelete({ userId: req.userId, monthKey, category });
    await bumpDataVersion(req.userId);
    return res.status(200).json({ removed: true, category, monthKey });
  }

  const budget = await Budget.findOneAndUpdate(
    { userId: req.userId, monthKey, category },
    { $set: { amount } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await bumpDataVersion(req.userId);

  return res.status(200).json(budget);
});
