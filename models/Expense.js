const mongoose = require("mongoose");
const { createTransactionSchema } = require("./createTransactionSchema");

module.exports = mongoose.model("Expense", createTransactionSchema("expense"));
