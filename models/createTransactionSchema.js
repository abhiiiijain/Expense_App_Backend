const mongoose = require("mongoose");

function createTransactionSchema(defaultType) {
  const schema = new mongoose.Schema(
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
        min: [0.01, "Amount must be greater than 0"],
      },
      type: {
        type: String,
        default: defaultType,
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

  schema.index({ email: 1, createdAt: -1 });
  return schema;
}

module.exports = { createTransactionSchema };
