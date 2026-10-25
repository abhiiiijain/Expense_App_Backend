const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
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
    },
  },
  { timestamps: true }
);

TransferSchema.index({ userId: 1, date: -1, _id: -1 });
TransferSchema.index({ userId: 1, fromAccountId: 1 });
TransferSchema.index({ userId: 1, toAccountId: 1 });
TransferSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Transfer", TransferSchema);
