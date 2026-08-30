const mongoose = require("mongoose");

function createTransactionSchema() {
  const schema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true,
        index: true,
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
      /** Calendar date used for month views / grouping (independent of createdAt). */
      date: {
        type: Date,
        required: true,
        index: true,
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

  schema.index({ userId: 1, date: -1 });
  schema.index({ userId: 1, accountId: 1, date: -1 });
  schema.index({ userId: 1, createdAt: -1 });

  return schema;
}

module.exports = { createTransactionSchema };
