const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    note: {
      type: String,
      trim: true,
      maxLength: 120,
      default: "",
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

TransferSchema.index({ userId: 1, date: -1 });
TransferSchema.index({ userId: 1, fromAccountId: 1, date: -1 });
TransferSchema.index({ userId: 1, toAccountId: 1, date: -1 });

module.exports = mongoose.model("Transfer", TransferSchema);
