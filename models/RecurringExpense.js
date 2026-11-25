const mongoose = require("mongoose");

const RecurringExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than 0"],
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50,
    },
    icon: {
      type: String,
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    /** Day of month 1–28 when this should be suggested. */
    dueDay: {
      type: Number,
      required: true,
      min: 1,
      max: 28,
    },
    /** YYYY-MM of the last month we added or skipped. */
    lastFulfilledMonthKey: {
      type: String,
      default: null,
      match: /^\d{4}-\d{2}$/,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

RecurringExpenseSchema.index({ userId: 1, active: 1 });
RecurringExpenseSchema.index({ userId: 1, subcategory: 1, accountId: 1, title: 1 });

module.exports = mongoose.model("RecurringExpense", RecurringExpenseSchema);
