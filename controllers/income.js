const IncomeSchema = require("../models/incomeModel");
const { createTransactionController } = require("../utils/transactionController");
const { INCOME_CATEGORIES } = require("../utils/validation");

const controller = createTransactionController(IncomeSchema, INCOME_CATEGORIES);

exports.addIncome = controller.add;
exports.getIncomes = controller.getAll;
exports.deleteIncome = controller.delete;
