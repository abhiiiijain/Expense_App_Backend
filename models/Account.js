const mongoose = require("mongoose");

const ACCOUNT_TYPES = ["bank", "cash", "credit", "other"];

const AccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 40,
    },
    type: {
      type: String,
      enum: ACCOUNT_TYPES,
      default: "bank",
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Credit card statement generation day (1–28). */
    statementDay: {
      type: Number,
      min: 1,
      max: 28,
    },
    dueDay: {
      type: Number,
      min: 1,
      max: 28,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

AccountSchema.index({ userId: 1, name: 1 }, { unique: true });
AccountSchema.index({ userId: 1, updatedAt: -1 });

const Account = mongoose.model("Account", AccountSchema);
Account.ACCOUNT_TYPES = ACCOUNT_TYPES;
module.exports = Account;
