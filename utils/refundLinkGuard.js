const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const { HttpError } = require("./HttpError");
const { CARD_PAYMENT_SUBCATEGORY } = require("./creditCardPayments");
const { RESALE_INVENTORY_SUBCATEGORY } = require("./consumption");
const { REFUND_SUBCATEGORY, refundRemaining, refundCapMessage } = require("./spendRefunds");

const REFUNDABLE_EXPENSE_FILTER = {
  subcategory: { $nin: [CARD_PAYMENT_SUBCATEGORY, RESALE_INVENTORY_SUBCATEGORY] },
};

async function findRefundableExpense(userId, expenseId) {
  if (!expenseId) return null;
  return Expense.findOne({
    _id: expenseId,
    userId,
    ...REFUNDABLE_EXPENSE_FILTER,
  })
    .select("_id amount")
    .lean();
}

async function assertRefundFits(userId, original, amount, excludeIncomeId) {
  const existingQuery = {
    userId,
    subcategory: REFUND_SUBCATEGORY,
    refundOfExpenseId: original._id,
  };
  if (excludeIncomeId && mongoose.Types.ObjectId.isValid(excludeIncomeId)) {
    existingQuery._id = { $ne: excludeIncomeId };
  }
  const existing = await Income.find(existingQuery).select("amount refundOfExpenseId").lean();
  const remaining = refundRemaining(original, existing);
  if ((Number(amount) || 0) > remaining + 0.005) {
    throw new HttpError(400, refundCapMessage(remaining));
  }
}

module.exports = {
  REFUNDABLE_EXPENSE_FILTER,
  findRefundableExpense,
  assertRefundFits,
};
