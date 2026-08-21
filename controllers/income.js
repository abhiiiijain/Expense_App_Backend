const IncomeSchema = require("../models/Income");
const { createTransactionController } = require("./createTransactionController");
const { INCOME_CATEGORIES, INCOME_SUBCATEGORIES } = require("../utils/validation");

const controller = createTransactionController(
  IncomeSchema,
  INCOME_CATEGORIES,
  INCOME_SUBCATEGORIES
);

exports.addIncome = controller.add;
exports.deleteIncome = controller.delete;
