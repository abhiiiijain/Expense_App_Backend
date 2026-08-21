const ExpenseSchema = require("../models/Expense");
const { createTransactionController } = require("./createTransactionController");
const { EXPENSE_CATEGORIES, EXPENSE_SUBCATEGORIES } = require("../utils/validation");

const controller = createTransactionController(
  ExpenseSchema,
  EXPENSE_CATEGORIES,
  EXPENSE_SUBCATEGORIES
);

exports.addExpense = controller.add;
exports.deleteExpense = controller.delete;
