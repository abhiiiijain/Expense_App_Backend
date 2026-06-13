const ExpenseSchema = require("../models/expenseModel");
const { createTransactionController } = require("../utils/transactionController");
const { EXPENSE_CATEGORIES } = require("../utils/validation");

const controller = createTransactionController(ExpenseSchema, EXPENSE_CATEGORIES);

exports.addExpense = controller.add;
exports.getExpenses = controller.getAll;
exports.deleteExpense = controller.delete;
