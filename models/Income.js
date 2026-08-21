const mongoose = require("mongoose");
const { createTransactionSchema } = require("./createTransactionSchema");

module.exports = mongoose.model("Income", createTransactionSchema("income"));
