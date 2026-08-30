const mongoose = require("mongoose");

const BudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** YYYY-MM */
    monthKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Budget must be 0 or more"],
    },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, monthKey: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("Budget", BudgetSchema);
