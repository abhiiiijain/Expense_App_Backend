const mongoose = require("mongoose");

const IncomeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
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
      min: 0,
    },
    type: {
      type: String,
      default: "income",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: String,
      required: true,
      maxLength: 50,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

IncomeSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("Income", IncomeSchema);

