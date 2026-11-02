const mongoose = require("mongoose");
const { createTransactionSchema } = require("./createTransactionSchema");

const schema = createTransactionSchema();
schema.add({
  refundOfExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Expense",
  },
  resaleOfExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Expense",
  },
});
schema.index({ userId: 1, refundOfExpenseId: 1 });
schema.index({ userId: 1, resaleOfExpenseId: 1 });

module.exports = mongoose.model("Income", schema);
